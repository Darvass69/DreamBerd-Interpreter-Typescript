// Represent tokens our language understands.
export enum TokenType {
	//~ Primitives
	null,
	undefined, //? Is undefined undefined?
	boolean,
	number,
	string, // '"' or "'" n times ... '"' or "'" n times, the same symbol on both sides
	implicitString, // Any string of characters. Last option after everything has been tried. (on request parsing?)
	identifier, // Any string of characters separated by spaces, create a new interpretation each time.

	//~ Operators

	// Prefix
	logicalNot, // ;
	bitwiseNot, // ~
	unaryMinus, // - Negative a number

	// State
	plusPlus, // ++
	minusMinus, // --
	previous, // previous
	next, // next
	current, // current

	// Logical
	logicalOr, // ||
	logicalAnd, // &&

	// Bitwise
	bitwiseOr, // |
	bitwiseXor, // **
	bitwiseAnd, // &

	// Equality
	equals, // ==
	notEqual, // ;=
	strongEqual, // ===
	strongNotEqual, // ;==
	strongestEqual, // ====
	strongestNotEqual, // ;===

	// Comparison
	smaller, // <
	greater, // >
	smallerEqual, // <=
	greaterEqual, // >=

	// Bit shift
	bitShiftLeft, // <<
	bitShiftRight, // >>
	bitShiftUnsignedLeft, // <<<
	bitShiftUnsignedRight, // >>>

	// Additive
	add, // +
	subtract, // -
	
	// Multiplicative
	multiply, // *
	divide, // /
	modulo, // %

	// Exponent
	exponent, // ^

	//~ Other
	// Assignment
	assignment, // Don't forget combined assignment

	// Keywords
	const,
	var,
	
	async, // async
	function, // /^(f?u?n?c?t?i?o?n?) */ && !empty
	commaDelimiter, // ',' and some amount of ' ' either side, only the total of spaces count
	return, // return

	if, // if
	else, // else

	when, // when

	delete, // delete

	reverse, // reverse

	import, // import
	export, // export

	super, // super
	this, // this

	// Punctuation
	dot, // .
	colon, // :
	// comma, // ,

	openBracket, // [
	closeBracket, // ]
	openCurly, // {
	closeCurly, // }
	openParen, // (
	closeParen, // )

	arrow, // =>

	// Spaces
	whiteSpace, // " "
	lineBreak, // \n
	tabs, // \t

	// End of statement
	endOfStatement, // any number of '!' or '¡'
	// endOfStatementDebug, // like 'endOfStatement' but with any number of '?'

	// End of file
	fileDelimiter,
	EOF,

	//TODO
	_lifetime,
	_variableType,
}


interface TokenBaseStruct {
  start: number
}

interface TokenTypeBaseStruct {
  end: number
}

interface NoValueTokenType {
	isMatching: boolean
}

