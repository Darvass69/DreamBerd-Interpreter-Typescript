import {
  // ArithmeticMap,
  // ArithmeticOperators,
  // BitwiseMap,
  // BitwiseOperators,
  // ComparisonMap,
  // ComparisonOperators,
  // LogicalMap,
  // LogicalOperators,
  // newCombinedAssignmentToken,
  // newToken,
  // Reserved,
  Token,
  TokenStructs,
  TokenType,
} from "./token";
import { UniqueQueue } from "./utils/uniqueQueue";

// const digits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

// /**
//  * Transforms our source code into tokens that are easier to manage later.
//  * @param sourceCode 
//  * @returns 
//  */

// export function tokenize(sourceCode: string): Token[] {
//   const ignoredCodes = new Set([13, 10, 9]);
//   let lineNb = 1;

//   const data = new TokenizerData(sourceCode);

//   // Build each token until end of file
//   while (!data.isEmpty()) {
//     // How much do we need to look ahead?
//     // Are there situations where we can't know form sure what type a token is until runtime?

//     // Comments
//     if (data.compare("//")) {
//       while (data.src.shift()?.charCodeAt(0) != 13 && !data.isEmpty()) { /* empty */ }
//       if (data.src[0]?.charCodeAt(0) == 10) {
//         data.src.shift();
//       }
//       lineNb++;
//     } else if (data.compare("/*")) {
//       while (true) {
//         if (data.src[0]?.charCodeAt(0) == 10) {
//           lineNb++;
//         }
//         while (data.src.shift() != "*") { /* empty */ }
//         if (data.src.shift() != "/") {
//           break;
//         }
//       }
//     }

//     // Grouping
//     else if (data.compare("(")) {
//       data.addToken(data.src.shift(), TokenType.OpenParen);
//     } else if (data.compare(")")) {
//       data.addToken(data.src.shift(), TokenType.CloseParen);
//     } else if (data.compare("{")) {
//       data.addToken(data.src.shift(), TokenType.OpenCurly);
//     } else if (data.compare("}")) {
//       data.addToken(data.src.shift(), TokenType.CloseCurly);
//     } else if (data.compare("[")) {
//       data.addToken(data.src.shift(), TokenType.OpenBracket);
//     } else if (data.compare("]")) {
//       data.addToken(data.src.shift(), TokenType.CloseBracket);
//     }
//     // Function def
//     else if (data.compare("=>")) {
//       data.src.shift();
//       data.src.shift();
//       data.addToken("=>", TokenType.Arrow);
//     }

//     // End of statement
//     // we might want to add end of line in here
//     else if (data.compare("!")) {
//       data.addToken(data.src.shift(), TokenType.Exclamation);
//     } else if (data.compare("?")) {
//       data.addToken(data.src.shift(), TokenType.Question);
//     } else if (data.compare("¡")) {
//       data.addToken(data.src.shift(), TokenType.InvertedExclamation);
//     }
//     // Literals
//     // Numbers
//     else if (data.compare(...digits)) {
//       let number_ = "";
//       while (!data.isEmpty() && data.compare(...digits)) {
//         number_ += data.src.shift();
//       }
//       data.addToken(number_, TokenType.Number);
//     }
//     // Strings
//     //TODO To have implicit strings is going to be very annoying
//     else if (data.compare("'")) {
//       data.src.shift();
//       let string = "";
//       while (!data.isEmpty() && !data.compare("'")) {
//         string += data.src.shift();
//       }
//       data.src.shift();
//       data.addToken(string, TokenType.String);
//     } else if (data.compare('"')) {
//       data.src.shift();
//       let string = "";
//       while (!data.isEmpty() && !data.compare('"')) {
//         string += data.src.shift();
//       }
//       data.src.shift();
//       data.addToken(string, TokenType.String);
//     }
// 		// Unary operators
// 		else if (data.compare("++")) {
// 			const operator = "++";
// 			data.src = data.src.slice(operator.length);
// 			data.addToken(operator, TokenType.PlusPlus);
// 		} else if (data.compare("--")) {
// 			const operator = "--";
// 			data.src = data.src.slice(operator.length);
// 			data.addToken(operator, TokenType.PlusPlus);
// 		} else if (data.compare(";")) {
// 			data.addToken(data.src.shift(), TokenType.LogicalNot);
// 		} else if (data.compare("~")) {
// 			data.addToken(data.src.shift(), TokenType.BitwiseNot);
// 		}

