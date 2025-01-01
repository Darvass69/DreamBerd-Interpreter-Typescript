// Order of operations

import { TokenType } from "../lexer/token.ts";
import { AstNodeKind, createAstNode, Expression, Statement } from "./astNodes.ts";
import { BindingPower } from "./bindingPower.ts";
import Parser, { Options } from "./parser.ts";
import { parseAssignmentExpression, parseBinaryExpression, parseBlockStatement, parseCallExpression, parseExpressionStatement, parseFunctionDeclarationStatement, parseGroupingExpressionParen, parseIfStatement, parseMemberExpression, parsePrefixExpression, parsePrimaryExpression, parseReturnStatement, parseStateExpression, parseVariableDeclarationStatement, parseWhenStatement } from "./parserFunctions.ts";

//TODO make async?
export type StmtHandler = (parser: Parser) => Statement | Promise<Statement>;
export type NudHandler = ((parser: Parser, nbSpaces: number) => Expression | Promise<Expression>) & { bp: number };
export type LedHandler = ((parser: Parser, left: Expression, nbSpaces: number) => Expression | Promise<Expression>) & { bp: number };

export type StmtParsingFunction = (parser: Parser) => Statement | Promise<Statement>;
export type NudParsingFunction = (parser: Parser, bp: BindingPower, nbSpaces: number) => Expression | Promise<Expression>;
export type LedParsingFunction = (parser: Parser, left: Expression, bp: BindingPower, nbSpaces: number) => Expression | Promise<Expression>;

//TODO add shorthand for `Lookups.createNudHandler(BindingPower.default_bp, parseExpression)`. Its used at multiple places.

export default class ParsingFunctionMaps {
  private stmt_lu: Map<TokenType, StmtHandler[]> = new Map();
  private nud_lu: Map<TokenType, NudHandler[]> = new Map();
  private led_lu: Map<TokenType, LedHandler[]> = new Map();

  constructor(
    public options: Options,
  ) {
    //& Operators
    // Unary
    this.addNud(TokenType.LogicalNot, BindingPower.prefix, parsePrefixExpression);
    this.addNud(TokenType.BitwiseNot, BindingPower.prefix, parsePrefixExpression);
    this.addNud(TokenType.UnaryMinus, BindingPower.prefix, parsePrefixExpression);

    this.addNud(TokenType.PlusPlus, BindingPower.prefix, parseStateExpression);
    this.addNud(TokenType.MinusMinus, BindingPower.prefix, parseStateExpression);
    this.addNud(TokenType.Previous, BindingPower.prefix, parseStateExpression);
    this.addNud(TokenType.Current, BindingPower.prefix, parseStateExpression);
    this.addNud(TokenType.Next, BindingPower.prefix, parseStateExpression);

    // Binary
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
      this.addLed(TokenType.OpenParen, BindingPower.access_call_new, parseCallExpression);
    }
    this.addLed(TokenType.Dot, BindingPower.access_call_new, parseMemberExpression);
    this.addLed(TokenType.OpenBracket, BindingPower.access_call_new, parseMemberExpression);

    this.addNud(TokenType.Previous, BindingPower.prefix, parseStateExpression);
    this.addNud(TokenType.Next, BindingPower.prefix, parseStateExpression);
    this.addNud(TokenType.Current, BindingPower.prefix, parseStateExpression);

    // Assignment
    this.addLed(TokenType.Assignment, BindingPower.assignment, parseAssignmentExpression);

    // Statement
    this.addStmt(TokenType.Const, parseVariableDeclarationStatement);
    this.addStmt(TokenType.Var, parseVariableDeclarationStatement);
    this.addStmt(TokenType.Function, parseFunctionDeclarationStatement);
    this.addStmt(TokenType.Async, parseFunctionDeclarationStatement);
    this.addStmt(TokenType.Return, parseReturnStatement);
    this.addStmt(TokenType.If, parseIfStatement);
    this.addStmt(TokenType.When, parseWhenStatement);

    this.addStmt(TokenType.OpenCurly, parseBlockStatement); //! prob not useful

    this.addStmt(
      TokenType.EOF,
      (parser: Parser) => {
        parser.expect([TokenType.EOF]);
        return createAstNode(AstNodeKind.EOFStatement, {});
      },
    );

    //TODO Need to change it to handle more consistently end of statement/end of line/tabs and stuff like that. Right now its kind of not consistent.
    this.addStmt(
      TokenType.LineBreak,
      (parser: Parser) => {
        parser.expect([TokenType.LineBreak]);
        return createAstNode(AstNodeKind.None, {});
      },
    );

    this.addStmt(TokenType.All, parseExpressionStatement);
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
        ...(this.stmt_lu.get(type) ?? []),
      ],
    );
  }

  /** Add a Token/handler to the led map (with its binding power) */
  private addNud(type: TokenType, bp: BindingPower, parsingFunction: NudParsingFunction) {
    const handler = ParsingFunctionMaps.createNudHandler(bp, parsingFunction);

    this.nud_lu.set(
      type,
      [
        handler,
        ...(this.nud_lu.get(type) ?? []),
      ],
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
        ...(this.led_lu.get(type) ?? []),
      ],
    );
  }

  //* --------------------------------- Getters --------------------------------
  public getStmtHandlers(types: TokenType[]): StmtHandler[] {
    // We want to get all the handlers that can handle the given types, but also remove any duplicates.
    types.push(TokenType.All); // Add handlers we always want to try.
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
}
