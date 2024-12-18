/*
When parsing, instead of making only 1 tree, when we hit an apparent error or ambiguous syntax, we'll create branches of possible results. (branches are async?)
Then, after parsing, we go through each possibility and find which one is more likely/better using some rules.
I think that ultimately, its impossible to have errors in DreamBerd because we can just turn it to string.
*/

import {AstNodeKind, BlockStatement, BranchingStatement, createAstNode, Expression, Statement} from "./astNodes";
import {Tokenizer} from "../lexer/lexer";
import {getChoiceAtPosition, getToken, getTokenTypes, getTokenValues, hasTokensLeft, Token, TokenType, TokenValue} from "../lexer/token";
import Lookups, { LedHandler, NudHandler, NudParsingFunction, StmtHandler } from "./lookups";
import { BindingPower } from "./bindingPower";
import { parseProgram } from "./parserFunctions";
import { Checkpoint, Handler, HandlerParameters } from "./branches/checkpoint";
import { isEmpty, isNil } from "lodash";
import { ParserState } from "./branches/parserState";

export const options = {
  debug: true,
  useSignificantWhitespace: false
};

/** We assume this will always be filled before we need it */
export const references = ({} as unknown) as {
  tokens: Token[]
  lookups: Lookups
};

// Find a better name
export async function createAst(sourceCode: string): Promise<BlockStatement | BranchingStatement<BlockStatement>> {
  const tokens = new Tokenizer(sourceCode).tokenize();
  const lookups = new Lookups();

  references.tokens = tokens;
  references.lookups= lookups;

  const checkpoint = Checkpoint.new(0, parseProgram, []);

  console.log("Created initial branch");
  const allResults = (await checkpoint.getResults()).map(([, results]) => results)

  const resultList = allResults.flatMap((astNode) => {
    if (astNode.kind === AstNodeKind.BranchingStatement) {
      return astNode.branches
    }
    return [astNode]
  })

  if (resultList.length === 1) {
    return resultList[0]
  }
  return createAstNode(AstNodeKind.BranchingStatement, {start: 0, branches: resultList})
}

/* -------------------------------------------------------------------------- */

export class ExitBranchError extends Error {
  constructor(message?: string) {
    super(message);
  }
}

export default class Parser {
  private hideLogs: boolean = false;

  //Checkpoint
  private checkpoint: Checkpoint<any, any>;

  // State
  private state: ParserState;

  constructor(checkpoint: Checkpoint<any, any>, state: ParserState) {
    this.checkpoint = checkpoint;
    this.state = state;
  }

  public current(): Token {
    const token = getToken(this.getPosition(), references.tokens);

    if (!isNil(token)) {
      return token;
    }

    this.exit(`No token was found at position ${this.getPosition()}`);
    return undefined as any;
  }

  public moveTo(end: number) {
    this.state.position = end;
  }

  public hasToken(): boolean {
    return hasTokensLeft(this.getPosition(), references.tokens)
  }

  public getPosition(): number {
    return this.state.position;
  }

  /**
   * TODO better errors
   * @throws 
   */
  public exit(reason?: string) {
    console.log("\x1b[31m" + "Exiting branch because of: " + (reason ?? "unknown") + "\x1b[0m");
    throw new ExitBranchError();
  }

  public async executeHandler<T extends HandlerParameters, R extends Statement>(
    parsingFunction: Handler<T, R>,
    ...parameters: T
  ): Promise<R | BranchingStatement<R>> {
    const choice = this.state.getResultChoice();
    if (choice !== undefined) {
      !this.hideLogs && console.log("\x1b[34m" + `Result choice` + "\x1b[0m"); //TODO better logs
      this.moveTo(choice[0])
      return choice[1] as R
    }

    const newCheckpoint = Checkpoint.new(this.getPosition(), parsingFunction, parameters);
    const results = await newCheckpoint.getResults();

    this.checkpoint.submitResultChoice(results, this.state)
    const currentChoice = this.state.getResultChoice() as [endPosition: number, results: Statement];
    !this.hideLogs && console.log(`Result`); //TODO better logs

    this.moveTo(currentChoice[0])
    return currentChoice[1] as R
  }

  /**
   * Return the next token. If it doesn't match one of the expected types, throws an error.
   * + creates branches.
   * @param expected Token expected.
   * @param ignored Ignores those tokens.
   * @returns The token matched.
   * @throws `ExitBranchError`
   */
  public expect(expected: TokenType[]): TokenValue {
    const oldPosition = this.getPosition();
    const result = this.findToken(expected);

    if (result === null) {
      this.exit(`Exited because we didn't find one of ${expected.map((element) => typeof element === "string" ? element : TokenType[element]).toString()} at ${this.getPosition()}`);
    } else { 
      !this.hideLogs && console.log(`expected: ${TokenType[result.type]} of ${expected.map((type) => TokenType[type])} at ${oldPosition}-${this.getPosition()}`);
    }

    return result as TokenValue;
  }

