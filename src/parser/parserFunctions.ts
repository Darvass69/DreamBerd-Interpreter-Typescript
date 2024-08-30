import {CombinedAssignmentToken, Token, TokenToString, TokenType} from "../lexer/token";
import { ignoreKeys } from "../main";
import {
  AssignmentExpression,
  AstNodeKind,
  BinaryExpression,
  BlockStatement,
  CallExpression,
  createAstNode,
  Expression,
  ExpressionStatement,
  FunctionDeclarationStatement,
  FunctionParameter,
  IfStatement,
  MemberExpression,
  NumberExpression,
  PrefixExpression,
  ReturnStatement,
  Statement,
  StringExpression,
  SymbolExpression,
  VariableDeclarationStatement,
} from "./astNodes";
import {BindingPower, EndOfLineTokens, LedHandler} from "./lookups";
import Parser from "./parser";

const ignoredTypes = new Set([TokenType.WhiteSpace, TokenType.LineBreak]);
function goToNextMeaningfulToken(parser: Parser): Token {
  while (ignoredTypes.has(parser.currentToken().type)) {
    parser.advance();
  }
  return parser.currentToken();
}

/* --------------------------------- Parsing -------------------------------- */
export function parseStatement(parser: Parser): Statement {
  const stmt_handler = parser.lookups.getStmt(goToNextMeaningfulToken(parser))[0];

  if (stmt_handler != undefined) {
    return stmt_handler(parser);
  }

  // Handling when we need to close a block
  if (parser.currentToken().type == TokenType.CloseCurly) {
    return createAstNode(AstNodeKind.EndOfBlockStatement, {});
  }

  // skip to parse expression
  return parseExpressionStatement(parser);
}

export function parseExpression(parser: Parser, bp: BindingPower): Expression {
  // We expect a nud at the start of an expression
  const [exists, nud_handler, _] = parser.lookups.getNud(goToNextMeaningfulToken(parser));

  if (!exists) {
    console.error(
      `Expected NUD handler for token ${TokenToString(parser.currentToken())} at token ${parser.getPosition()}`
    );
    process.exit(1);
  }
  let left = nud_handler(parser);

  let led:  [boolean, LedHandler, BindingPower];
  while ((led = parser.lookups.getLed(goToNextMeaningfulToken(parser)))[2] > bp) {
    const [exists, led_handler, led_bp] = led;
    
    if (!exists) {
      console.error(
        `Expected LED handler for token ${TokenToString(parser.currentToken())} at token ${parser.getPosition()}`
      );
      process.exit(1);
    }

    left = led_handler(parser, left, led_bp);
  }

  return left;
}

/* ------------------------------- Statements ------------------------------- */
export function parseExpressionStatement(parser: Parser): ExpressionStatement {
  const expression = parseExpression(parser, BindingPower.default_bp);
  parser.expect(EndOfLineTokens);

  return createAstNode(AstNodeKind.ExpressionStatement, {expression});
}

export function parseBlockStatement(parser: Parser): BlockStatement {
  parser.expect([TokenType.OpenCurly]);
  const body: Statement[] = [];

  while (
    parser.hasToken() &&
    parser.currentToken().type != TokenType.CloseCurly
  ) {
    body.push(parseStatement(parser));
  }

  parser.expect([TokenType.CloseCurly]);
  return createAstNode(AstNodeKind.BlockStatement, {body});
}

export function parseVariableDeclarationStatement(parser: Parser): VariableDeclarationStatement {
  const modifier1 = parser.expectIdentifier(["const", "var"])[1];
  const modifiers: [canReassign: boolean, canMutate: boolean] = [false, false];
  if (modifier1.value == "const") {
    modifiers[0] = false;
  } else if (modifier1.value == "var") {
    modifiers[0] = true;
  }

  const modifier2 = parser.expectIdentifier(["const", "var"])[1];
  if (modifier2.value == "const") {
    modifiers[1] = false;
  } else if (modifier2.value == "var") {
    modifiers[1] = true;
  }

  const identifierToken = parser.expect([TokenType.Identifier])[1];
  const identifier = identifierToken.value;

  //TODO
  const lifetime = undefined;

  //TODO
  // type

  let value: Expression | undefined = undefined;
  const [assignment] = parser.expect([TokenType.EqualSign], undefined, false, false);
  if (assignment) {
    parser.expect([TokenType.EqualSign]);
    value = parseExpression(parser, BindingPower.default_bp);
  }
  parser.expect(EndOfLineTokens);

  return createAstNode(AstNodeKind.VariableDeclarationStatement, {
    identifier,
    modifiers,
    ...(value == undefined ? undefined : {value}),
    ...(lifetime == undefined ? undefined : {lifetime}),
  });
}

