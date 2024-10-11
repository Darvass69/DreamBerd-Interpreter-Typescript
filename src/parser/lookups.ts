// Order of operations

import {Token, TokenType} from "../lexer/token";
import {AstNodeKind, createAstNode, Expression, Statement} from "./astNodes";
import Parser from "./parser";
import { parseAssignmentExpression, parseBinaryExpression, parseBlockStatement, parseCallExpression, parseExpressionStatement, parseFunctionDeclarationStatement, parseGroupingExpression, parseIfStatement, parseMemberExpression, parsePrefixExpression, parsePrimaryExpression, parseReturnStatement, parseStateExpression, parseVariableDeclarationStatement, parseWhenStatement } from "./parserFunctions";

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_precedence#table
export enum BindingPower {
	default_bp,
	comma,
	assignment, // and function declaration? for arrow functions?
	logical_or,
	logical_and,
	bitwise_or,
	bitwise_xor, // **
	bitwise_and,
	equality, // ==, ;=, ===, ;==, ====, ;===
	relational, // <, >, >=, <=
	bitwise_shift, // <<, >>
	additive, // +, -
	multiplicative, // /, *, %
	exponentiation, // ^
	prefix, // --, ++, ;, ~, +, -,
	postfix, // --, ++
	new, //! I'm not sure this does anything
	access_call_new, // x.y, x[y], new x(y), x(y), import
	grouping,
	primary, // isn't in js docs, probably implied precedence.
}

export type StmtHandler = (parser: Parser) => Statement;
export type NudHandler = (parser: Parser) => Expression;
export type LedHandler = (parser: Parser, left: Expression) => Expression;

export type StmtHandlerFunction = (parser: Parser) => Statement;
export type NudHandlerFunction = (parser: Parser, bp: BindingPower) => Expression;
export type LedHandlerFunction = (parser: Parser, left: Expression, bp: BindingPower) => Expression;

export default class Lookups {
	stmt_lu: Map<TokenType, StmtHandler[]> = new Map();
	nud_lu: Map<TokenType, [NudHandler, BindingPower][]> = new Map();
	led_lu: Map<TokenType, [LedHandler, BindingPower][]> = new Map();

	constructor() {
		// Operators
		this.led(TokenType.LogicalOr, BindingPower.logical_or, parseBinaryExpression);
		this.led(TokenType.LogicalAnd, BindingPower.logical_and, parseBinaryExpression);
		this.led(TokenType.BitwiseOr, BindingPower.bitwise_or, parseBinaryExpression);
		this.led(TokenType.BitwiseXor, BindingPower.bitwise_xor, parseBinaryExpression);
		this.led(TokenType.BitwiseAnd, BindingPower.bitwise_and, parseBinaryExpression);
		
		this.led(TokenType.Equals, BindingPower.equality, parseBinaryExpression);
		this.led(TokenType.NotEq, BindingPower.equality, parseBinaryExpression);
		this.led(TokenType.StrongEq, BindingPower.equality, parseBinaryExpression);
		this.led(TokenType.StrongNotEq, BindingPower.equality, parseBinaryExpression);
		this.led(TokenType.StrongestEq, BindingPower.equality, parseBinaryExpression);
		this.led(TokenType.StrongestNotEq, BindingPower.equality, parseBinaryExpression);
		
		this.led(TokenType.Smaller, BindingPower.relational, parseBinaryExpression);
		this.led(TokenType.Greater, BindingPower.relational, parseBinaryExpression);
		this.led(TokenType.SmallerEq, BindingPower.relational, parseBinaryExpression);
		this.led(TokenType.GreaterEq, BindingPower.relational, parseBinaryExpression);
	 
		this.led(TokenType.BitShiftLeft, BindingPower.bitwise_shift, parseBinaryExpression);
		this.led(TokenType.BitShiftRight, BindingPower.bitwise_shift, parseBinaryExpression);
		this.led(TokenType.BitShiftUnsignedLeft, BindingPower.bitwise_shift, parseBinaryExpression);
		this.led(TokenType.BitShiftUnsignedRight, BindingPower.bitwise_shift, parseBinaryExpression);
		
		this.led(TokenType.Add, BindingPower.additive, parseBinaryExpression);
		this.led(TokenType.Subtract, BindingPower.additive, parseBinaryExpression);
		
		this.led(TokenType.Multiply, BindingPower.multiplicative, parseBinaryExpression);
		this.led(TokenType.Divide, BindingPower.multiplicative, parseBinaryExpression);
		this.led(TokenType.Modulo, BindingPower.multiplicative, parseBinaryExpression);
		
		this.led(TokenType.Exponent, BindingPower.exponentiation, parseBinaryExpression);

		// Primary
		// this.nud(TokenType.Number, BindingPower.primary, parsePrimaryExpression);
		this.nud(TokenType.String, BindingPower.primary, parsePrimaryExpression);
		this.nud(TokenType.Identifier, BindingPower.primary, parsePrimaryExpression);

		// Misc expressions
		this.nud(TokenType.OpenParen, BindingPower.grouping, parseGroupingExpression);

		this.stmt(
			TokenType.EOF, 
			(parser: Parser) => {
				parser.expect([TokenType.EOF]);
				return createAstNode(AstNodeKind.EOFStatement, {});
			}
		);

		this.stmt(TokenType.Identifier, parseExpressionStatement);
	}

	/** Add a Token/handler to the led map (with its binding power) */
	private led(type: TokenType, bp: BindingPower, handler: LedHandlerFunction) {
		this.led_lu.set(
			type,
			[
				[(parser: Parser, left: Expression) => handler(parser, left, bp), bp],
				...(this.led_lu.get(type) ?? [])
			]
		);
	}

	/** Add a Token/handler to the led map (with its binding power) */
	private nud(type: TokenType, bp: BindingPower, handler: NudHandlerFunction) {
		this.nud_lu.set(
			type,
			[
				[(parser: Parser) => handler(parser, bp), bp], 
				...(this.nud_lu.get(type) ?? [])
			]
		);
	}

	/** Add a Token/handler to the led map (with its binding power) */
	private stmt(type: TokenType, handler: StmtHandlerFunction) {
		this.stmt_lu.set(
			type,
			[
				handler,
				...(this.stmt_lu.get(type) ?? [])
			]
		);
	}
}
export const EndOfLineTokens = [TokenType.Exclamation, TokenType.InvertedExclamation, TokenType.Question]; //! this should be a token



/*
Prefix
-
;
~

State
++
--
previous
next
current



Binary

Comparison
=
<
>
<=
>=
==
;=
===
;==
====
;===

Arithmetic
+
-
*
/
%
^

Logical
&&
||

Bitwise
&
|
**
<<
>>
<<<
>>>

*/