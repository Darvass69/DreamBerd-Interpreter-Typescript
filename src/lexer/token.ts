import { isEmpty, isNil } from "lodash";
import { references } from "../parser/parser";
import { TokenChoice } from "../parser/branches/parserState";

// Represent tokens our language understands.
export enum TokenType {
	//~ Primitives
	Null,
	Undefined, //? Is undefined undefined?
	Boolean,
	Number,
	String, // '"' or "'" n times ... '"' or "'" n times, the same symbol on both sides
	ImplicitString, // Any string of characters. Last option after everything has been tried. (on request parsing?)
	Identifier, // Any string of characters separated by spaces, create a new interpretation each time.

	//~ Operators

	// Prefix
	LogicalNot, // ;
	BitwiseNot, // ~
	UnaryMinus, // - Negative a number

	// State
	PlusPlus, // ++
	MinusMinus, // --
	Previous, // previous
	Next, // next
	Current, // current

	// Logical
	LogicalOr, // ||
	LogicalAnd, // &&

	// Bitwise
	BitwiseOr, // |
	BitwiseXor, // **
	BitwiseAnd, // &

	// Equality
	Equals, // ==
	NotEqual, // ;=
	StrongEqual, // ===
	StrongNotEqual, // ;==
	StrongestEqual, // ====
	StrongestNotEqual, // ;===

	// Comparison
	Smaller, // <
	Greater, // >
	SmallerEqual, // <=
	GreaterEqual, // >=

	// Bit shift
	BitShiftLeft, // <<
	BitShiftRight, // >>
	BitShiftUnsignedLeft, // <<<
	BitShiftUnsignedRight, // >>>

	// Additive
	Add, // +
	Subtract, // -
	
	// Multiplicative
	Multiply, // *
	Divide, // /
	Modulo, // %

	// Exponent
	Exponent, // ^

	//~ Other
	// Assignment
	Assignment, // Don't forget combined assignment

	// Keywords
	Const,
	Var,
	
	Async, // async
	Function, // /^(f?u?n?c?t?i?o?n?) */ && !empty
	CommaDelimiter, // ',' and some amount of ' ' either side, only the total of spaces count
	Return, // return

	If, // if
	Else, // else

	When, // when

	Delete, // delete

	Reverse, // reverse

	Import, // import
	Export, // export

	Super, // super
	This, // this
	Class, // class or className
	New, // new

	// Punctuation
	Dot, // .
	Colon, // :
	// comma, // ,

	OpenBracket, // [
	CloseBracket, // ]
	OpenCurly, // {
	CloseCurly, // }
	OpenParen, // (
	CloseParen, // )

	Arrow, // =>

	// Spaces
	WhiteSpace, // " "
	LineBreak, // \n
	// tabs, // \t

	// End of statement
	EndOfStatement, // any number of '!' or '¡'
	// endOfStatementDebug, // like 'endOfStatement' but with any number of '?'

	// End of file
	FileDelimiter,
	EOF,

	//TODO
	_lifetime,
	_variableType,
}

const tokenTypeValues: TokenType[] = Object.keys(TokenType).filter((v) => !Number.isNaN(Number(v))).map(Number);

export type Token = {
	start: number,
	values: TokenValue[]
}

interface NoValueTokenType {
	// isMatching: boolean
}

