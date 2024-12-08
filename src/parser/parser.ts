/*
When parsing, instead of making only 1 tree, when we hit an apparent error or ambiguous syntax, we'll create branches of possible results. (branches are async?)
Then, after parsing, we go through each possibility and find which one is more likely/better using some rules.
I think that ultimately, its impossible to have errors in DreamBerd because we can just turn it to string.
*/

import {AstNodeKind, BlockStatement, BranchingStatement, Expression, Statement} from "./astNodes";
import {Tokenizer} from "../lexer/lexer";
import {getToken, getTokenTypes, getTokenValues, hasTokensLeft, Token, TokenType, TokenValue} from "../lexer/token";
import Lookups, { LedHandler, NudHandler, StmtHandler } from "./lookups";
import { BindingPower } from "./bindingPower";
import { parseProgram } from "./parserFunctions";
import { BranchManager } from "./branches/branchManager";
import { Checkpoint, Handler, HandlerParameters } from "./branches/checkpoint";
import { isEmpty, isNil } from "lodash";

export const options = {
  debug: true,
  useSignificantWhitespace: false
};

/** We assume this will always be filled before we need it */
export const references = ({} as unknown) as {
  tokens: Token[]
  lookups: Lookups
  branchManager: BranchManager
};

// Find a better name
export async function createAst(sourceCode: string): Promise<BlockStatement | BranchingStatement<BlockStatement>> {
  const tokens = new Tokenizer(sourceCode).tokenize();
  const lookups = new Lookups();
  const branchManager = new BranchManager();

  references.tokens = tokens;
  references.lookups= lookups;
  references.branchManager = branchManager;

  const checkpoint = Checkpoint.new(0, parseProgram, []);

  const parser = new Parser(checkpoint, new ParserState());
  console.log("Created initial branch");
  branchManager.addBranch(parser);
  await branchManager.run();
  return checkpoint.result;
}


export class ExitBranchError extends Error {
  constructor(message?: string) {
    super(message);
  }
}

type Choice = Token | StmtHandler | NudHandler | LedHandler | null

class ParserState {
  public position: number;
  /** This is a list of the choice of tokens we made to get from the last checkpoint to here. */
  public tokenChoices: Token[];
  public handlerChoices: (StmtHandler | NudHandler | LedHandler | null)[];

  constructor(previousState?: ParserState, changes?: {tokenChoice?: Token, handlerChoice?: (StmtHandler | NudHandler | LedHandler | null)}) {
    if (isNil(previousState)) {
      this.position = 0;
      this.tokenChoices = [];
      this.handlerChoices = [];
    } else {
      this.position = 0;

      this.tokenChoices = this.copyTokens(previousState.tokenChoices);
      if (changes?.tokenChoice !== undefined) {
        this.tokenChoices.push(changes.tokenChoice);
      }

      this.handlerChoices = [...previousState.handlerChoices];
      if (changes?.handlerChoice !== undefined) {
        this.handlerChoices.push(changes.handlerChoice);
      }
    }
  }

  public resetChoices() {
    this.tokenChoices.splice(0);
    this.handlerChoices.splice(0);
  }

  private copyTokens(tokens: Token[]): Token[]{
    tokens = structuredClone(tokens);
    tokens.forEach((token)=> {token.nullCount = token.totalNullCount}) //! this might create problems later, but I don't care
    return tokens;
  }
}

export default class Parser {
  //Checkpoint
  private checkpoint: Checkpoint<any, Statement>;

  // State
  private state: ParserState;

  // How far in the choice list we are
  private tokenChoiceIndex: number = 0;
  private handlerChoiceIndex: number = 0;

  private hideLogs: boolean = false;

  constructor(checkpoint: Checkpoint<any, any>, state: ParserState) {
    this.checkpoint = checkpoint;
    this.state = state;
  }

  public current(): {token: Token, isChoice: boolean} {
    let token = getToken(this.state.position, false, this.state.tokenChoices);

    if (!isNil(token)) {
      return {token, isChoice: true};
    }

    token = getToken(this.state.position, true, references.tokens);

    if (!isNil(token)) {
      return {token, isChoice: false};
    }
    
    this.exit(`No token was found at position ${this.state.position}`);
    return undefined as any;
  }

  public next(end: number) {
    this.state.position = end;
  }