export type TokenStructs<K extends TokenType> = {
	//~ Primitives
	[TokenType.null]: NoValueTokenType,
	[TokenType.undefined]: NoValueTokenType,
	[TokenType.boolean]: {value: "true" | "false" | "maybe"},
	[TokenType.number]: {value: number}, //to parse
	[TokenType.string]: {value: string}, //to parse
	[TokenType.implicitString]: {value: string}, // this might need to be more complicated. //to parse
	[TokenType.identifier]: {value: string}, //to parse

	//~ Operators

	// Prefix
	[TokenType.logicalNot]: NoValueTokenType,
	[TokenType.bitwiseNot]: NoValueTokenType,
	[TokenType.unaryMinus]: NoValueTokenType,

	// State
	[TokenType.plusPlus]: NoValueTokenType,
	[TokenType.minusMinus]: NoValueTokenType,
	[TokenType.previous]: NoValueTokenType,
	[TokenType.next]: NoValueTokenType,
	[TokenType.current]: NoValueTokenType,

	// Logical
	[TokenType.logicalOr]: NoValueTokenType,
	[TokenType.logicalAnd]: NoValueTokenType,

	// Bitwise
	[TokenType.bitwiseOr]: NoValueTokenType,
	[TokenType.bitwiseXor]: NoValueTokenType,
	[TokenType.bitwiseAnd]: NoValueTokenType,

	// Equality
	[TokenType.equals]: NoValueTokenType,
	[TokenType.notEqual]: NoValueTokenType,
	[TokenType.strongEqual]: NoValueTokenType,
	[TokenType.strongNotEqual]: NoValueTokenType,
	[TokenType.strongestEqual]: NoValueTokenType,
	[TokenType.strongestNotEqual]: NoValueTokenType,

	// Comparison
	[TokenType.smaller]: NoValueTokenType,
	[TokenType.greater]: NoValueTokenType,
	[TokenType.smallerEqual]: NoValueTokenType,
	[TokenType.greaterEqual]: NoValueTokenType,

	// Bit shift
	[TokenType.bitShiftLeft]: NoValueTokenType,
	[TokenType.bitShiftRight]: NoValueTokenType,
	[TokenType.bitShiftUnsignedLeft]: NoValueTokenType,
	[TokenType.bitShiftUnsignedRight]: NoValueTokenType,

	// Arithmetic
	[TokenType.add]: NoValueTokenType,
	[TokenType.subtract]: NoValueTokenType,
	[TokenType.multiply]: NoValueTokenType,
	[TokenType.divide]: NoValueTokenType,
	[TokenType.modulo]: NoValueTokenType,
	[TokenType.exponent]: NoValueTokenType,

	//~ Other
	// Assignment
	[TokenType.assignment]: {operator: keyof typeof BinaryOperators | "none"}, //!type doesn't work!!! operator is for combined assignment

	// Keywords
	[TokenType.const]: NoValueTokenType,
	[TokenType.var]: NoValueTokenType,

	[TokenType.async]: NoValueTokenType,
	[TokenType.function]: NoValueTokenType, //to parse
	[TokenType.commaDelimiter]: {nbSpaces: number}, //to parse
	[TokenType.return]: NoValueTokenType,

	[TokenType.if]: NoValueTokenType,
	[TokenType.else]: NoValueTokenType,

	[TokenType.when]: NoValueTokenType,

	[TokenType.delete]: NoValueTokenType,

	[TokenType.reverse]: NoValueTokenType,

	[TokenType.import]: NoValueTokenType,
	[TokenType.export]: NoValueTokenType,

	[TokenType.super]: NoValueTokenType,
	[TokenType.this]: NoValueTokenType,

	// Punctuation
	[TokenType.dot]: NoValueTokenType,
	[TokenType.colon]: NoValueTokenType,
	// [TokenType.comma]: NoValueTokenType,

	[TokenType.openBracket]: NoValueTokenType,
	[TokenType.closeBracket]: NoValueTokenType,
	[TokenType.openCurly]: NoValueTokenType,
	[TokenType.closeCurly]: NoValueTokenType,
	[TokenType.openParen]: NoValueTokenType,
	[TokenType.closeParen]: NoValueTokenType,

	[TokenType.arrow]: NoValueTokenType,

	// Spaces
	[TokenType.whiteSpace]: {nbSpaces: number}, //to parse
	[TokenType.lineBreak]: NoValueTokenType, //to parse
	[TokenType.tabs]: {nbTabs: number}, //to parse

	// End of statement
	[TokenType.endOfStatement]: {priority: number, debug?: number}, //to parse

	// End of file
	[TokenType.fileDelimiter]: {file: string | false} //to parse
	[TokenType.EOF]: NoValueTokenType, //to parse

	// To do later
	[TokenType._lifetime]: {},
	[TokenType._variableType]: {}
}[K] & TokenTypeBaseStruct;

export type Token = TokenBaseStruct & {
  -readonly [K in keyof typeof TokenType]?: TokenStructs<typeof TokenType[K]>;
};

export const LogicalOperators = [
	TokenType.logicalOr, // ||
	TokenType.logicalAnd, // &&
]

export const BitwiseOperators = [
	TokenType.bitwiseOr, // |
	TokenType.bitwiseXor, // **
	TokenType.bitwiseAnd, // &
]

export const EqualityOperators = [
	TokenType.equals, // ==
	TokenType.notEqual, // ;=
	TokenType.strongEqual, // ===
	TokenType.strongNotEqual, // ;==
	TokenType.strongestEqual, // ====
	TokenType.strongestNotEqual, // ;===
]

export const ComparisonOperators = [
	TokenType.smaller, // <
	TokenType.greater, // >
	TokenType.smallerEqual, // <=
	TokenType.greaterEqual, // >=
]

export const BitShiftOperators =[
	TokenType.bitShiftLeft, // <<
	TokenType.bitShiftRight, // >>
	TokenType.bitShiftUnsignedLeft, // <<<
	TokenType.bitShiftUnsignedRight, // >>>
]

export const ArithmeticOperators = [
	TokenType.add, // +
	TokenType.subtract, // -
	TokenType.multiply, // *
	TokenType.divide, // /
	TokenType.modulo, // %
	TokenType.exponent, // ^
]

export const BinaryOperators = [
	...LogicalOperators,
	...BitwiseOperators,
	...EqualityOperators,
	...ComparisonOperators,
	...BitShiftOperators,
	...ArithmeticOperators
]

export function TokenTypeListToString(tokenTypes: TokenType[]): string {
	return tokenTypes.map((type) => TokenType[type]).toString();
}

// export function TokenToString(token: Token | undefined) {
// 	if (token === undefined) {
// 		return "undefined";
// 	}
// }

