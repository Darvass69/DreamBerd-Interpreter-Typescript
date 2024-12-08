// Order of operations

import {Token, TokenType} from "../lexer/token";
import {AstNodeKind, createAstNode, Expression, Statement} from "./astNodes";
import { BindingPower } from "./bindingPower";
import Parser, { options } from "./parser";
import { parseBinaryExpression, parseExpressionStatement, parseGroupingExpressionParen, parsePrimaryExpression } from "./parserFunctions";

export type StmtHandler = (parser: Parser) => Statement;
export type NudHandler = ((parser: Parser, nbSpaces: number) => Expression) & {bp: number};
export type LedHandler = ((parser: Parser, left: Expression, nbSpaces: number) => Expression) & {bp: number};

export type StmtParsingFunction = (parser: Parser) => Statement;
export type NudParsingFunction = (parser: Parser, bp: BindingPower, nbSpaces: number) => Expression;
export type LedParsingFunction = (parser: Parser, left: Expression, bp: BindingPower, nbSpaces: number) => Expression;

export default class Lookups {
	private stmt_lu: Map<TokenType, StmtHandler[]> = new Map();
	private nud_lu: Map<TokenType, NudHandler[]> = new Map();
	private led_lu: Map<TokenType, LedHandler[]> = new Map();

	constructor() {
		// Operators
		this.addLed(TokenType.LogicalOr, BindingPower.logical_or, parseBinaryExpression);
		this.addLed(TokenType.LogicalAnd, BindingPower.logical_and, parseBinaryExpression);
		this.addLed(TokenType.BitwiseOr, BindingPower.bitwise_or, parseBinaryExpression);
		this.addLed(TokenType.BitwiseXor, BindingPower.bitwise_xor, parseBinaryExpression);
		this.addLed(TokenType.BitwiseAnd, BindingPower.bitwise_and, parseBinaryExpression);
		
		this.addLed(TokenType.Equals, BindingPower.equality, parseBinaryExpression);
		this.addLed(TokenType.NotEqual, BindingPower.equality, parseBinaryExpression);
		this.addLed(TokenType.StrongEqual, BindingPower.equality, parseBinaryExpression);
		this.addLed(TokenType.StrongNotEqual, BindingPower.equality, parseBinaryExpression);
		this.addLed(TokenType.StrongestEqual, BindingPower.equality, parseBinaryExpression);
		this.addLed(TokenType.StrongestNotEqual, BindingPower.equality, parseBinaryExpression);
		
		this.addLed(TokenType.Smaller, BindingPower.relational, parseBinaryExpression);
		this.addLed(TokenType.Greater, BindingPower.relational, parseBinaryExpression);
		this.addLed(TokenType.SmallerEqual, BindingPower.relational, parseBinaryExpression);
		this.addLed(TokenType.GreaterEqual, BindingPower.relational, parseBinaryExpression);
	 
		this.addLed(TokenType.BitShiftLeft, BindingPower.bitwise_shift, parseBinaryExpression);
		this.addLed(TokenType.BitShiftRight, BindingPower.bitwise_shift, parseBinaryExpression);
		this.addLed(TokenType.BitShiftUnsignedLeft, BindingPower.bitwise_shift, parseBinaryExpression);
		this.addLed(TokenType.BitShiftUnsignedRight, BindingPower.bitwise_shift, parseBinaryExpression);
		
		this.addLed(TokenType.Add, BindingPower.additive, parseBinaryExpression);
		this.addLed(TokenType.Subtract, BindingPower.additive, parseBinaryExpression);
		
		this.addLed(TokenType.Multiply, BindingPower.multiplicative, parseBinaryExpression);
		this.addLed(TokenType.Divide, BindingPower.multiplicative, parseBinaryExpression);
		this.addLed(TokenType.Modulo, BindingPower.multiplicative, parseBinaryExpression);
		
		this.addLed(TokenType.Exponent, BindingPower.exponentiation, parseBinaryExpression);

		// Primary
		this.addNud(TokenType.Number, BindingPower.primary, parsePrimaryExpression);
		this.addNud(TokenType.String, BindingPower.primary, parsePrimaryExpression);
		this.addNud(TokenType.Identifier, BindingPower.primary, parsePrimaryExpression);

		// Misc expressions
		if (!options.useSignificantWhitespace) {
			this.addNud(TokenType.OpenParen, BindingPower.grouping, parseGroupingExpressionParen);
		}

		this.addStmt(
			TokenType.EOF, 
			(parser: Parser) => {
				parser.expect([TokenType.EOF]);
				return createAstNode(AstNodeKind.EOFStatement, {});
			}
		);

		this.addStmt(
			TokenType.LineBreak, 
			(parser: Parser) => {
				parser.expect([TokenType.LineBreak]);
				return createAstNode(AstNodeKind.None, {});
			}
		);

		this.addStmt(TokenType.Identifier, parseExpressionStatement); //! this should probably be something else/handled differently
	}

