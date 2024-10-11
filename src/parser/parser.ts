/*
When parsing, instead of making only 1 tree, when we hit an apparent error or ambiguous syntax, we'll create branches of possible results. (branches are async?)
Then, after parsing, we go through each possibility and find which one is more likely/better using some rules.
I think that ultimately, its impossible to have errors in DreamBerd because we can just turn it to string.
*/

import {AstNodeKind, BlockStatement, BranchingStatement, Statement} from "./astNodes";
import {tokenize} from "../lexer/lexer";
import {newToken, Token, TokenToString, TokenType, TokenTypeListToString} from "../lexer/token";
import Lookups, { LedHandler, NudHandler, StmtHandler } from "./lookups";
import {parseStatement} from "./parserFunctions";

export class ExitBranchError extends Error {
  constructor(message?: string) {
    super(message);
  }
}

type Choice = Token | StmtHandler | NudHandler | LedHandler | null

export class Parser {
  private defaultIgnored = [TokenType.whiteSpace, TokenType.lineBreak];

  //Checkpoint
  private checkpoint: Checkpoint<any, any>;

  // State
  /** This is a list of the choices we made to get from the last checkpoint to here. */
  private choices: Choice[];
  private position: number;
  // end state

  // How far in the choice list we are
  private choiceIndex: number = 0;

  constructor(checkpoint: Checkpoint<any, any>, position = 0, choices: Choice[] = []) {
    this.checkpoint = checkpoint;
    this.position = position;
    this.choices = choices;
  }

  public current(index?: number) {
    //TODO FIX when undef
    const token = global.tokens[this.position + (index ?? 0)];

    if (token === undefined) {
      return newToken(undefined, TokenType.None);
    }

    return token;
  }

  public next(offset?: number) {
    if (offset == undefined) {
      this.position++;
    } else {
      this.position += offset;
    }
  }

  get getPosition() {
    return this.position;
  }

  public hasToken(): boolean {
    // We are outside the tokens
    if (this.position >= global.tokens.length) {
      return false;
    }

    let index = 0;
    while (this.position + index < global.tokens.length) {
      // we hit a meaningless token, we ignore it.
      if (this.defaultIgnored.includes(this.current(index).type)) {
        index++;
      }
      // we hit the EOF
      if (this.current(index).type === TokenType.EOF) {
        return false;
      }

      // We have a meaningful token
      return true;
    }
    return false;
  }

  /**
   * @throws 
   */
  public exit(reason?: string) {
    console.log("\x1b[31m" + "Exiting branch because of: " + (reason ?? "unknown") + "\x1b[0m");
    //TODO Better errors
    throw new ExitBranchError();
  }

  public changeCheckpoint(checkpoint: Checkpoint<any,any>) {
    this.checkpoint = checkpoint;
    this.choices.splice(0);
  }

  //TODO
  /**
   * 
   * @returns 
   * @throws {ExitBranchError}
   */
  public parse<T extends Statement>(): T | BranchingStatement<T> {
    // when we parse, we have :
      // tokens: Token[];
      // lookups: Lookups;
      // position: number;

      // choices: (string | TokenType)[];

    // Do we have a ref to the function we need to call to parse? Yes.
      // checkpoint.use(this)

    this.checkpoint.parseFunction(this);
    return this.checkpoint.result;
  }


  //? Do we log stuff? Like when we fail at parsing some patterns?
  /**
   * Return the next non ignored token. If it doesn't match one of the expected, throws an error.
   * Creates new branches for every token after the 1st matched.
   * @param expected Token expected.
   * @param ignored Ignores those tokens.
   * @returns The token matched.
   * @throws `ExitBranchError`
   */
  public expect(expected: (string | TokenType)[], ignored?: (string | TokenType)[]): Token {
    // Follow the choice for this branch (we assume its right, if its not, we have bigger problems)
    // TODO add error when choice is an unexpected type.
    if (this.choiceIndex < this.choices.length) {
      const choice: Choice = this.choices[this.choiceIndex];
      console.log("\x1b[34m" + `Choice ${choiceToString(choice)} ${this.choiceIndex} of ${this.choices.length}. End ${this.position}` + "\x1b[0m");
      this.choiceIndex++;
      return choice as Token;
    }

    // If we don't already have a choice, we find the next token and create branches
    const result = this.findToken(expected, ignored);

    if (result === null) {
      this.exit(`Exited because we found ${TokenToString(this.failedToken as Token)} instead of one of ${expected.map((element) => typeof element === "string" ? element : TokenType[element]).toString()}`);
    }

    console.log(`expected: ${TokenToString(result as Token)}`);
    return result as Token;
  }

