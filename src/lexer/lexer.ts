import { CombinedAssignmentOperators, constantPatternMap, Token, TokenType, TokenValue } from "./token.ts";
import { UniqueQueue } from "./utils/uniqueQueue.ts";

const locale = {
  decimalSeparator: ".",
  // numberSeparator: ','
  replaceParenWithSpaces: false,
  currency: {
    before: "$",
    overrideDecimalSeparator: undefined,
    after: undefined,
  },
};

const spaceCharacters = new Set([
  " ",
  "\r",
  "\n",
]);

type Pattern = (
  source: SourceData,
  initialPosition: number,
) => TokenValue[] | null;

/**
 * The tokenizer works like this:
 * Get the next position
 * Iterate and execute all token patterns
 *    if the patterns doesn't fail, it adds the token info to the current token and add the end position to the list of position
 * Get next position
 *
 * do we do something like the parser with multiple branches?
 */
export class Tokenizer {
  public static tokenPatterns: Pattern[] = [
    parseConstantToken,
    parseNumberToken,
    parseStringToken,
    parseIdentifierToken,
    parseFunctionToken,
    parseCommaDelimiterToken,
    parseAssignmentToken,
    parseEndOfStatementToken,
    parseSpaceToken,
    parseEOFToken,
  ];

  /** Positions we have not tokenized yet
   * (each time a token is parsed, we take note of its end position to know what position is left to be parsed)
   */
  private positions: UniqueQueue<number> = new UniqueQueue();
  private temporaryPositions: number[] = [];
  private tokens: Token[] = [];

  constructor(private sourceCode: string) {
    this.positions.push(0);
  }

  public tokenize(): Token[] {
    while (this.positions.peek() < this.sourceCode.length) {
      const token = this.nexToken(this.positions.pop() as number);
      if (token !== null) {
        this.tokens.push(token);
      }
    }

    const token = this.nexToken(this.positions.pop() as number);
    if (token !== null) {
      this.tokens.push(token);
    }

    //TODO clean up identifiers before returning. We want to make sure all identifiers start and end somewhere that isn't just identifiers.
    //TODO don't create identifiers with only "!" and similar.
    return this.tokens;
  }

  public nexToken(position: number): Token | null {
    position = this.ignoreComments(new SourceData(this.sourceCode), position);

    const values: TokenValue[] = [];
    Tokenizer.tokenPatterns.flatMap(
      (pattern) =>
        pattern(
          new SourceData(this.sourceCode),
          position,
        ),
    ).forEach(
      (value) => {
        if (value !== null) {
          this.addEndPosition(value.end);
          values.push(value);
        }
      },
    );

    if (values.length === 0) {
      return null;
    }

    this.submitEndPositions();
    return { start: position, values };
  }

  private addEndPosition(position: number) {
    this.temporaryPositions.push(position);
  }

  private submitEndPositions() {
    this.positions.push(...this.temporaryPositions);
  }

  private ignoreComments(
    source: SourceData,
    position: number,
  ): number {
    if (source.get(position) === "/") {
      if (source.get(position + 1) === "/") {
        skipLineComment();
        return position;
      } else if (source.get(position + 1) === "*") {
        skipInlineComment();
        return position;
      }
    }
    return position;

    function skipLineComment() {
      while (source.get(position) !== "" && source.get(position) !== "\n") {
        position++;
      }
    }

    function skipInlineComment() {
      while (source.get(position) !== "" && source.get(position) !== "*" && source.get(position + 1) !== "/") {
        position++;
      }
    }
  }
}

class SourceData {
  constructor(private sourceCode: string) {}

  public get(position: number): "" | string {
    if (position < this.sourceCode.length) {
      if (locale.replaceParenWithSpaces && (this.sourceCode[position] === "(" || this.sourceCode[position] === ")")) {
        return " ";
      }
      return this.sourceCode[position];
    }
    return "";
  }

  public regexSingle(regex: RegExp): string | null {
    const result = regex.exec(this.sourceCode);
    if (result !== null) {
      return result[0];
    }
    return null;
  }
}

/* ---------------------------- Parsing functions --------------------------- */
function parseConstantToken(
  source: SourceData,
  initialPosition: number,
): TokenValue[] | null {
  const result: TokenValue[] = [];

  let position: number;
  let matched: boolean;
  for (const constant in constantPatternMap) {
    position = initialPosition;
    matched = true;

    for (const char of constant) {
      if (source.get(position) !== char) {
        matched = false;
        break;
      }
      position++;
    }

    if (matched) {
      switch (constant) {
        // special case for booleans
        case "true":
        case "false":
        case "maybe": {
          result.push({ type: TokenType.Boolean, value: constant, end: position });
          break;
        }
        case "-": {
          result.push(
            { type: TokenType.UnaryMinus, end: position },
            { type: constantPatternMap[constant] as TokenType.Add, end: position },
          );
          break;
        }
        default: {
          result.push({ type: constantPatternMap[constant] as TokenType.Add, end: position });
        }
      }
    }
  }
  return result;
}

function parseNumberToken(
  source: SourceData,
  position: number,
): TokenValue[] | null {
  function getDigits() {
    let digits = "";
    while (source.get(position) !== "") {
      if ("0" <= source.get(position) && source.get(position) <= "9") {
        digits += source.get(position);
      } else {
        break;
      }
      position++;
    }
    return digits;
  }

  const integerPart = getDigits();
  const isFloat = source.get(position) === locale.decimalSeparator;
  let decimalPart = "";
  if (isFloat) {
    position += locale.decimalSeparator.length;
    decimalPart = isFloat ? getDigits() : "";
  }

  const value = isFloat ? Number.parseFloat(integerPart + locale.decimalSeparator + decimalPart) : Number.parseInt(integerPart);

  if (Number.isNaN(value)) {
    return null;
  }
  return [{ type: TokenType.Number, value, end: position }];
}

