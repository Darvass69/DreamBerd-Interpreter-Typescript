// Order of operations

import {Token, TokenType} from "../lexer/token";
import {AstNodeKind, createAstNode, Expression, Statement} from "./astNodes";
import Parser from "./parser";
import { parseAssignmentExpression, parseBinaryExpression, parseBlockStatement, parseCallExpression, parseFunctionDeclarationStatement, parseGroupingExpression, parseIfStatement, parseMemberExpression, parsePrefixExpression, parsePrimaryExpression, parseReturnStatement, parseStateExpression, parseVariableDeclarationStatement, parseWhenStatement } from "./parserFunctions";

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

//TODO when doing branching paths, we might need to change what we pass to handlers so we can keep track of branches properly.
export type StmtHandler = (parser: Parser) => Statement;
export type NudHandler = (parser: Parser) => Expression;
export type LedHandler = (
  parser: Parser,
  left: Expression,
  bp: BindingPower
) => Expression;

export default class Lookups {
  stmt_lu: Map<TokenType, [StmtHandler, identifier: string][]> = new Map();
  nud_lu: Map<TokenType, [NudHandler, BindingPower, identifier: string][]> = new Map();
  led_lu: Map<TokenType, [LedHandler, BindingPower, identifier: string][]> = new Map();

  constructor() {
    // Create token lookups
    // I think this is where we will first add parsing branches.
    // When we hit a token with 2 (or more) valid parser, we create a new branch.
    // All we need to do here is make parsers for all valid ways of using a specific type of token (in the current context).

    // Prefix expressions
    this.nud(TokenType.Subtract, BindingPower.prefix, parsePrefixExpression);
    this.nud(TokenType.LogicalNot, BindingPower.prefix, parsePrefixExpression);
    this.nud(TokenType.BitwiseNot, BindingPower.prefix, parsePrefixExpression);

    this.nud(TokenType.PlusPlus, BindingPower.prefix, parseStateExpression);
    this.nud(TokenType.MinusMinus, BindingPower.prefix, parseStateExpression);

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
    this.nud(TokenType.Number, BindingPower.primary, parsePrimaryExpression);
		this.nud(TokenType.String, BindingPower.primary, parsePrimaryExpression);
		this.nud(TokenType.Identifier, BindingPower.primary, parsePrimaryExpression);

    // Misc expressions
    this.nud(TokenType.OpenParen, BindingPower.grouping, parseGroupingExpression);
    this.led(TokenType.Dot, BindingPower.access_call_new, parseMemberExpression);
    this.led(TokenType.OpenBracket, BindingPower.access_call_new, parseMemberExpression);
    this.led(TokenType.OpenParen, BindingPower.access_call_new, parseCallExpression);

    this.nud(TokenType.Identifier, BindingPower.prefix, parseStateExpression, "previous");
    this.nud(TokenType.Identifier, BindingPower.prefix, parseStateExpression, "next");
    this.nud(TokenType.Identifier, BindingPower.prefix, parseStateExpression, "current");

    // Assignment
    this.led(TokenType.EqualSign, BindingPower.assignment, parseAssignmentExpression);
    this.led(TokenType.CombinedAssignment, BindingPower.assignment, parseAssignmentExpression);

    // Statements
    this.stmt(TokenType.Identifier, parseVariableDeclarationStatement, "const");
    this.stmt(TokenType.Identifier, parseVariableDeclarationStatement, "var");
    this.stmt(TokenType.Identifier, parseFunctionDeclarationStatement, "function");
    this.stmt(TokenType.Identifier, parseFunctionDeclarationStatement, "async");
    this.stmt(TokenType.Identifier, parseReturnStatement, "return");
    this.stmt(TokenType.Identifier, parseIfStatement, "if");
    this.stmt(TokenType.Identifier, parseWhenStatement, "when");


    this.stmt(TokenType.OpenCurly, parseBlockStatement); //! prob not useful

    this.stmt(TokenType.EOF, (parser: Parser) => {
      parser.expect([TokenType.EOF]);
      return createAstNode(AstNodeKind.EOFStatement, {});
    });



    /*
		stmt(lexer.LET, parse_var_decl_stmt)
		stmt(lexer.CONST, parse_var_decl_stmt)
		stmt(lexer.FN, parse_fn_declaration)
		stmt(lexer.IF, parse_if_stmt)
		stmt(lexer.CLASS, parse_class_declaration_stmt)
    */


    /*
		// Unary/Prefix
		nud(lexer.TYPEOF, unary, parse_prefix_expr)
		nud(lexer.DASH, unary, parse_prefix_expr)
		nud(lexer.NOT, unary, parse_prefix_expr)
		nud(lexer.OPEN_BRACKET, primary, parse_array_literal_expr)

		// Member / Computed // Call
		led(lexer.DOT, member, parse_member_expr)
		led(lexer.OPEN_BRACKET, member, parse_member_expr)
		led(lexer.OPEN_PAREN, call, parse_call_expr)

		// Grouping Expr
		nud(lexer.OPEN_PAREN, defalt_bp, parse_grouping_expr)
		nud(lexer.FN, defalt_bp, parse_fn_expr)
		nud(lexer.NEW, defalt_bp, func(p *parser) ast.Expr {
			p.advance()
			classInstantiation := parse_expr(p, defalt_bp)

			return ast.NewExpr{
				Instantiation: ast.ExpectExpr[ast.CallExpr](classInstantiation),
			}
		})

		stmt(lexer.OPEN_CURLY, parse_block_stmt)
		stmt(lexer.LET, parse_var_decl_stmt)
		stmt(lexer.CONST, parse_var_decl_stmt)
		stmt(lexer.FN, parse_fn_declaration)
		stmt(lexer.IF, parse_if_stmt)
		stmt(lexer.IMPORT, parse_import_stmt)
		stmt(lexer.FOREACH, parse_foreach_stmt)
		stmt(lexer.CLASS, parse_class_declaration_stmt)
		*/
  }