export type TokenValue = {
	end: number
} &
//~ Primitives
( {type: TokenType.Null} & NoValueTokenType
| {type: TokenType.Undefined} & NoValueTokenType
| {type: TokenType.Boolean} & {value: "true" | "false" | "maybe"}
| {type: TokenType.Number} & {value: number}
| {type: TokenType.String} & {value: string}
| {type: TokenType.ImplicitString} & {value: string} // this might need to be more complicated. //to parse
| {type: TokenType.Identifier} & {value: string}
//~ Operators
// Prefix
| {type: TokenType.LogicalNot} & NoValueTokenType
| {type: TokenType.BitwiseNot} & NoValueTokenType
| {type: TokenType.UnaryMinus} & NoValueTokenType

// State
| {type: TokenType.PlusPlus} & NoValueTokenType
| {type: TokenType.MinusMinus} & NoValueTokenType
| {type: TokenType.Previous} & NoValueTokenType
| {type: TokenType.Next} & NoValueTokenType
| {type: TokenType.Current} & NoValueTokenType

// Logical
| {type: TokenType.LogicalOr} & NoValueTokenType
| {type: TokenType.LogicalAnd} & NoValueTokenType

// Bitwise
| {type: TokenType.BitwiseOr} & NoValueTokenType
| {type: TokenType.BitwiseXor} & NoValueTokenType
| {type: TokenType.BitwiseAnd} & NoValueTokenType

// Equality
| {type: TokenType.Equals} & NoValueTokenType
| {type: TokenType.NotEqual} & NoValueTokenType
| {type: TokenType.StrongEqual} & NoValueTokenType
| {type: TokenType.StrongNotEqual} & NoValueTokenType
| {type: TokenType.StrongestEqual} & NoValueTokenType
| {type: TokenType.StrongestNotEqual} & NoValueTokenType

// Comparison
| {type: TokenType.Smaller} & NoValueTokenType
| {type: TokenType.Greater} & NoValueTokenType
| {type: TokenType.SmallerEqual} & NoValueTokenType
| {type: TokenType.GreaterEqual} & NoValueTokenType

// Bit shift
| {type: TokenType.BitShiftLeft} & NoValueTokenType
| {type: TokenType.BitShiftRight} & NoValueTokenType
| {type: TokenType.BitShiftUnsignedLeft} & NoValueTokenType
| {type: TokenType.BitShiftUnsignedRight} & NoValueTokenType

// Arithmetic
| {type: TokenType.Add} & NoValueTokenType
| {type: TokenType.Subtract} & NoValueTokenType
| {type: TokenType.Multiply} & NoValueTokenType
| {type: TokenType.Divide} & NoValueTokenType
| {type: TokenType.Modulo} & NoValueTokenType
| {type: TokenType.Exponent} & NoValueTokenType

//~ Other
// Assignment
| {type: TokenType.Assignment} & {operator?: typeof CombinedAssignmentOperators[number]}

// Keywords
| {type: TokenType.Const} & NoValueTokenType
| {type: TokenType.Var} & NoValueTokenType

| {type: TokenType.Async} & NoValueTokenType
| {type: TokenType.Function} & NoValueTokenType
| {type: TokenType.CommaDelimiter} & {nbSpaces: number}
| {type: TokenType.Return} & NoValueTokenType

| {type: TokenType.If} & NoValueTokenType
| {type: TokenType.Else} & NoValueTokenType

| {type: TokenType.When} & NoValueTokenType

| {type: TokenType.Delete} & NoValueTokenType

| {type: TokenType.Reverse} & NoValueTokenType

| {type: TokenType.Import} & NoValueTokenType
| {type: TokenType.Export} & NoValueTokenType

| {type: TokenType.Super} & NoValueTokenType
| {type: TokenType.This} & NoValueTokenType
| {type: TokenType.Class} & NoValueTokenType
| {type: TokenType.New} & NoValueTokenType

// Punctuation
| {type: TokenType.Dot} & NoValueTokenType
| {type: TokenType.Colon} & NoValueTokenType
// | {type: TokenType.comma} & NoValueTokenType

| {type: TokenType.OpenBracket} & NoValueTokenType
| {type: TokenType.CloseBracket} & NoValueTokenType
| {type: TokenType.OpenCurly} & NoValueTokenType
| {type: TokenType.CloseCurly} & NoValueTokenType
| {type: TokenType.OpenParen} & NoValueTokenType
| {type: TokenType.CloseParen} & NoValueTokenType

| {type: TokenType.Arrow} & NoValueTokenType

// Spaces
| {type: TokenType.WhiteSpace} & {nbSpaces: number}
| {type: TokenType.LineBreak} & NoValueTokenType
// | {type: TokenType.tabs} & {nbTabs: number}

// End of statement
| {type: TokenType.EndOfStatement} & {priority: number, debug?: number}

// End of file
| {type: TokenType.FileDelimiter} & {file: string | false} //to parse
| {type: TokenType.EOF} & NoValueTokenType

// To do later
| {type: TokenType._lifetime} & {}
| {type: TokenType._variableType} & {}
);

export const LogicalOperators = [
	TokenType.LogicalOr, // ||
	TokenType.LogicalAnd, // &&
] as const;

export const BitwiseOperators = [
	TokenType.BitwiseOr, // |
	TokenType.BitwiseXor, // **
	TokenType.BitwiseAnd, // &
] as const;

export const EqualityOperators = [
	TokenType.Equals, // ==
	TokenType.NotEqual, // ;=
	TokenType.StrongEqual, // ===
	TokenType.StrongNotEqual, // ;==
	TokenType.StrongestEqual, // ====
	TokenType.StrongestNotEqual, // ;===
] as const;

export const ComparisonOperators = [
	TokenType.Smaller, // <
	TokenType.Greater, // >
	TokenType.SmallerEqual, // <=
	TokenType.GreaterEqual, // >=
] as const;

export const BitShiftOperators = [
	TokenType.BitShiftLeft, // <<
	TokenType.BitShiftRight, // >>
	TokenType.BitShiftUnsignedLeft, // <<<
	TokenType.BitShiftUnsignedRight, // >>>
] as const;

export const ArithmeticOperators = [
	TokenType.Add, // +
	TokenType.Subtract, // -
	TokenType.Multiply, // *
	TokenType.Divide, // /
	TokenType.Modulo, // %
	TokenType.Exponent, // ^
] as const;

