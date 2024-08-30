/*
context aware lexer/ context sensitive lexer

when we lex, when we find an identifier, we ask the parser if we already know it in the current context.
We run the parser and lexer concurrently and the lexer only look for the next token when the parser asks for it.
If we still get an ambiguous token, we give it back to the parser with a special type and let it decide what to do with it (like try to turn it into a string, or try to terminate the line)

This should completely eliminate ambiguity and errors, except when hoisting functions.

If we allow hoisting functions, we cannot be sure that a function named `const` for example isn't already defined lower down, and thus need to keep track of every token forever.
To fix this, we either: won't allow functions to be named like a keyword or we don't allow those functions to be hoisted, or we don't allow functions with specific names (names that can create ambiguity) (I think the only one is => and {, everything else should be fine).

*/

import {
  ArithmeticMap,
  ArithmeticOperators,
  BitwiseMap,
  BitwiseOperators,
  ComparisonMap,
  ComparisonOperators,
  LogicalMap,
  LogicalOperators,
  newCombinedAssignmentToken,
  newToken,
  // Reserved,
  Token,
  TokenType,
} from "./token";

const digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function tokenize(sourceCode: string): Token[] {
  const ignoredCodes = new Set([13, 10, 9]);
  let lineNb = 1;

  const data = new TokenizerData(sourceCode);

  // Build each token until end of file
  while (!data.isEmpty()) {
    // How much do we need to look ahead?
    // Are there situations where we can't know form sure what type a token is until runtime?

    // Comments
    if (data.compare("//")) {
      while (data.src.shift()?.charCodeAt(0) != 13 && !data.isEmpty()) { /* empty */ }
      if (data.src[0]?.charCodeAt(0) == 10) {
        data.src.shift();
      }
      lineNb++;
    } else if (data.compare("/*")) {
      while (true) {
        if (data.src[0]?.charCodeAt(0) == 10) {
          lineNb++;
        }
        while (data.src.shift() != "*") { /* empty */ }
        if (data.src.shift() != "/") {
          break;
        }
      }
    }

    // Grouping
    else if (data.compare("(")) {
      data.addToken(data.src.shift(), TokenType.OpenParen);
    } else if (data.compare(")")) {
      data.addToken(data.src.shift(), TokenType.CloseParen);
    } else if (data.compare("{")) {
      data.addToken(data.src.shift(), TokenType.OpenCurly);
    } else if (data.compare("}")) {
      data.addToken(data.src.shift(), TokenType.CloseCurly);
    } else if (data.compare("[")) {
      data.addToken(data.src.shift(), TokenType.OpenBracket);
    } else if (data.compare("]")) {
      data.addToken(data.src.shift(), TokenType.CloseBracket);
    }
    // Function def
    else if (data.compare("=>")) {
      data.src.shift();
      data.src.shift();
      data.addToken("=>", TokenType.Arrow);
    }

    // End of statement
    // we might want to add end of line in here
    else if (data.compare("!")) {
      data.addToken(data.src.shift(), TokenType.Exclamation);
    } else if (data.compare("?")) {
      data.addToken(data.src.shift(), TokenType.Question);
    } else if (data.compare("¡")) {
      data.addToken(data.src.shift(), TokenType.InvertedExclamation);
    }
    // Literals
    // Numbers
    else if (data.compare(...digits)) {
      let number_ = "";
      while (!data.isEmpty() && data.compare(...digits)) {
        number_ += data.src.shift();
      }
      data.addToken(number_, TokenType.Number);
    }
    // Strings
    //TODO To have implicit strings is going to be very annoying
    else if (data.compare("'")) {
      data.src.shift();
      let string = "";
      while (!data.isEmpty() && !data.compare("'")) {
        string += data.src.shift();
      }
      data.src.shift();
      data.addToken(string, TokenType.String);
    } else if (data.compare('"')) {
      data.src.shift();
      let string = "";
      while (!data.isEmpty() && !data.compare('"')) {
        string += data.src.shift();
      }
      data.src.shift();
      data.addToken(string, TokenType.String);
    }
		// Unary operators
		else if (data.compare("++")) {
			const operator = "++";
			data.src = data.src.slice(operator.length);
			data.addToken(operator, TokenType.PlusPlus);
		} else if (data.compare("--")) {
			const operator = "--";
			data.src = data.src.slice(operator.length);
			data.addToken(operator, TokenType.PlusPlus);
		} else if (data.compare(";")) {
			data.addToken(data.src.shift(), TokenType.LogicalNot);
		} else if (data.compare("~")) {
			data.addToken(data.src.shift(), TokenType.BitwiseNot);
		}

    // Binary operators
    // Arithmetic
    else if (data.compare(...ArithmeticOperators)) {
      let operator = data.matchSymbol(...ArithmeticOperators);
      const type: TokenType = ArithmeticMap[operator];
      data.src = data.src.slice(operator.length);

      // Combined assignment
      if (data.compare("=")) {
        operator += data.src.shift();
        data.tokens.push(newCombinedAssignmentToken(operator, type));
      } else {
        data.addToken(operator, type);
      }
    }
    // Logical
    else if (data.compare(...LogicalOperators)) {
      let operator = data.matchSymbol(...LogicalOperators);
      const type: TokenType = LogicalMap[operator];
      data.src = data.src.slice(operator.length);

      // Combined assignment
      if (data.compare("=")) {
        operator += data.src.shift();
        data.tokens.push(newCombinedAssignmentToken(operator, type));
      } else {
        data.addToken(operator, type);
      }
    }
    // Bitwise
    else if (data.compare(...BitwiseOperators)) {
      let operator = data.matchSymbol(...BitwiseOperators);
      const type: TokenType = BitwiseMap[operator];
      data.src = data.src.slice(operator.length);

      // Combined assignment
      if (data.compare("=")) {
        operator += data.src.shift();
        data.tokens.push(newCombinedAssignmentToken(operator, type));
      } else {
        data.addToken(operator, type);
      }
    }
    // Comparison and assignment
    //! We write all '=' as weak equals even if it can be assignment. We'll have to deal with that later.
    else if (data.compare(...ComparisonOperators)) {
      const operator = data.matchSymbol(...ComparisonOperators);
      const type: TokenType = ComparisonMap[operator];
      data.src = data.src.slice(operator.length);
      data.addToken(operator, type);
    }
    // Symbols
    else if (data.compare(":")) {
      data.addToken(data.src.shift(), TokenType.Colon);
    } else if (data.compare(",")) {
      data.addToken(data.src.shift(), TokenType.Comma);
    } else if (data.compare(".")) {
      data.addToken(data.src.shift(), TokenType.Dot);
    } else if (data.compare(" ")) {
      let index = 0;
      while (data.compare(" ")) {
        data.src.shift();
        index++;
      }

      data.addToken(index.toString(), TokenType.WhiteSpace);
    } else if (data.src[0].charCodeAt(0) == 13) {
			lineNb++;
			console.log(lineNb);
			data.src.shift();

			if (data.src[0].charCodeAt(0) == 10) {
				data.src.shift();
			}

      data.addToken("\n", TokenType.LineBreak);
    }
    // Identifiers
    else if (data.isValidForIdentifier()) {
      let identifier = "";
      while (!data.isEmpty() && data.isValidForIdentifier()) {
        identifier += data.src.shift();
      }
      // Check for keywords
      // const type = Reserved[identifier] ?? TokenType.Identifier;
      data.addToken(identifier, TokenType.Identifier);
    } else {
      if (
        ignoredCodes.has(data.src[0].charCodeAt(0)) ||
        data.src[0].charCodeAt(0) >= 128
      ) {
        
        

        data.src.shift();
      } else {
        console.error(
          "Unrecognized character found in source:",
          data.src[0].charCodeAt(0),
          "at position",
          data.position
        );
        process.exit(1);
      }
    }
  }

  data.addToken("EOF", TokenType.EOF);
  return data.tokens;
}