  /** Add a Token/handler to the led map (with its binding power) */
  private led<T extends TokenType>(type: TokenType, bp: BindingPower, handler: LedHandler, identifier?: T extends TokenType.Identifier ? string : never) {
    this.led_lu.set(type, [[handler, bp, identifier ?? ""], ...(this.led_lu.get(type) ?? [])]);
  }

  /** Add a Token/handler to the led map (with its binding power) */
  private nud<T extends TokenType>(type: TokenType, bp: BindingPower, handler: NudHandler, identifier?: T extends TokenType.Identifier ? string : never) {
    this.nud_lu.set(type, [[handler, bp, identifier ?? ""], ...(this.nud_lu.get(type) ?? [])]);
  }

  /** Add a Token/handler to the led map (with its binding power) */
  private stmt<T extends TokenType>(type: T, handler: StmtHandler, identifier?: T extends TokenType.Identifier ? string : never) {
    this.stmt_lu.set(type, [[handler, identifier ?? ""], ...(this.stmt_lu.get(type) ?? [])]);
  }

  //TODO change getLed and getNud to return array

  /** The first element is if we found an entry in the lookup table */
  public getLed(token: Token): [boolean, LedHandler, BindingPower] {
    let item: [LedHandler, BindingPower, identifier: string][] | undefined;
    if (token.type == TokenType.Identifier) {
      // Look if its a keyword
      item = this.led_lu.get(token.type)?.filter(([,_, lu_identifier])=>lu_identifier === token.value);
      if (item == undefined || item.length === 0) {
        // its not a keyword so its an identifier.
        item = this.led_lu.get(token.type)?.filter(([,_, lu_identifier])=>lu_identifier === "");
      }
    }
    else {
      item = this.led_lu.get(token.type);
    }

    let result: [boolean, LedHandler, BindingPower];
    if (item == undefined || item.length === 0) {
      result = [
        false,
        () => createAstNode(AstNodeKind.None, {}),
        BindingPower.default_bp,
      ];
    } else {
      
      result = [true, item[0][0], item[0][1]];
    }

    return result;
  }

  public getNud(token: Token): [boolean, NudHandler, BindingPower] {
    let item: [NudHandler, BindingPower, identifier: string][] | undefined;
    if (token.type == TokenType.Identifier) {
      // Look if its a keyword
      item = this.nud_lu.get(token.type)?.filter(([,_, lu_identifier])=>lu_identifier === token.value);
      if (item == undefined || item.length === 0) {
        // its not a keyword so its an identifier.
        item = this.nud_lu.get(token.type)?.filter(([,_, lu_identifier])=>lu_identifier === "");
      }
    }
    else {
      item = this.nud_lu.get(token.type);
    }

    let result: [boolean, NudHandler, BindingPower];
    if (item == undefined || item.length === 0) {
      result = [
        false,
        () => createAstNode(AstNodeKind.None, {}),
        BindingPower.default_bp,
      ];
    } else {
      result = [true, item[0][0], item[0][1]];
    }

    return result;
  }

  public getStmt(token: Token): StmtHandler[] {
    let handlers: [StmtHandler, string][] | undefined;
    if (token.type == TokenType.Identifier) {
      handlers = this.stmt_lu.get(token.type)?.filter(([, lu_identifier])=>lu_identifier === token.value);
    }
    else {
      handlers = this.stmt_lu.get(token.type);
    }


    if (handlers === undefined) {
      return [];
    }
    const result = handlers.map(([handler,]) => handler);
    return result;
  }
}

export const EndOfLineTokens = [TokenType.Exclamation, TokenType.InvertedExclamation, TokenType.Question];



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