//     // Binary operators
//     // Arithmetic
//     else if (data.compare(...ArithmeticOperators)) {
//       let operator = data.matchSymbol(...ArithmeticOperators);
//       const type: TokenType = ArithmeticMap[operator];
//       data.src = data.src.slice(operator.length);

//       // Combined assignment
//       if (data.compare("=")) {
//         operator += data.src.shift();
//         data.tokens.push(newCombinedAssignmentToken(operator, type));
//       } else {
//         data.addToken(operator, type);
//       }
//     }
//     // Logical
//     else if (data.compare(...LogicalOperators)) {
//       let operator = data.matchSymbol(...LogicalOperators);
//       const type: TokenType = LogicalMap[operator];
//       data.src = data.src.slice(operator.length);

//       // Combined assignment
//       if (data.compare("=")) {
//         operator += data.src.shift();
//         data.tokens.push(newCombinedAssignmentToken(operator, type));
//       } else {
//         data.addToken(operator, type);
//       }
//     }
//     // Bitwise
//     else if (data.compare(...BitwiseOperators)) {
//       let operator = data.matchSymbol(...BitwiseOperators);
//       const type: TokenType = BitwiseMap[operator];
//       data.src = data.src.slice(operator.length);

//       // Combined assignment
//       if (data.compare("=")) {
//         operator += data.src.shift();
//         data.tokens.push(newCombinedAssignmentToken(operator, type));
//       } else {
//         data.addToken(operator, type);
//       }
//     }
//     // Comparison and assignment
//     //! We write all '=' as weak equals even if it can be assignment. We'll have to deal with that later.
//     else if (data.compare(...ComparisonOperators)) {
//       const operator = data.matchSymbol(...ComparisonOperators);
//       const type: TokenType = ComparisonMap[operator];
//       data.src = data.src.slice(operator.length);
//       data.addToken(operator, type);
//     }
//     // Symbols
//     else if (data.compare(":")) {
//       data.addToken(data.src.shift(), TokenType.Colon);
//     } else if (data.compare(",")) {
//       data.addToken(data.src.shift(), TokenType.Comma);
//     } else if (data.compare(".")) {
//       data.addToken(data.src.shift(), TokenType.Dot);
//     } else if (data.compare(" ")) {
//       let value = "";
//       while (data.compare(" ")) {
//         value += (data.src.shift());
//       }

//       data.addToken(value, TokenType.WhiteSpace);
//     } else if (data.src[0].charCodeAt(0) == 13) {
// 			lineNb++;
// 			console.log(lineNb);
// 			data.src.shift();

// 			if (data.src[0].charCodeAt(0) == 10) {
// 				data.src.shift();
// 			}

//       data.addToken("\n", TokenType.LineBreak);
//     }
//     // Identifiers
//     else if (data.isValidForIdentifier()) {
//       let identifier = "";
//       while (!data.isEmpty() && data.isValidForIdentifier()) {
//         identifier += data.src.shift();
//       }
//       // Check for keywords
//       // const type = Reserved[identifier] ?? TokenType.Identifier;
//       data.addToken(identifier, TokenType.Identifier);
//     } else {
//       if (
//         ignoredCodes.has(data.src[0].charCodeAt(0)) ||
//         data.src[0].charCodeAt(0) >= 128
//       ) {
        
        