	public static createNudHandler(bp: BindingPower, parsingFunction: NudParsingFunction): NudHandler {
		const { [parsingFunction.name]: handler } = { [parsingFunction.name]: ((parser: Parser, nbSpaces: number) => parsingFunction(parser, bp, nbSpaces)) as NudHandler };
		handler.bp = bp;
		return handler;
	}

	/** Add a Token/handler to the led map (with its binding power) */
	private addStmt(type: TokenType, parsingFunction: StmtParsingFunction) {
		this.stmt_lu.set(
			type,
			[
				parsingFunction,
				...(this.stmt_lu.get(type) ?? [])
			]
		);
	}

	/** Add a Token/handler to the led map (with its binding power) */
	private addNud(type: TokenType, bp: BindingPower, parsingFunction: NudParsingFunction) {
		const handler = Lookups.createNudHandler(bp, parsingFunction);

		this.nud_lu.set(
			type,
			[
				handler,
				...(this.nud_lu.get(type) ?? [])
			]
		);
	}

	/** Add a Token/handler to the led map (with its binding power) */
	private addLed(type: TokenType, bp: BindingPower, parsingFunction: LedParsingFunction) {
		const { [parsingFunction.name]: handler } = { [parsingFunction.name]: ((parser: Parser, left: Expression, nbSpaces: number) => parsingFunction(parser, left, bp, nbSpaces)) as LedHandler };
		handler.bp = bp;

		this.led_lu.set(
			type,
			[
				handler,
				...(this.led_lu.get(type) ?? [])
			]
		);
	}

	//* --------------------------------- Getters --------------------------------
	public getStmtHandlers(types: TokenType[]): StmtHandler[] {
		// We want to get all the handlers that can handle the given types, but also remove any duplicates.
		const handlers: StmtHandler[] = [];
		for (const type of types) {
			handlers.push(...(this.stmt_lu.get(type) ?? []));
		}

		// Filter for unique handlers
		const uniqueNames: Set<string> = new Set();
		
		return handlers.filter((handler) => {
			if (!uniqueNames.has(handler.name)) {
				uniqueNames.add(handler.name);
				return true;
			}
			return false;
		});
	}

	// public getStmt(type: TokenType): StmtHandler[] | undefined {
	// 	return this.stmt_lu.get(type);
	// 	// return [...this.stmt_lu.values()].flat();
	// }

	public getNudHandlers(bp: number, types: TokenType[]): NudHandler[] {
		// We want to get all the handlers that can handle the given types, but also remove any duplicates.
		const handlers: NudHandler[] = [];
		for (const type of types) {
			handlers.push(...(this.nud_lu.get(type) ?? []));
		}

		// Filter for unique handlers
		const unique: [name: string, bp: number][] = [];
		
		return handlers.filter((handler) => {
			if (handler.bp < bp) {
				return false;
			}

			if (!unique.some(([name, bp]) => handler.name === name && handler.bp === bp)) {
				unique.push([handler.name, handler.bp]);
				return true;
			}

			return false;
		});
	}

	// public getNud(bp: BindingPower, type: TokenType): NudHandler[] | undefined {
	// 	return this.nud_lu.get(type)?.filter((handler) => handler.bp > bp).map((handler) => handler);
	// 	// return [...this.nud_lu.values()].flat().filter(([handler_bp,]) => handler_bp > bp).map(([, handler]) => handler);
	// }

	public getLedHandlers(bp: number, types: TokenType[]): LedHandler[] {
		// We want to get all the handlers that can handle the given types, but also remove any duplicates.
		const handlers: LedHandler[] = [];
		for (const type of types) {
			handlers.push(...(this.led_lu.get(type) ?? []));
		}

		// Filter for unique handlers
		const unique: [name: string, bp: number][] = [];
		
		return handlers.filter((handler) => {
			if (handler.bp < bp) {
				return false;
			}

			if (!unique.some(([name, bp]) => handler.name === name && handler.bp === bp)) {
				unique.push([handler.name, handler.bp]);
				return true;
			}
			return false;
		});
	}

	// public getLed(bp: BindingPower, type: TokenType,): LedHandler[] | undefined {
	// 	return this.led_lu.get(type)?.filter((handler) => handler.bp > bp);
	// 	// return [...this.led_lu.values()].flat().filter((handler) => handler.bp > bp);
	// }

	// public getNudTypes(): TokenType[] {
	// 	return [...this.nud_lu.keys()];
	// }

	// public getLedTypes(): TokenType[] {
	// 	return [...this.led_lu.keys()];
	// }
}



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