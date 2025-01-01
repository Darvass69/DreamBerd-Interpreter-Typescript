/*
When parsing, instead of making only 1 tree, when we hit an apparent error or ambiguous syntax, we'll create branches of possible results. (branches are async?)
Then, after parsing, we go through each possibility and find which one is more likely/better using some rules.
I think that ultimately, its impossible to have errors in DreamBerd because we can just turn it to string.
*/

import { AstNodeKind, BlockStatement, BranchingStatement, createAstNode, Statement } from "./astNodes.ts";
import { Tokenizer } from "../lexer/lexer.ts";
import { getToken, getTokenTypes, getTokenValues, hasTokensLeft, Token, TokenType, TokenValue } from "../lexer/token.ts";
import ParsingFunctionMaps, { LedHandler, NudHandler, StmtHandler } from "./parsingFunctionMaps.ts";
import { BindingPower } from "./bindingPower.ts";
import { parseProgram } from "./parserFunctions.ts";
import { Checkpoint, Handler, HandlerParameters } from "./branches/checkpoint.ts";
import { ParserState, ResultChoice } from "./branches/parserState.ts";
import { Logger, ParserLogger } from "./branches/logger.ts";

export interface Options {
  debug?: boolean;
  useSignificantWhitespace?: boolean;
  useLifetime?: boolean;
  useTypes?: boolean;
}

export interface ParsingEnvironment {
  readonly tokens: Token[];
  readonly mappings: ParsingFunctionMaps;
}

// Find a better name
export async function createAst(sourceCode: string): Promise<[BlockStatement | BranchingStatement<BlockStatement>, string]> {
  const options: Options = {
    debug: true,
    useSignificantWhitespace: false,
  };
  const tokens = new Tokenizer(sourceCode).tokenize();
  const mappings = new ParsingFunctionMaps(options);

  const checkpoint = Checkpoint.newCheckpoint(options, { tokens, mappings }, 0, parseProgram, [], new ParserLogger([]));

  const allResults = (await checkpoint.getResults()).map(([, results]) => results);

  const resultList = allResults.flatMap((astNode) => {
    if (astNode.kind === AstNodeKind.BranchingStatement) {
      return astNode.branches;
    }
    return [astNode];
  });

  if (resultList.length === 1) {
    return [resultList[0], Logger.getLogs()];
  }
  return [createAstNode(AstNodeKind.BranchingStatement, { start: 0, branches: resultList }), Logger.getLogs()];
}

/* -------------------------------------------------------------------------- */

export class ExitBranchError extends Error {
  constructor(message?: string) {
    super(message);
  }
}

export default class Parser {
  //Checkpoint
  private checkpoint: Checkpoint<any, any>;

  // State
  private state: ParserState;

  private logger: ParserLogger;

  constructor(checkpoint: Checkpoint<any, any>, state: ParserState, logger: ParserLogger) {
    this.checkpoint = checkpoint;
    this.state = state;
    this.logger = logger;
  }

  public get environment() {
    return this.checkpoint.environment;
  }

  public get options() {
    return this.checkpoint.options;
  }

  public current(): Token {
    const token = getToken(this.getPosition(), this.checkpoint.environment.tokens);

    if (token !== undefined) {
      return token;
    }

    throw this.exit(`No token was found at position ${this.getPosition()}`);
  }

  public moveTo(end: number) {
    this.state.position = end;
  }

  public hasToken(): boolean {
    return hasTokensLeft(this.getPosition(), this.checkpoint.environment.tokens);
  }

  public getPosition(): number {
    return this.state.position;
  }

  /**
   * TODO better errors
   * @throws
   */
  public exit(reason?: string) {
    const message = "Exiting branch because of: " + (reason ?? "unknown");
    this.logger.exit(message);
    return new ExitBranchError(message);
  }

  public async executeHandler<T extends HandlerParameters, R extends Statement>(
    parsingFunction: Handler<T, R>,
    ...parameters: T
  ): Promise<R | BranchingStatement<R>> {
    const choice = this.state.getResultChoice();
    if (choice !== undefined) {
      this.logger.resultFound(true, choice);
      this.moveTo(choice[0]);
      return choice[1] as R;
    }

    const newCheckpoint = Checkpoint.newCheckpoint(this.checkpoint.options, this.checkpoint.environment, this.getPosition(), parsingFunction, parameters, this.logger);
    const results = await newCheckpoint.getResults();

    this.checkpoint.submitResultChoice(results, this.state);
    const currentChoice = this.state.getResultChoice() as ResultChoice;
    this.logger.resultFound(false, currentChoice);

    this.moveTo(currentChoice[0]);
    return currentChoice[1] as R;
  }

  /**
   * Return the next token. If it doesn't match one of the expected types, throws an error.
   * + creates branches.
   * @param expected Token expected.
   * @param ignored Ignores those tokens.
   * @returns The token matched.
   * @throws `ExitBranchError`
   */
  public expect<T extends TokenType>(expected: T[]): TokenValue & { type: T } {
    const oldPosition = this.getPosition();
    const [result, isChoice] = this.findToken(expected);

    if (result === null) {
      throw this.exit(`Exited because we didn't find one of ${expected.map((element) => typeof element === "string" ? element : TokenType[element]).toString()} at ${this.getPosition()}`);
    } else {
      this.logger.tokenFound(false, isChoice, expected, result, oldPosition, this.getPosition());
    }

    return result;
  }