// UTILS
class TokenizerData {
  public tokens: Array<Token>;
  public src: string[];
  private initialLength: number;

  constructor(sourceCode: string) {
    this.tokens = new Array<Token>();
    this.src = [...sourceCode];
    this.initialLength = this.src.length;
  }

  isEmpty() {
    return this.src.length === 0;
  }

  addToken(value = "", type: TokenType) {
    this.tokens.push(newToken(value, type));
  }

  /** Returns true if src starts with any of the symbols */
  compare(...symbols: string[]): boolean {
    for (const symbol of symbols) {
      if (this.compareString(symbol)) {
        return true;
      }
    }
    return false;
  }

  private compareString(string: string): boolean {
    // If our string is bigger than the rest of src, it cannot be inside src.
    if (string.length > this.src.length) {
      return false;
    }
    //TODO make an issue for this, it incorrectly changes it to use string.entries() which doesn't exist
    // eslint-disable-next-line unicorn/no-for-loop
    for (let index = 0; index < string.length; index++) {
      if (this.src[index] != string[index]) {
        return false;
      }
    }
    return true;
  }

  isValidForIdentifier(): boolean {
		if (this.src[0].charCodeAt(0) >= 128) {
			console.warn(
				"Weird character found, code:",
				this.src[0].charCodeAt(0),
			);
			return true;
		}
    return this.src[0].toLowerCase() != this.src[0].toUpperCase();
  }

  /** Returns the longest symbol that matches from the given list */
  matchSymbol(...symbols: string[]): string {
    const matched: string[] = [];
    for (const symbol of symbols) {
      if (this.compareString(symbol)) {
        matched.push(symbol);
      }
    }
    
    // eslint-disable-next-line unicorn/no-array-reduce
    return matched.reduce((a, b) => (a.length > b.length ? a : b));
  }

  public get position(): number {
    return this.initialLength - this.src.length;
  }
}