  /**
   * Return the next token. If it doesn't match one of the expected types, returns null (and doesn't eat that token).
   * + creates branches.
   * @param expected Token expected.
   * @param ignored Ignores those tokens.
   * @returns The token matched.
   */
  public optional(expected: TokenType[], hideLogs?: boolean): TokenValue | null {
    const oldPosition = this.getPosition();
    const result = this.findToken(expected, true);
    !hideLogs && console.log(`optional: ${isNil(result) ? "null" : TokenType[result.type]} of ${expected.map((type) => TokenType[type])} at ${oldPosition}-${this.getPosition()}`);
    return result;
  }

  /**
   * Return the next token. If it doesn't match one of the expected, returns null (and doesn't eat that token).
   * + creates branches.
   * @param expected Token expected.
   * @param ignored Ignores those tokens.
   * @returns The token matched.
   */
  private findToken(expected: TokenType[], optional?: boolean): TokenValue | null {
    let currentChoice: TokenValue | null;

    const choice = this.state.getTokenChoice();
    if (choice !== undefined) {
      currentChoice = choice
      if (choice != null && !expected.includes(choice.type)) {
        this.exit(`Found a choice ${choice} with type ${TokenType[choice.type]} which is not in types ${expected}`)
      }
    } else {
      const token = this.current();
      const matched: (TokenValue | null)[] = getTokenValues(token, expected);
      if (isEmpty(matched)) {
        return null;
      }
  
      if (optional && !(expected.length === 1 && expected[0] === TokenType.WhiteSpace)) {
        matched.push(null);
      }
  
      this.checkpoint.submitTokenChoices(matched, this.state);
      currentChoice = this.state.getTokenChoice() ?? null;
    }

    if (currentChoice !== null) {
      this.moveTo(currentChoice?.end);
    }
    return currentChoice;
  }

  public getStmt(): StmtHandler {
    const choice = this.state.getHandlerChoice() as StmtHandler | undefined;
    if (choice != undefined) {
      !this.hideLogs && console.log("\x1b[34m" + `Stmt choice ${choiceToString(choice)} ${this.state._handlerChoiceIndex} of ${this.state._handlerChoices.length}. Position ${this.getPosition()}` + "\x1b[0m");
      return choice;
    }

    // Get handlers
    const current = this.current();
    const handlers: StmtHandler[] = references.lookups.getStmtHandlers(getTokenTypes(current));

    if (isEmpty(handlers)) {
      //TODO better logs
      this.exit(`Could not find Stmt handler for token at ${this.getPosition()}`);
    }

    this.checkpoint.submitHandlerChoices(handlers, this.state);
    const currentChoice = this.state.getHandlerChoice() as StmtHandler;
    !this.hideLogs && console.log(`Stmt ${choiceToString(currentChoice)}`); //TODO better logs
    return currentChoice;
  }

  public getNud(bp: BindingPower): NudHandler {
    const choice = this.state.getHandlerChoice() as NudHandler | undefined;
    if (choice != undefined) {
     !this.hideLogs && console.log("\x1b[34m" + `Nud choice ${choiceToString(choice)} ${this.state._handlerChoiceIndex} of ${this.state._handlerChoices.length}. Position ${this.getPosition()}` + "\x1b[0m");
     return choice;
    }
    
    // Get handlers
    const current = this.current();
    const handlers: NudHandler[] = references.lookups.getNudHandlers(bp, getTokenTypes(current));

    if (isEmpty(handlers)) {
      //TODO better logs
      this.exit(`Could not find Nud handler for token at ${this.getPosition()}`);
    }

    this.checkpoint.submitHandlerChoices(handlers, this.state);
    const currentChoice = this.state.getHandlerChoice() as NudHandler;
    !this.hideLogs && console.log(`Nud ${choiceToString(currentChoice)}`);
    return currentChoice;
  }

  public getLed(bp: BindingPower): LedHandler | null {
    const choice = this.state.getHandlerChoice() as LedHandler | null | undefined
    if (choice != undefined) {
      !this.hideLogs && console.log("\x1b[34m" + `Nud choice ${choiceToString(choice)} ${this.state._handlerChoiceIndex} of ${this.state._handlerChoices.length}. Position ${this.getPosition()}` + "\x1b[0m");
      return choice;
    }
    
    // Get handlers
    const current = this.current();
    const handlers: (LedHandler | null)[] = references.lookups.getLedHandlers(bp, getTokenTypes(current));
    
    if (isEmpty(handlers)) {
      handlers.push(null);
    }

    this.checkpoint.submitHandlerChoices(handlers, this.state);
    const currentChoice = this.state.getHandlerChoice() as LedHandler;
    !this.hideLogs && console.log(`Led ${choiceToString(currentChoice)}`);
    return currentChoice;
  }
}

function choiceToString(choice: StmtHandler | NudHandler | LedHandler | null) {
  return typeof choice === "function" ? choice.name : (choice === null ? "null" : choice);
}