function parseStringToken(
  source: SourceData,
  position: number,
): TokenValue[] | null {
  //TODO string interpolation
  let value: string = "";

  // Parse the start of the string
  let stringEndDelimiter = "";
  while (source.get(position) === "'" || source.get(position) === '"') {
    stringEndDelimiter = source.get(position) + stringEndDelimiter; // Inverting the delimiter to match the end.
    position++;
  }

  // parse the string's content
  while (source.get(position) !== "") {
    // End of string check
    if (source.get(position) === stringEndDelimiter[0]) {
      let offset: number = 0;
      let endReached = true;
      for (const char of stringEndDelimiter) {
        if (source.get(position + offset) !== char) {
          endReached = false;
          break;
        }
        offset++;
      }

      if (endReached) {
        return [{ type: TokenType.String, value, end: position + offset }];
      }
    }
    value += source.get(position);
    position++;
  }
  return null;
}

function parseIdentifierToken(
  source: SourceData,
  position: number,
): TokenValue[] | null {
  const values: TokenValue[] = [];
  let currentValue: string = "";

  while (source.get(position) !== "" && !spaceCharacters.has(source.get(position))) {
    currentValue += source.get(position);
    position++;

    values.push({ type: TokenType.Identifier, value: currentValue, end: position });
  }

  if (values.length === 0) {
    return null;
  }
  return values;
}

function parseFunctionToken(
  source: SourceData,
  position: number,
): TokenValue[] | null {
  // the function keyword is any letter from function in order.
  // We also add a space after, but we'll need to remove it in the end position.
  const functionRegex = /(f?u?n?c?t?i?o?n?) /y;
  functionRegex.lastIndex = position;
  const keyword = source.regexSingle(functionRegex);

  if (keyword === null || keyword.trim() === "") {
    return null;
  }
  return [{ type: TokenType.Function, end: functionRegex.lastIndex - 1 }];
}

function parseCommaDelimiterToken(
  source: SourceData,
  position: number,
): TokenValue[] | null {
  let nbSpaces: number = 0;

  const spaceBefore = (parseSpaceToken(source, position) ?? [null])[0] as TokenValue & { type: TokenType.WhiteSpace } | null;
  if (spaceBefore) {
    nbSpaces += spaceBefore.nbSpaces;
    position = spaceBefore.end;
  }

  if (source.get(position) !== ",") {
    return null;
  }
  position++;

  const spaceAfter = (parseSpaceToken(source, position) ?? [null])[0] as TokenValue & { type: TokenType.WhiteSpace } | null;
  if (spaceAfter) {
    nbSpaces += spaceAfter.nbSpaces;
    position = spaceAfter.end;
  }

  return [{ type: TokenType.CommaDelimiter, nbSpaces, end: position }];
}

function parseAssignmentToken(
  source: SourceData,
  initialPosition: number,
): TokenValue[] | null {
  let position: number;

  const operatorSymbols = Object.keys(constantPatternMap).filter((key) => CombinedAssignmentOperators.includes(constantPatternMap[key] as any));
  let matched: boolean;
  for (const operatorSymbol in operatorSymbols) {
    position = initialPosition;
    matched = true;

    for (const char of operatorSymbol) {
      if (source.get(position) !== char) {
        matched = false;
        break;
      }
      position++;
    }

    if (matched) {
      // check the '=' after the operator
      if (source.get(position) === "=") {
        position++;
        return [{ type: TokenType.Assignment, operator: constantPatternMap[operatorSymbol] as any, end: position }];
      }
      break;
    }
  }

  // We don't have an operator
  if (source.get(initialPosition) === "=") {
    return [{ type: TokenType.Assignment, end: initialPosition + 1 }];
  }

  return null;
}

function parseEndOfStatementToken(
  source: SourceData,
  initialPosition: number,
): TokenValue[] | null {
  // [TokenType.endOfStatement]: {priority: number, debug?: number}, //to parse
  // '!' or '¡' or '?'
  let position: number = initialPosition;
  let priority: number = 0;
  let debug: number = 0;

  while (source.get(position) !== "") {
    if (source.get(position) === "!") {
      priority++;
    } else if (source.get(position) === "¡") {
      priority--;
    } else if (source.get(position) === "?") {
      debug++;
    } else if (!(source.get(position) === "\n" || source.get(position) === "\r")) {
      break;
    }
    position++;
  }

  if (position === initialPosition) {
    return null;
  }
  return [{ type: TokenType.EndOfStatement, priority, ...(debug > 0 ? { debug } : {}), end: position }];
}

function parseSpaceToken(
  source: SourceData,
  position: number,
): TokenValue[] | null {
  let nbSpaces: number = 0;

  while (source.get(position) !== "") {
    if (source.get(position) === " ") {
      nbSpaces++;
    } else if (source.get(position) === "\t") {
      nbSpaces += 3;
    } else {
      break;
    }
    position++;
  }

  if (nbSpaces === 0) {
    return null;
  }
  return [{ type: TokenType.WhiteSpace, nbSpaces, end: position }];
}

function parseEOFToken(
  source: SourceData,
  initialPosition: number,
): TokenValue[] | null {
  if (source.get(initialPosition) !== "") {
    return null;
  }
  return [{ type: TokenType.EOF, end: initialPosition }];
}