export function parseFunctionDeclarationStatement(parser: Parser): FunctionDeclarationStatement {
  const [isAsync] = parser.expectIdentifier(["async"], undefined, false, false);
  if (isAsync) {
    parser.advance();
  }

  parser.expectIdentifier(["function"]);
  const [, identifier] = parser.expect([TokenType.Identifier]);
  parser.expect([TokenType.OpenParen]);
  const parameters = parseFunctionParameters(parser);
  parser.expect([TokenType.CloseParen]);

  parser.expect([TokenType.Arrow]);
  
  let body: ExpressionStatement | BlockStatement;
  if (parser.expect([TokenType.OpenCurly], undefined, false, false)[0]) {
    body = parseBlockStatement(parser);
  } else {
    body = parseExpressionStatement(parser);
  }

  return createAstNode(AstNodeKind.FunctionDeclarationStatement, {
    identifier,
    parameters,
    isAsync,
    body
  });

  function parseFunctionParameters(parser: Parser): FunctionParameter[] {
    let isFirstPass = true;
    const parameters: FunctionParameter[] = [];
    while (parser.currentToken().type != TokenType.CloseParen) {
      if (!isFirstPass) {
        parser.expect([TokenType.Comma]);
      }
      const [, token] = parser.expect([TokenType.Identifier]);
      parameters.push({identifier: token});
  
      isFirstPass = false;
    }
    return parameters;
  }
}

export function parseReturnStatement(parser: Parser): ReturnStatement {
  parser.expectIdentifier(["return"]);
  const expression = parseExpression(parser, BindingPower.default_bp);
  parser.expect(EndOfLineTokens);
  return createAstNode(AstNodeKind.ReturnStatement, {argument: expression});
}

export function parseIfStatement(parser: Parser): IfStatement {
  parser.expectIdentifier(["if"]);
  parser.expect([TokenType.OpenParen]);
  const test = parseExpression(parser, BindingPower.default_bp);
  parser.expect([TokenType.CloseParen]);
  
  const consequent = parseBlockStatement(parser);

  let alternate: IfStatement | BlockStatement | undefined;
  if (parser.expectIdentifier(["else"], undefined, false, false)[0]) {
    parser.expectIdentifier(["else"]);
    if (parser.expectIdentifier(["if"], undefined, false, false)[0]) {
      alternate = parseIfStatement(parser);
    } else {
      alternate = parseBlockStatement(parser);
    }
  }

  return createAstNode(AstNodeKind.IfStatement, {test, consequent, ...(alternate == undefined ? undefined : {alternate}),});
}

export function parseWhenStatement(parser: Parser) {
  parser.expectIdentifier(["when"]);
  parser.expect([TokenType.OpenParen]);
  const test = parseExpression(parser, BindingPower.default_bp);
  parser.expect([TokenType.CloseParen]);
  
  const consequent = parseBlockStatement(parser);

  return createAstNode(AstNodeKind.WhenStatement, {test, consequent});
}

function parseClassDeclarationStatement() {}

function parseDeleteStatement() {}

function parseReverseStatement() {}

function parseImportStatement() {}

function parseExportStatement() {}

/* ------------------------------- Expressions ------------------------------ */
export function parseAssignmentExpression(parser: Parser, left: Expression, bp: BindingPower): AssignmentExpression {
  // Make sure we only assign to a symbol or member because they are the only thing that can be assigned a value.
  if (left.kind != AstNodeKind.SymbolExpression && left.kind != AstNodeKind.MemberExpression) {
    parser.exit();
  }

  const [, assignment] = parser.expect([TokenType.CombinedAssignment, TokenType.EqualSign]);
  let value = parseExpression(parser, BindingPower.assignment);

  // Create a new operation if we have an operator assignment
  if (assignment.type == TokenType.CombinedAssignment) {
    value = createAstNode(AstNodeKind.BinaryExpression, {left: left, operator: assignment, right: value})
  }

  return createAstNode(AstNodeKind.AssignmentExpression, {
    assigne: left as SymbolExpression | MemberExpression,
    assignedValue: value,
    // ...(assignment.type == TokenType.CombinedAssignment ? {operator: assignment} : undefined)
  });
}