//         data.src.shift();
//       } else {
//         console.error(
//           "Unrecognized character found in source:",
//           data.src[0].charCodeAt(0),
//           "at position",
//           data.position
//         );
//         process.exit(1);
//       }
//     }
//   }

//   data.addToken("EOF", TokenType.EOF);
//   return data.tokens;
// }

// // UTILS
// class TokenizerData {
//   public tokens: Array<Token>;
//   public src: string[];
//   private initialLength: number;

//   constructor(sourceCode: string) {
//     this.tokens = new Array<Token>();
//     this.src = [...sourceCode];
//     this.initialLength = this.src.length;
//   }

//   isEmpty() {
//     return this.src.length === 0;
//   }

//   addToken(value = "", type: TokenType) {
//     this.tokens.push(newToken(value, type));
//   }

//   /** Returns true if src starts with any of the symbols */
//   compare(...symbols: string[]): boolean {
//     for (const symbol of symbols) {
//       if (this.compareString(symbol)) {
//         return true;
//       }
//     }
//     return false;
//   }

//   private compareString(string: string): boolean {
//     // If our string is bigger than the rest of src, it cannot be inside src.
//     if (string.length > this.src.length) {
//       return false;
//     }
//     //TODO make an issue for this, it incorrectly changes it to use string.entries() which doesn't exist
//     // eslint-disable-next-line unicorn/no-for-loop
//     for (let index = 0; index < string.length; index++) {
//       if (this.src[index] != string[index]) {
//         return false;
//       }
//     }
//     return true;
//   }

//   isValidForIdentifier(): boolean {
// 		if (this.src[0].charCodeAt(0) >= 128) {
// 			console.warn(
// 				"Weird character found, code:",
// 				this.src[0].charCodeAt(0),
// 			);
// 			return true;
// 		}
//     return this.src[0].toLowerCase() != this.src[0].toUpperCase();
//   }

//   /** Returns the longest symbol that matches from the given list */
//   matchSymbol(...symbols: string[]): string {
//     const matched: string[] = [];
//     for (const symbol of symbols) {
//       if (this.compareString(symbol)) {
//         matched.push(symbol);
//       }
//     }
    
//     // eslint-disable-next-line unicorn/no-array-reduce
//     return matched.reduce((a, b) => (a.length > b.length ? a : b));
//   }

//   public get position(): number {
//     return this.initialLength - this.src.length;
//   }
// }



type TokenResult = {[K in TokenType]: [K, TokenStructs<K>]}[TokenType] | undefined;
type Pattern = (
  source: SourceData,
  initialPosition: number,
  addEndPosition: (position: number)=>void
) => TokenResult[] | null;

/**
 * The tokenizer works like this:
 * Get the next position
 * Iterate and execute all token patterns
 *    if the patterns doesn't fail, it adds the token info to the current token and add the end position to the list of position
 * Get next position
 * 
 * do we do something like the parser with multiple branches?
 */
class Tokenizer {
  public static tokenPatterns: Pattern[] = [];

  /** Positions we have not tokenized yet 
   * (each time a token is parsed, we take note of its end position to know what position is left to be parsed)
  */
  private positions: UniqueQueue<number> = new UniqueQueue();
  private tokens: Token[] = [];

  constructor(private sourceCode: string){}

  public tokenize(): Token[] {
    while (this.positions.peek() < this.sourceCode.length) {
      this.tokens.push(this.nexToken(this.positions.pop() as number));
    }

    return this.tokens;
  }

  public nexToken(position: number): Token {
    const token: Token = {
      start: position,
    };

    Tokenizer.tokenPatterns.flatMap((pattern) => pattern(
        new SourceData(this.sourceCode),
        position,
        this.addEndPosition.bind(this)
      )
    ).forEach((tokenResult) => {
      if (tokenResult) {
        token[tokenResult[0]] = tokenResult[1];
      }
    });

    return token;
  }