  /**
   * Return the next non ignored token. If it doesn't match one of the expected, returns null (and doesn't advance).
   * Creates new branches for every token after the 1st matched and a branch where no tokens where matched (null).
   * @param expected Token expected.
   * @param ignored Ignores those tokens.
   * @returns The token matched.
   */
  public optional(expected: (string | TokenType)[], ignored?: (string | TokenType)[]): Token | null {
    // Follow the choice for this branch (we assume its right, if its not, we have bigger problems)
    // TODO add error when choice is an unexpected type.
    if (this.choiceIndex < this.choices.length) {
      const choice: Choice = this.choices[this.choiceIndex];
      console.log("\x1b[34m" + `Choice ${choiceToString(choice)} ${this.choiceIndex} of ${this.choices.length}. End ${this.position}` + "\x1b[0m");
      this.choiceIndex++;
      return choice as Token | null;
    }

    // If we don't already have a choice, we find the next token and create branches
    // Create a branch for the choice of not doing anything
    this.createBranches([null]);
    const result = this.findToken(expected, ignored);
    if (result == undefined) {
      console.log(`optional: null`);
    } else {
      console.log(`optional: ${TokenToString(result)}`);
    }
    return result;
  }

  /** Keep the last failed token from `optional` for better error message. */
  private failedToken?: Token;

  //TODO make a better system to match tokens, like with lambdas or smt
  /**
   * Return the next non ignored token. If it doesn't match one of the expected, returns null (and doesn't advance).
   * @param expected Token expected.
   * @param ignored Ignores those tokens.
   * @returns The token matched.
   */
  private findToken(expected: (string | TokenType)[], ignored: (string | TokenType)[] = this.defaultIgnored): Token | null {

    //^ This might need to get more complicated to handle identifiers that cross token boundaries and other stuff like that
    const compareCurrentToken = (comparator: string | TokenType): boolean => {
      if (typeof comparator === 'string') {
        return this.current(index).value === comparator;
      } else {
        return this.current(index).type === comparator;
      }
    };

    let index = 0;
    while (this.hasToken()) {
      // skip ignored tokens
      // eslint-disable-next-line unicorn/no-array-callback-reference
      if (!ignored.some(compareCurrentToken)) {
        //TODO TEMP, REMOVE WHEN WE HAVE A BETTER WAY TO MATCH TOKENS. If one of the expected is TokenType.Symbol, we return any non-whitespace token
        if (expected.includes(TokenType.Symbol)) {
          this.position++;
          this.createBranches([{...this.current(index - 1), type: TokenType.Identifier}]);
          this.position--;
        }
        //TODO END TEMP

        // eslint-disable-next-line unicorn/no-array-callback-reference
        const matched = expected.filter(compareCurrentToken);
        if (matched.length === 0) {
          this.failedToken = this.current(index);
          return null;
        }
        this.next(index);

        // Create new tokens for all the matched types/string
        const choices: Token[] = matched.map((element) => typeof element == "string" 
          ? {...this.current(), type: TokenType.Identifier} 
          : {...this.current(), type: element}
        );
        this.next();


        // Make new branches
        // We keep one choice for the current branch
        const currentChoice = choices.shift() as Token;
        // We create branches with the remaining choices, based on this branch
        this.createBranches(choices);

        // We commit the choice for this branch
        this.choices.push(currentChoice);
        this.choiceIndex++;
        return currentChoice;
      }
      index++;
    }

    return null;
  }

  /**
   * Return 1 stmt handler, and create branches with the rest
   */
  public getStmt(): StmtHandler {
    // Follow the choice for this branch (we assume its right, if its not, we have bigger problems)
    // TODO add error when choice is an unexpected type.
    if (this.choiceIndex < this.choices.length) {
      const choice: Choice = this.choices[this.choiceIndex];
      console.log("\x1b[34m" + `Choice ${choiceToString(choice)} ${this.choiceIndex} of ${this.choices.length}. End ${this.position}` + "\x1b[0m");
      this.choiceIndex++;
      return choice as StmtHandler;
    }


    // get rid of meaningless tokens
    while (this.hasToken() && this.defaultIgnored.includes(this.current().type)) {
      this.next();
    }

    // Get handlers that use raw value
    const identifier_handlers = global.lookups.stmt_lu.get(TokenType.Identifier)?.filter(([, lu_identifier])=>lu_identifier === this.current().value || lu_identifier === "");
    const handlers =  this.current().type == TokenType.Identifier ? undefined : global.lookups.stmt_lu.get(this.current().type);
    const choices = [...(handlers ?? []), ...(identifier_handlers ?? [])].map(([handler,]) => handler);

    // Make new branches
    // We keep one choice for the current branch
    const currentChoice = choices.shift() as StmtHandler;
    // We create branches with the remaining choices, based on this branch
    this.createBranches(choices);

    // We commit the choice for this branch
    this.choices.push(currentChoice);
    this.choiceIndex++;
    console.log(`Stmt ${currentChoice.name}`);
    return currentChoice;
  }