  public hasToken(): boolean {
    return hasTokensLeft(this.state.position, references.tokens)
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

  //~ might not be needed/might need to be changed
  public changeCheckpoint(checkpoint: Checkpoint<any,any>) {
    this.checkpoint = checkpoint;
    this.tokenChoiceIndex = 0;
    this.handlerChoiceIndex = 0;
    this.state.resetChoices();
  }

  /**
   * Parse using the function stored in the checkpoint
   * @returns 
   * @throws {ExitBranchError}
   */
  public parse() {
    this.checkpoint.execute(this);
  }

  /**
   * TODO better logs
   * Return the next token. If it doesn't match one of the expected types, throws an error.
   * + creates branches.
   * @param expected Token expected.
   * @param ignored Ignores those tokens.
   * @returns The token matched.
   * @throws `ExitBranchError`
   */
  public expect(expected: TokenType[]): TokenValue {
    const oldPosition = this.state.position;
    const result = this.findToken(expected);

    if (result === null) {
      this.exit(`Exited because we didn't find one of ${expected.map((element) => typeof element === "string" ? element : TokenType[element]).toString()} at ${this.state.position}`);
    } else { 
      !this.hideLogs && console.log(`expected: ${TokenType[result.type]} of ${expected.map((type) => TokenType[type])} at ${oldPosition}-${this.state.position}`);
    }

    return result as TokenValue;
  }

  /**
   * TODO better logs
   * Return the next token. If it doesn't match one of the expected types, returns null (and doesn't eat that token).
   * + creates branches.
   * @param expected Token expected.
   * @param ignored Ignores those tokens.
   * @returns The token matched.
   */
  public optional(expected: TokenType[], hideLogs?: boolean): TokenValue | null {
    const oldPosition = this.state.position;
    const result = this.findToken(expected, true);
    !hideLogs && console.log(`optional: ${isNil(result) ? "null" : TokenType[result.type]} of ${expected.map((type) => TokenType[type])} at ${oldPosition}-${this.state.position}`);
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

    const choice = this.getTokenChoice();

    if (choice !== undefined) {
      if (choice === null) {
        return choice;
      } else if (expected.includes(choice.type)) {
        this.state.position = choice?.end;
        return choice;
      } else {
        return null;
      }
    }

    const token = this.current().token;
    const matched: (TokenValue | null)[] = getTokenValues(token, expected);
    if (isEmpty(matched)) {
      return null;
    }

    if (optional && !(expected.length === 1 && expected[0] === TokenType.WhiteSpace)) {
      matched.push(null);
    }

    this.submitTokenChoices(token, matched);
    const currentChoice =  this.getTokenChoice() ?? null;

    if (currentChoice !== null) {
      this.state.position = currentChoice?.end;
    }
    return currentChoice;
  }

  private submitTokenChoices(token: Token, choices: (TokenValue | null)[]) {
    //* I think that when we add checkpoints for real, this is where we'll tell the checkpoint what we have, and get from it things like the state we ned to be in (like what nb of null).

    if (choices.length === 0) {
      this.exit("No token choice found");
      return;
    }

    const currentTokenChoice = getToken(this.state.position, false, this.state.tokenChoices);
    if (currentTokenChoice?.values && currentTokenChoice.values.length > 0) {
      this.exit("Attempting to create a token choice with more than 1 choice.");
    }

    let currentChoice: Token | undefined;
    choices.forEach((choice, index) => {
      let newToken: Token;

      if (currentTokenChoice === undefined) {
        newToken = {
          start: token.start,
          values: []
        };
      } else {
        newToken = {
          start: token.start,
          values: [],
          nullCount: currentTokenChoice.totalNullCount,
          totalNullCount: currentTokenChoice.totalNullCount
        }; 
      }


      if (choice === null) {
        newToken.nullCount = (newToken.nullCount ?? 0) + 1;
        newToken.totalNullCount = (newToken.totalNullCount ?? 0) + 1;
      } else {
        newToken.values.push(choice);
      }

      if (index === 0) {
        currentChoice = newToken;
      } else {
        references.branchManager.addBranch(new Parser(this.checkpoint, new ParserState(this.state, {tokenChoice: newToken})));
        
        !this.hideLogs && console.log("\x1b[33m" + `Created token branch, choice: ${isNil(choice) ? "null" : `${isNil(choice) ? "null" : TokenType[choice.type]}`}. Position ${this.state.position}` + "\x1b[0m");
      }
    });
    
    if (currentChoice !== undefined) {
      this.state.tokenChoices.push(currentChoice);
    }
  }

  private getTokenChoice(): TokenValue | null | undefined {
    const token = getToken(this.state.position, false, this.state.tokenChoices);

    if (isNil(token)) {
      return undefined;
    }

    if (!isNil(token.nullCount) && token.nullCount > 0) {
      token.nullCount--;
      return null;
    }

    if (token?.values.length > 1) {
      this.exit(`Found a token choice with multiple values ${JSON.stringify(token)}.`);
      return undefined;
    } else if (token.values.length <= 0) {
      return undefined;
    } else {
      return token.values[0];
    }
  }
  

  /**
   * TODO better logs
   * Return 1 stmt handler, and create branches with the rest
   */
  public getStmt(): StmtHandler {
    if (this.hasHandlerChoiceLeft()) {
      const choice = this.getHandlerChoice() as StmtHandler;
      !this.hideLogs && console.log("\x1b[34m" + `Stmt choice ${choiceToString(choice)} ${this.handlerChoiceIndex} of ${this.state.handlerChoices.length}. Position ${this.state.position}` + "\x1b[0m");
      return choice;
    }

    // Get handlers
    const current = this.current();
    if (isNil(current.token)) {
      this.exit(`Could not find token at position ${this.state.position}`);
      return undefined as any;
    }

    const handlers: StmtHandler[] = references.lookups.getStmtHandlers(getTokenTypes(current.token));

    if (isEmpty(handlers)) {
      //TODO better logs
      this.exit(`Could not find Stmt handler for token at ${this.state.position}`);
    }

    this.submitHandlerChoices(handlers);
    const currentChoice = this.getHandlerChoice() as StmtHandler;
    !this.hideLogs && console.log(`Stmt ${choiceToString(currentChoice)}`); //TODO better logs
    return currentChoice;
  }

  public getNud(bp: BindingPower): NudHandler {
   if (this.hasHandlerChoiceLeft()) {
     const choice = this.getHandlerChoice() as NudHandler;
     !this.hideLogs && console.log("\x1b[34m" + `Nud choice ${choiceToString(choice)} ${this.handlerChoiceIndex} of ${this.state.handlerChoices.length}. Position ${this.state.position}` + "\x1b[0m");
     return choice;
    }
    
    // Get handlers
    const current = this.current();
    if (isNil(current.token)) {
      this.exit(`Could not find token at position ${this.state.position}`);
      return undefined as any;
    }

    const handlers: NudHandler[] = references.lookups.getNudHandlers(bp, getTokenTypes(current.token));

    if (isEmpty(handlers)) {
      //TODO better logs
      this.exit(`Could not find Nud handler for token at ${this.state.position}`);
    }

    this.submitHandlerChoices(handlers);
    const currentChoice = this.getHandlerChoice() as NudHandler;
    !this.hideLogs && console.log(`Nud ${choiceToString(currentChoice)}`);
    return currentChoice;
  }

  public getLed(bp: BindingPower): LedHandler | null {
    if (this.hasHandlerChoiceLeft()) {
      const choice = this.getHandlerChoice() as LedHandler | null;
      !this.hideLogs && console.log("\x1b[34m" + `Nud choice ${choiceToString(choice)} ${this.handlerChoiceIndex} of ${this.state.handlerChoices.length}. Position ${this.state.position}` + "\x1b[0m");
      return choice;
    }
    
    // Get handlers
    const current = this.current();
    if (isNil(current.token)) {
      this.exit(`Could not find token at position ${this.state.position}`);
      return undefined as any;
    }

    const handlers: (LedHandler | null)[] = references.lookups.getLedHandlers(bp, getTokenTypes(current.token));
    
    if (isEmpty(handlers)) {
      handlers.push(null);
    }

    this.submitHandlerChoices(handlers);
    const currentChoice = this.getHandlerChoice() as LedHandler;
    !this.hideLogs && console.log(`Led ${choiceToString(currentChoice)}`);
    return currentChoice;
  }


  private submitHandlerChoices(choices: (StmtHandler | NudHandler | LedHandler | null)[]) {
    const currentChoice = choices.shift();
    if (currentChoice === undefined) {
      this.exit("No handler choice found");
      return;
    }

    for (const choice of choices) {
      references.branchManager.addBranch(new Parser(this.checkpoint, new ParserState(this.state, {handlerChoice: choice})));
      !this.hideLogs && console.log("\x1b[33m" + `Created handler branch, choice: ${isNil(choice) ? "null" : choiceToString(choice)}, position: ${this.state.position}` + "\x1b[0m");
    }

    this.state.handlerChoices.push(currentChoice);
    // console.log("\x1b[33m" + `Added choice to current branch: ${isNil(currentChoices) ? "null" : currentChoices.map(choiceToString).toString()}, position: ${this.state.position}` + "\x1b[0m");
  }

  private hasHandlerChoiceLeft(): boolean {
    return this.handlerChoiceIndex < this.state.handlerChoices.length;
  }

  private getHandlerChoice(): StmtHandler | NudHandler | LedHandler | null { 
    const choice: Choice = this.state.handlerChoices[this.handlerChoiceIndex];
    
    this.handlerChoiceIndex++;
    return choice;
  }

  public exec<T extends HandlerParameters, R extends Statement>(
    parsingFunction: Handler<T, R>,
    ...parameters: T
  ): R | BranchingStatement<R> {
    // testCheckpoint = new checkpoint
    // p.changeCheckpoint(testCheckpoint);
    // testCheckpoint.parseFunction(p);
    // const expression = testCheckpoint.result;
    const newCheckpoint = Checkpoint.new(this.getPosition(), parsingFunction, parameters);
    this.changeCheckpoint(newCheckpoint);
    newCheckpoint.execute(this);
    return newCheckpoint.result;
  }

}

function choiceToString(choice: Choice) {
  return typeof choice === "function" ? choice.name : (choice === null ? "null" : choice);
}