export const CombinedAssignmentOperators = [
	...LogicalOperators,
	...BitwiseOperators,
	...BitShiftOperators,
	...ArithmeticOperators
] as const;

export const BinaryOperators = [
	...LogicalOperators,
	...BitwiseOperators,
	...EqualityOperators,
	...ComparisonOperators,
	...BitShiftOperators,
	...ArithmeticOperators
] as const;

export function TokenTypeListToString(tokenTypes: TokenType[]): string {
	return tokenTypes.map((type) => TokenType[type]).toString();
}

// export function TokenToString(token: Token | undefined) {
// 	if (token === undefined) {
// 		return "undefined";
// 	}
// }

export const constantPatternMap: {
  [key: string]: TokenType
} = {
  // Primitives
  "null": TokenType.Null,
  "undefined": TokenType.Undefined,
  "true": TokenType.Boolean, //Special case
  "false": TokenType.Boolean, //Special case
  "maybe": TokenType.Boolean, //Special case
  // Operators
  ";": TokenType.LogicalNot,
  "~": TokenType.BitwiseNot,
	// "-": TokenType.UnaryMinus,

  "++": TokenType.PlusPlus,
  "--": TokenType.MinusMinus,
  "previous": TokenType.Previous,
  "next": TokenType.Next,
  "current": TokenType.Current,

  "||": TokenType.LogicalOr,
  "&&": TokenType.LogicalAnd,

  "|": TokenType.BitwiseOr,
  "**": TokenType.BitwiseXor,
  "&": TokenType.BitwiseAnd,

  "==": TokenType.Equals,
  ";=": TokenType.NotEqual,
  "===": TokenType.StrongEqual,
  ";==": TokenType.StrongNotEqual,
  "====": TokenType.StrongestEqual,
  ";===": TokenType.StrongestNotEqual,

  "<": TokenType.Smaller,
  ">": TokenType.Greater,
  "<=": TokenType.SmallerEqual,
  ">=": TokenType.GreaterEqual,

  "<<": TokenType.BitShiftLeft,
  ">>": TokenType.BitShiftRight,
  "<<<": TokenType.BitShiftUnsignedLeft,
  ">>>": TokenType.BitShiftUnsignedRight,

  "+": TokenType.Add,
  "-": TokenType.Subtract, //Special case, same symbol as unaryMinus
  "*": TokenType.Multiply,
  "/": TokenType.Divide,
  "%": TokenType.Modulo,
  "^": TokenType.Exponent,
  // Other
  "const": TokenType.Const,
  "var": TokenType.Var,

  "async": TokenType.Async,
  "return": TokenType.Return,

  "if": TokenType.If,
  "else": TokenType.Else,

  "when": TokenType.When,

  "delete": TokenType.Delete,

  "reverse": TokenType.Reverse,

  "import": TokenType.Import,
  "export": TokenType.Export,

  "super": TokenType.Super,
  "this": TokenType.This,
  "class": TokenType.Class,
  "className": TokenType.Class,
  "new": TokenType.New,

  ".": TokenType.Dot,
  ":": TokenType.Colon,

  "[": TokenType.OpenBracket,
  "]": TokenType.CloseBracket,
  "{": TokenType.OpenCurly,
  "}": TokenType.CloseCurly,
  "(": TokenType.OpenParen,
  ")": TokenType.CloseParen,

  "=>": TokenType.Arrow,
	//Spaces
  "\n": TokenType.LineBreak,
  "\r\n": TokenType.LineBreak,
};

// function newToken(base: Omit<Token, "values">, values: TokenValue[]): Token {
// 	return {
// 		...base,
// 		values
// 	};
// }

export function getToken(startPosition: number, tokens: Token[]): Token | undefined {
	// Make sure we are still in the bound of the file
	if (!hasTokensLeft(startPosition, references.tokens)) {
		return {start: startPosition, values: [{type: TokenType.EOF, end: startPosition}]};
	}

	return tokens.find((token) => token.start === startPosition);
}

export function getChoiceAtPosition(startPosition: number, choices: TokenChoice[]): TokenChoice | undefined {
	if (hasChoicesLeft(startPosition, choices)) {
		return choices.find((choice) => choice.start === startPosition);
	}
}

export function hasChoicesLeft(position: number, choices: TokenChoice[]): boolean {
	return position < Math.max(...choices.map((v) => v.start));
}

/**
 * Find all the values from a token that that matches any of the given token types.
 */
export function getTokenValues(token: Token | undefined, types: TokenType[]): TokenValue[] {
	if (isNil(token) || isEmpty(types)) {
		return [];
	}

	return token.values.filter((value) => types.includes(value.type));
}

export function getTokenTypes(token: Token): TokenType[] {
	return [...new Set(token.values.map((value) => value.type))];
}

export function hasTokensLeft(position: number, tokenList: Token[]): boolean {
	return position < Math.max(...tokenList.map((v) => v.start));
}