  private addEndPosition(position: number) {
    this.positions.push(position);
  }
}

class SourceData {
  constructor(private sourceCode: string){}

  public get(position: number): "" | string {
    if (position < this.sourceCode.length) {
      return this.sourceCode[position];
    }
    return "";
  }
}

// Pattern for all constant tokens (always the exact same string)

// A token is a collection of properties from multiple token types
// token type is the different ways a token can exist.
// a pattern match source code to a type of token and extract the relevant info into trhe current token.

// This means that for each unique pattern, it creates 1 (or more?) type of token.

// So to define a patternm, we need to define its token types


const constantPatternMap: {
  [key: string]: TokenType
} = {
  // Primitives
  "null": TokenType.null,
  "undefined": TokenType.undefined,
  "true": TokenType.boolean, //Special case
  "false": TokenType.boolean, //Special case
  "maybe": TokenType.boolean, //Special case
  // Operators
  ";": TokenType.logicalNot,
  "~": TokenType.bitwiseNot,
  "-": TokenType.unaryMinus,

  "++": TokenType.plusPlus,
  "--": TokenType.minusMinus,
  "previous": TokenType.previous,
  "next": TokenType.next,
  "current": TokenType.current,

  "||": TokenType.logicalOr,
  "&&": TokenType.logicalAnd,

  "|": TokenType.bitwiseOr,
  "**": TokenType.bitwiseXor,
  "&": TokenType.bitwiseAnd,

  "==": TokenType.equals,
  ";=": TokenType.notEqual,
  "===": TokenType.strongEqual,
  ";==": TokenType.strongNotEqual,
  "====": TokenType.strongestEqual,
  ";===": TokenType.strongestNotEqual,

  "<": TokenType.smaller,
  ">": TokenType.greater,
  "<=": TokenType.smallerEqual,
  ">=": TokenType.greaterEqual,

  "<<": TokenType.bitShiftLeft,
  ">>": TokenType.bitShiftRight,
  "<<<": TokenType.bitShiftUnsignedLeft,
  ">>>": TokenType.bitShiftUnsignedRight,

  "+": TokenType.add,
  "-": TokenType.subtract,
  "*": TokenType.multiply,
  "/": TokenType.divide,
  "%": TokenType.modulo,
  "^": TokenType.exponent,
  // Other
  "const": TokenType.const,
  "var": TokenType.var,

  "async": TokenType.async,
  "return": TokenType.return,

  "if": TokenType.if,
  "else": TokenType.else,

  "when": TokenType.when,

  "delete": TokenType.delete,

  "reverse": TokenType.reverse,

  "import": TokenType.import,
  "export": TokenType.export,

  "super": TokenType.super,
  "this": TokenType.this,

  ".": TokenType.dot,
  ":": TokenType.colon,

  "[": TokenType.openBracket,
  "]": TokenType.closeBracket,
  "{": TokenType.openCurly,
  "}": TokenType.closeCurly,
  "(": TokenType.openParen,
  ")": TokenType.closeParen,

  "=>": TokenType.arrow,
}

Tokenizer.tokenPatterns.push(function parseConstantToken(
  source: SourceData,
  initialPosition: number,
  addEndPosition: (position: number)=>void
): TokenResult[] | null {
  const result: TokenResult[] = [];

  let matched: boolean;
  let position: number;
  for (const constant in constantPatternMap) {
    matched = true;
    position = initialPosition;
    
    for (const char of constant) {
      if (source.get(position) != char) {
        matched = false;
        break;
      }
      position++;
    }

    if (matched) {
      addEndPosition(position);
      switch (constant) {
        // special case for booleans
        case "true":
        case "false":
        case "maybe": {
          result.push([TokenType.boolean, {value: constant, end: position}]);
          break;
        }
        default: {
          result.push([constantPatternMap[constant] as TokenType.add, {isMatching: true, end: position}]);
        }
      }
    }
  }
  return result;
});