  public getNud(): NudHandler {
    // Follow the choice for this branch (we assume its right, if its not, we have bigger problems)
    // TODO add error when choice is an unexpected type.
    if (this.choiceIndex < this.choices.length) {
      const choice: Choice = this.choices[this.choiceIndex];
      console.log("\x1b[34m" + `Choice ${choiceToString(choice)} ${this.choiceIndex} of ${this.choices.length}. End ${this.position}` + "\x1b[0m");
      this.choiceIndex++;
      return choice as NudHandler;
    }


    // get rid of meaningless tokens
    while (this.hasToken() && this.defaultIgnored.includes(this.current().type)) {
      this.next();
    }

    // Get handlers that use raw value
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const identifier_handlers = global.lookups.nud_lu.get(TokenType.Identifier)?.filter(([,_, lu_identifier])=>lu_identifier === this.current().value || lu_identifier === "");
    const handlers = this.current().type == TokenType.Identifier ? undefined : global.lookups.nud_lu.get(this.current().type);
    
    if (handlers === undefined && identifier_handlers === undefined) {
      this.exit(`Could not find Nud handler for token: ${TokenToString(this.current())} at position: ${this.position}`);
    }
    const choices = [...(handlers ?? []), ...(identifier_handlers ?? [])].map(([handler,]) => handler);

    // Make new branches
    // We keep one choice for the current branch
    const currentChoice = choices.shift() as NudHandler;
    // We create branches with the remaining choices, based on this branch
    this.createBranches(choices);

    // We commit the choice for this branch
    this.choices.push(currentChoice);
    this.choiceIndex++;
    console.log(`Nud ${currentChoice.name}`);
    return currentChoice;
  }

  public getLed(bp: BindingPower): LedHandler | null {
    // Follow the choice for this branch (we assume its right, if its not, we have bigger problems)
    // TODO add error when choice is an unexpected type.
    if (this.choiceIndex < this.choices.length) {
      const choice: Choice = this.choices[this.choiceIndex];
      console.log("\x1b[34m" + `Choice ${choiceToString(choice)} ${this.choiceIndex} of ${this.choices.length}. End ${this.position}` + "\x1b[0m");
      this.choiceIndex++;
      return choice as LedHandler | null;
    }


    // get rid of meaningless tokens
    while (this.hasToken() && this.defaultIgnored.includes(this.current().type)) {
      this.next();
    }

    // Get handlers that use raw value
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const identifier_handlers = global.lookups.led_lu.get(TokenType.Identifier)?.filter(([,_, lu_identifier])=>lu_identifier === this.current().value || lu_identifier === "");
    const handlers = this.current().type == TokenType.Identifier ? undefined : global.lookups.led_lu.get(this.current().type);

    if (handlers === undefined && identifier_handlers === undefined) {
      return null;
    }
    const choices = [...(handlers ?? []), ...(identifier_handlers ?? [])]
      .filter(([, led_bp]) => led_bp > bp)
      .map(([handler,]) => handler);

    // Make new branches
    // We keep one choice for the current branch
    const currentChoice = choices.shift() as LedHandler;
    // We create branches with the remaining choices, based on this branch
    this.createBranches(choices);

    // We commit the choice for this branch
    this.choices.push(currentChoice);
    this.choiceIndex++;
    console.log(`Led ${currentChoice.name}`);
    return currentChoice;
  }

  private createBranches(choices: Choice[]) {
    for (const choice of choices) {
      global.branchManager.addBranch(new Parser(this.checkpoint, this.position, [...this.choices, choice]));
      console.log("\x1b[33m" + `Created branch, choice: ${choiceToString(choice)}, position: ${this.position}` + "\x1b[0m");
    }
  }
}

function choiceToString(choice: Choice) {
  return typeof choice === "function" ? choice.name :
    (choice === null ? "null" :
    TokenToString(choice))
}