  /**
   * Return the next token. If it doesn't match one of the expected types, returns null (and doesn't eat that token).
   * + creates branches.
   * @param expected Token expected.
   * @param ignored Ignores those tokens.
   * @returns The token matched.
   */
  public optional<T extends TokenType>(expected: T[]): TokenValue & { type: T } | null {
    const oldPosition = this.getPosition();
    const [result, isChoice] = this.findToken(expected, true);
    this.logger.tokenFound(true, isChoice, expected, result, oldPosition, this.getPosition());
    return result;
  }

  /**
   * Return the next token. If it doesn't match one of the expected, returns null (and doesn't eat that token).
   * + creates branches.
   * @param expected Token expected.
   * @param ignored Ignores those tokens.
   * @returns The token matched.
   */
  private findToken<T extends TokenType>(expected: T[], optional?: boolean): [TokenValue & { type: T } | null, isChoice: boolean] {
    let currentChoice: TokenValue & { type: T } | null;
    let isChoice = false;

    const choice = this.state.getTokenChoice();
    if (choice !== undefined) {
      if (choice !== null && !(expected as TokenType[]).includes(choice.type)) {
        throw this.exit(`Found a choice ${JSON.stringify(choice)} with type ${TokenType[choice.type]} which is not in types ${expected.map((type) => TokenType[type])}`); //!!!
      }
      isChoice = true;
      currentChoice = choice as TokenValue & { type: T } | null;
    } else {
      const token = this.current();
      const matched: (TokenValue | null)[] = getTokenValues(token, expected);

      if (matched.length === 0 || (optional && !(expected.length === 1 && expected[0] === TokenType.WhiteSpace))) {
        matched.push(null);
      }

      this.checkpoint.submitTokenChoices(matched, this.state);
      currentChoice = this.state.getTokenChoice() as TokenValue & { type: T } | null ?? null;
      if (currentChoice !== null && !(expected as TokenType[]).includes(currentChoice.type)) {
        throw this.exit(`Found a choice ${JSON.stringify(currentChoice)} with type ${TokenType[currentChoice.type]} which is not in types ${expected.map((type) => TokenType[type])}`);
      }
    }

    if (currentChoice !== null) {
      this.moveTo(currentChoice?.end);
    }
    return [currentChoice, isChoice];
  }

  /* -------------------------------- Handlers -------------------------------- */
  public getStmt(): StmtHandler {
    const choice = this.state.getHandlerChoice() as StmtHandler | undefined;
    if (choice !== undefined) {
      this.logger.handlerFound("stmt", true, choice);
      return choice;
    }

    // Get handlers
    const current = this.current();
    const handlers: StmtHandler[] = this.checkpoint.environment.mappings.getStmtHandlers(getTokenTypes(current));

    if (handlers.length === 0) {
      throw this.exit(`Could not find Stmt handler for token at ${this.getPosition()}`);
    }

    this.checkpoint.submitHandlerChoices(handlers, this.state);
    const currentChoice = this.state.getHandlerChoice() as StmtHandler;
    this.logger.handlerFound("stmt", false, currentChoice);
    return currentChoice;
  }

  public getNud(bp: BindingPower): NudHandler {
    const choice = this.state.getHandlerChoice() as NudHandler | undefined;
    if (choice !== undefined) {
      this.logger.handlerFound("nud", true, choice);
      return choice;
    }

    // Get handlers
    const current = this.current();
    const handlers: NudHandler[] = this.checkpoint.environment.mappings.getNudHandlers(bp, getTokenTypes(current));

    if (handlers.length === 0) {
      throw this.exit(`Could not find Nud handler for token at ${this.getPosition()}`);
    }

    this.checkpoint.submitHandlerChoices(handlers, this.state);
    const currentChoice = this.state.getHandlerChoice() as NudHandler;
    this.logger.handlerFound("nud", false, currentChoice);
    return currentChoice;
  }

  public getLed(bp: BindingPower): LedHandler | null {
    const choice = this.state.getHandlerChoice() as LedHandler | null | undefined;
    if (choice !== undefined) {
      this.logger.handlerFound("led", true, choice);
      return choice;
    }

    // Get handlers
    const current = this.current();
    const handlers: (LedHandler | null)[] = this.checkpoint.environment.mappings.getLedHandlers(bp, getTokenTypes(current));

    if (handlers.length === 0) {
      handlers.push(null);
    }

    this.checkpoint.submitHandlerChoices(handlers, this.state);
    const currentChoice = this.state.getHandlerChoice() as LedHandler;
    this.logger.handlerFound("led", false, currentChoice);
    return currentChoice;
  }
}

function choiceToString(choice: StmtHandler | NudHandler | LedHandler | null) {
  return typeof choice === "function" ? choice.name : (choice === null ? "null" : choice);
}
