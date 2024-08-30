// Represent tokens our language understands.
//? I think we don't have any duplicate anymore.
export enum TokenType {
	EOF,

  // Literals
	Null,
	True,
	False,
  Number,
	String,
  Identifier,

	// Grouping and braces
	OpenBracket, // [
	CloseBracket, // ]
	OpenCurly, // {
	CloseCurly, // }
	OpenParen, // (
	CloseParen, // )

	Arrow, // =>

	// unary
	// UnaryMinus, // - Negative a number
	PlusPlus, // ++
	MinusMinus, // --

	// Assignment
	EqualSign, // = can also be very weak comparison
	CombinedAssignment, // ex: +=

	// Comparison = < > <= >= == ;= === ;== ==== ;===
	// WeakEqual, // =
	Smaller, // < (later) <> can also be used for types and lifetimes 
	Greater, // >
	SmallerEq, // <=
	GreaterEq, // >=
	Equals, // ==
	NotEq, // ;=
	StrongEq, // ===
	StrongNotEq, // ;==
	StrongestEq, // ====
	StrongestNotEq, // ;===
	
	// Arithmetic + - * / % ^
	Add, // +
	Subtract, // -
	Multiply, // *
	Divide, // /
	Modulo, // %
	Exponent, // ^

	// logical && || ;
	LogicalAnd, // &&
	LogicalOr, // ||
	LogicalNot, // ;

	// bitwise & | ** ~ << >> <<< >>>
		// we use ** instead of ^ for xor
	BitwiseNot, // ~
	BitwiseAnd, // &
	BitwiseOr, // |
	BitwiseXor, // **
	BitShiftLeft, // <<
	BitShiftRight, // >>
	BitShiftUnsignedLeft, // <<<
	BitShiftUnsignedRight, // >>>

	// Symbols
	Dot, // .
	Colon, // :
	Comma, // ,
	WhiteSpace, // " "
	LineBreak, // \n
	Tabs, //TODO parse tabs

	// End of line
  Exclamation, // !
	InvertedExclamation, // ¡
	Question, // ?


	// These are just going to be turned to string literals
	Quote, // '
  DoubleQuote, // "
}

export const ComparisonMap : Record<string, TokenType> = {
	"=": TokenType.EqualSign,
	"<": TokenType.Smaller,
	">": TokenType.Greater,
	"<=": TokenType.SmallerEq,
	">=": TokenType.GreaterEq,
	"==": TokenType.Equals,
	";=": TokenType.NotEq,
	"===": TokenType.StrongEq,
	";==": TokenType.StrongNotEq,
	"====": TokenType.StrongestEq,
	";===": TokenType.StrongestNotEq,
};
export const ComparisonOperators: string[] = Object.keys(ComparisonMap);


export const ArithmeticMap : Record<string, TokenType> = {
	"+": TokenType.Add,
	"-": TokenType.Subtract,
	"*": TokenType.Multiply,
	"/": TokenType.Divide,
	"%": TokenType.Modulo,
	"^": TokenType.Exponent,
};
export const ArithmeticOperators: string[] = Object.keys(ArithmeticMap);


export const LogicalMap : Record<string, TokenType> = {
	"&&": TokenType.LogicalAnd,
	"||": TokenType.LogicalOr,
};
export const LogicalOperators: string[] = Object.keys(LogicalMap);


export const BitwiseMap : Record<string, TokenType> = {
	"&": TokenType.BitwiseAnd,
	"|": TokenType.BitwiseOr,
	"**": TokenType.BitwiseXor,
	"<<": TokenType.BitShiftLeft,
	">>": TokenType.BitShiftRight,
	"<<<": TokenType.BitShiftUnsignedLeft,
	">>>": TokenType.BitShiftUnsignedRight,
};
export const BitwiseOperators: string[] = Object.keys(BitwiseMap);

// Reserved keywords
// TODO change later to handle more complex cases
	//? maybe we don't need to replace, but just expand on it.
// export const Reserved: Record<string, TokenType> = {
//   let: TokenType.Let,
//   const: TokenType.Const,
//   fn: TokenType.,

// 	null: TokenType.Null,
// 	true: TokenType.True,
// 	false: TokenType.False
// };

/*
function TokenTypeToString(tokenType: TokenType): string {
	return TokenType[tokenType]
}
*/

export function TokenTypeListToString(tokenTypes: TokenType[]): string {
	return tokenTypes.map((type) => TokenType[type]).toString();
}

export function TokenToString(token: Token) {
	switch (token.type) {
		case TokenType.CombinedAssignment: {
			return `${TokenType[token.type]}<${TokenType[(token as CombinedAssignmentToken).operation]}>(${token.value})`;
		}
		// Tokens that have more than 1 representation
		case TokenType.Identifier: {
			return `${TokenType[token.type]}(${token.value})`;
		}
		// Tokens that have only 1 representation
		default: {
			return `${TokenType[token.type]}()`;
		}
	}
}

export interface Token {
  value: string;
  type: TokenType;
}

export function newToken(value = "", type: TokenType): Token {
  return {value, type};
}

export interface CombinedAssignmentToken extends Token {
	type: TokenType.CombinedAssignment,
	operation: TokenType
}

export function newCombinedAssignmentToken(value = "", operatorType: TokenType): CombinedAssignmentToken {
  return {value, type: TokenType.CombinedAssignment, operation: operatorType};
}