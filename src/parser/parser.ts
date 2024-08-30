/*
When parsing, instead of making only 1 tree, when we hit an apparent error or ambiguous syntax, we'll create branches of possible results. (branches are async?)
Then, after parsing, we go through each possibility and find which one is more likely/better using some rules.
I think that ultimately, its impossible to have errors in DreamBerd because we can just turn it to string.
*/

import {AstNodeKind, BlockStatement} from "./astNodes";
import {tokenize} from "../lexer/lexer";
import {Token, TokenType, TokenTypeListToString} from "../lexer/token";
import Lookups from "./lookups";
import {parseStatement} from "./parserFunctions";

/** Print a custom error */
export type CustomError = (token: Token, expectedTypes: TokenType[], ignoredTypes?: TokenType[]) => void;
export type CustomIdentifierError = (token: Token, expectedIdentifiers: string[], ignoredTypes?: TokenType[]) => void;

// We want to create the parser in a way where we don't mutate its state (directly) so we can branch later.
export default class Parser {
  private tokens: Token[] = [];
  public lookups: Lookups;
  private defaultIgnoredTypes = [TokenType.WhiteSpace, TokenType.LineBreak];

  // private lookup
  private position: number = 0;

  public getPosition() {return this.position;}

  constructor() {
    this.lookups = new Lookups();
  }

  /* --------------------------------- Parsing -------------------------------- */
  public parse(sourceCode: string): BlockStatement {
    this.tokens = tokenize(sourceCode);
    console.log(this.tokens);

    const program: BlockStatement = {
      kindName: AstNodeKind[AstNodeKind.BlockStatement],
      kind: AstNodeKind.BlockStatement,
      body: [],
    };

    // Parse tokens into an ast until there is no token left
    while (this.hasToken()) {
      program.body.push(parseStatement(this));
    }

    return program;
  }

  /* ---------------------------------- Utils --------------------------------- */
  public currentToken(): Token {
    return this.tokens[this.position];
  }

  public getTokenAtOffset(offset: number): Token {
    return this.tokens[this.position + offset];
  }

  /** Returns current token and advances a number of times (can also go back) */
  public advance(offset = 1): Token {
    const token = this.currentToken();
    this.position += offset;
    return token;
  }

  public hasToken(): boolean {
    return (
      this.position < this.tokens.length &&
      this.currentToken().type != TokenType.EOF
    );
  }

  public remainingLength(): number {
    return this.tokens.length - this.position;
  }

  public exit(error?: string) {
    console.error(error ?? "ERROR: An unknown problem ocurred before the parsing was complete.");
    process.exit();
    // throw "Process exit";
  }

  /* --------------------------------- Expect --------------------------------- */
  public expect(
    expectedTypes: TokenType[],
    ignoredTypes?: TokenType[],
    advance: boolean = true,
    isFatal: boolean = true,
    customError?: CustomError
  ): [wasFound: boolean, token: Token] {

    ignoredTypes = ignoredTypes == undefined ? this.defaultIgnoredTypes : ignoredTypes;
    // if we have found the correct token yet.
    let expectedFound: boolean = false;

    // Check tokens until we hit a non-ignored token
    let index = 0;
    while (this.hasToken()) {
      // Get the token.
      const token = this.getTokenAtOffset(index);

      // Check if we should ignore it.
      if (!ignoredTypes?.includes(token.type)) {
        // Check if valid or error out
        if (expectedTypes.includes(token.type)) {
          expectedFound = true;
        } else {
          // Print a message
          if (customError) {
            customError(token, expectedTypes, ignoredTypes);
          } else {
            console.error(`Expected ${TokenTypeListToString(expectedTypes)} but received ${TokenType[token.type]} instead\n`);
          }
          // Exit if its a critical error
          if (isFatal) {
            this.exit();
          }
        }
        break;
      }
      index++;
    }

    const token = this.getTokenAtOffset(index);
    if (advance) {
      this.advance(index + 1);
    }
    return [expectedFound, token];
  }

  public expectIdentifier(
    identifiers: string[],
    ignoredTypes?: TokenType[],
    advance: boolean = true,
    isFatal: boolean = true,
    customError?: CustomIdentifierError
  ): [wasFound: boolean, token: Token] {
    
    ignoredTypes = ignoredTypes == undefined ? this.defaultIgnoredTypes : ignoredTypes;
    // if we have found the correct token yet.
    let expectedFound: boolean = false;

    // Check tokens until we hit a non-ignored token
    let index = 0;
    while (this.hasToken()) {
      // Get the token.
      const token = this.getTokenAtOffset(index);

      // Check if we should ignore it.
      if (!ignoredTypes?.includes(token.type)) {
        // Check if valid or error out
        if (
          token.type == TokenType.Identifier &&
          identifiers.includes(token.value)
        ) {
          expectedFound = true;
        } else {
          // Print a message
          if (customError) {
            customError(token, identifiers, ignoredTypes);
          } else {
            console.error(
              `Expected identifier in ${identifiers} but received ${
                TokenType[token.type]
              } with value '${token.value}' instead\n`
            );
          }

          // Exit if its a critical error
          if (isFatal) {
            this.exit();
          }
        }
        break;
      }
      index++;
    }

    const token = this.getTokenAtOffset(index);
    if (advance) {
      this.advance(index + 1);
    }
    return [expectedFound, token];
  }
}