export function parseGroupingExpression(parser: Parser): Expression {
  parser.expect([TokenType.OpenParen]);
  const expression = parseExpression(parser, BindingPower.default_bp);
  parser.expect([TokenType.CloseParen]);
  return expression;
}

export function parsePrefixExpression(parser: Parser): PrefixExpression {
  const [,prefix] = parser.expect([TokenType.Subtract, TokenType.LogicalNot, TokenType.BitwiseNot]);

  const expression = parseExpression(parser, BindingPower.prefix);

  return createAstNode(AstNodeKind.PrefixExpression, {prefix, right: expression});
}

export function parseStateExpression(parser: Parser) {
  let operator: Token;
  if (parser.expectIdentifier(["previous", "next", "current"], undefined, false, false)[0]){
    [,operator] = parser.expectIdentifier(["previous", "next", "current"]);
  } else {
    [,operator] = parser.expect([TokenType.PlusPlus, TokenType.MinusMinus]);
  }

  const expression = parseExpression(parser, BindingPower.prefix);
  if (! [AstNodeKind.SymbolExpression, AstNodeKind.MemberExpression].includes(expression.kind)) {
    console.error(`Expected a variable expression but instead got ${JSON.stringify(expression, ignoreKeys, 2)}`);
    parser.exit();
  }

  return createAstNode(AstNodeKind.StateExpression, {operator, argument: expression as SymbolExpression | MemberExpression});
}

export function parseBinaryExpression(parser: Parser, left: Expression, bp: BindingPower): BinaryExpression {
	// We assume we are already at the operator token
	const operator = parser.advance();
	const right = parseExpression(parser, bp);

	return createAstNode(AstNodeKind.BinaryExpression, {left, operator, right});
}

export function parsePrimaryExpression(parser: Parser): NumberExpression | StringExpression | SymbolExpression {
	const [, token] = parser.expect([TokenType.Number, TokenType.String, TokenType.Identifier]);
	switch (token.type) {
		case TokenType.Number: {
			return createAstNode(AstNodeKind.NumberExpression, {value: Number(token.value)});
		}
		case TokenType.String: {
			return createAstNode(AstNodeKind.StringExpression, {value: token.value});
		}
		case TokenType.Identifier: {
			return createAstNode(AstNodeKind.SymbolExpression, {symbol: token.value});
		}
		default: {
			return createAstNode(AstNodeKind.StringExpression, {value: ""});
		}
	}
}

export function parseObjectDeclarationExpression() {}

export function parseArrayDeclarationExpression() {}

export function parseMemberExpression(parser: Parser, left: Expression, bp: BindingPower): MemberExpression {
  let computed: boolean = false;
  let property: SymbolExpression | Expression;
  if (parser.currentToken().type == TokenType.Dot) {
    parser.expect([TokenType.Dot]);
    property = parseExpression(parser, bp);
    // we can only have a symbol when using the dot notation
    if (property.kind != AstNodeKind.SymbolExpression && property.kind != AstNodeKind.NumberExpression) {
      parser.exit(`When parsing memberExpression, expected SymbolExpression or NumberExpression but got ${property.kindName} instead`);
    }
  } else if (parser.currentToken().type == TokenType.OpenBracket) {
    parser.expect([TokenType.OpenBracket]);
    computed = true;
    property = parseExpression(parser, BindingPower.default_bp);
    parser.expect([TokenType.CloseBracket]);
  } else {
    parser.exit();
    property = createAstNode(AstNodeKind.None, {});
  }

  return createAstNode(AstNodeKind.MemberExpression, {
    object: left,
    property,
    computed
  });
}

export function parseCallExpression(parser: Parser, left: Expression, bp: BindingPower): CallExpression {
  parser.expect([TokenType.OpenParen]);

  // parse arguments
  let isFirstPass = true;
  const callArguments: Expression[] = [];
  while (parser.currentToken().type != TokenType.CloseParen) {
    if (!isFirstPass) {
      parser.expect([TokenType.Comma]);
    }
    const expression = parseExpression(parser, BindingPower.default_bp);
    callArguments.push(expression);

    isFirstPass = false;
  }

  parser.expect([TokenType.CloseParen]);
  
  return createAstNode(AstNodeKind.CallExpression, {callee: left, arguments: callArguments});
}