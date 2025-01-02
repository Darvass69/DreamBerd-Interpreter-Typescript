import { BinaryOperators, TokenType } from "../lexer/token.ts";
import { AssignmentExpression, AstNodeKind, BinaryExpression, BlockStatement, BranchingStatement, CallExpression, createAstNode, Expression, ExpressionStatement, FunctionDeclarationStatement, IfStatement, MemberExpression, NumberExpression, PrefixExpression, ReturnStatement, StateExpression, Statement, StringExpression, SymbolExpression, VariableDeclarationStatement, VariableModifiers, WhenStatement } from "./astNodes.ts";
import { BindingPower } from "./bindingPower.ts";
import ParsingFunctionMaps, { LedHandler } from "./parsingFunctionMaps.ts";
import Parser from "./parser.ts";
import { FunctionParameterDeclaration } from "./astNodes.ts";

/**
 * Parsing functions are the functions that turn part of the source code (in their token form) into their AST form.
 *
 * To do that and be compatible with the parser, they need to follow a simple rule. It needs to be completely deterministic with the results from the Parser.
 * This means that if we call the same parsing function multiple times with a parser with the same internal state, it should always return the exact same thing.
 * Essentially, the only thing that should affect the result is data coming from the Parser, and nothing else.
 */

class NotImplementedError extends Error {
  constructor(feature: string, fn: Function) {
    super(`'${feature}' is not yet implemented in '${fn.name}'`);
  }
  //& We could add some static fields with different features and like an order we expect to do them in.
  //& It could be a good way to organise new features.
}

/* --------------------------------- Program -------------------------------- */
export async function parseProgram(p: Parser): Promise<BlockStatement> {
  const body: Statement[] = [];
  while (p.hasToken()) {
    body.push(await p.executeHandler(parseStatement));
  }
  return createAstNode(AstNodeKind.BlockStatement, { body });
}

export async function parseStatement(p: Parser): Promise<Statement> {
  if (p.options.useSignificantWhitespace) {
    throw new NotImplementedError("useSignificantWhitespace", parseStatement);
  } else {
    p.optional([TokenType.WhiteSpace]); //*Whitespace
  }
  return await p.executeHandler(p.getStmt());
}

export async function parseExpression(p: Parser, bp: BindingPower, nbSpaces: number): Promise<Expression> {
  // if (options.useSignificantWhitespace) {
  //   //
  // }

  // NUDs check the spacing before and after themselves, LEDs only need to pass it down.

  // if (nbSpaces != parseSpaces()) {
  //   p.exit();
  // }

  if (p.options.useSignificantWhitespace) {
    throw new NotImplementedError("useSignificantWhitespace", parseExpression);
  } else {
    p.optional([TokenType.WhiteSpace]); //*Whitespace
  }

  const nud_handler = p.getNud(bp);
  let left = await p.executeHandler(nud_handler, nbSpaces);

  if (p.options.useSignificantWhitespace) {
    throw new NotImplementedError("useSignificantWhitespace", parseExpression);
  } else {
    p.optional([TokenType.WhiteSpace]); //*Whitespace //! this will be a problem. We can't always eat this one, sometimes we might need to keep it to parse the next grouping
  }

  let led_handler: LedHandler | null = p.getLed(bp);
  while (led_handler !== null) { //! we need to add a branch with null
    left = await p.executeHandler(led_handler, left, nbSpaces);

    if (p.options.useSignificantWhitespace) {
      throw new NotImplementedError("useSignificantWhitespace", parseFunctionDeclarationStatement);
    } else {
      p.optional([TokenType.WhiteSpace]); //*Whitespace
    }

    led_handler = p.getLed(bp);
  }
  return left;
}

// Essentially a NUD, but its whitespace counterpart is way more complicated
export async function parseGroupingExpressionParen(p: Parser, bp: BindingPower, nbSpaces: number): Promise<Expression> {
  p.expect([TokenType.OpenParen]);
  p.optional([TokenType.WhiteSpace]);
  const expression = await p.executeHandler(ParsingFunctionMaps.createNudHandler(BindingPower.default_bp, parseExpression), nbSpaces); //*pExpr
  p.optional([TokenType.WhiteSpace]);
  p.expect([TokenType.CloseParen]);
  return expression;
}

// export function parseGroupingExpressionWhitespace(p: Parser): Expression {
//   //TODO

//   p.expect([TokenType.WhiteSpace]);
//   const expression = parseExpression(p, BindingPower.default_bp);
//   p.expect([TokenType.CloseParen]);

//   return expression;

//   /*

//   */
// }

/* ---------------------------------- Stmt ---------------------------------- */
export async function parseExpressionStatement(p: Parser): Promise<ExpressionStatement> {
  const start = p.getPosition();
  const expression = await p.executeHandler(ParsingFunctionMaps.createNudHandler(BindingPower.default_bp, parseExpression), Infinity); //*pExpr
  p.expect([TokenType.EndOfStatement]); //~ This could be parseEndOfStatement and could handle new lines and more complicated end of statement logic

  return createAstNode(AstNodeKind.ExpressionStatement, { start, expression });
}

export async function parseBlockStatement(p: Parser): Promise<BlockStatement> {
  p.expect([TokenType.OpenCurly]);
  const body: Statement[] = [];
  while (p.hasToken()) {
    body.push(await p.executeHandler(parseStatement));
  }
  p.expect([TokenType.CloseCurly]);
  return createAstNode(AstNodeKind.BlockStatement, { body });
}

export async function parseVariableDeclarationStatement(p: Parser): Promise<VariableDeclarationStatement> {
  const assignmentModifier = p.expect([TokenType.Const, TokenType.Var]);
  if (p.options.useSignificantWhitespace) {
    throw new NotImplementedError("useSignificantWhitespace", parseFunctionDeclarationStatement);
  } else {
    p.optional([TokenType.WhiteSpace]);
  }
  const mutationModifier = p.expect([TokenType.Const, TokenType.Var]);
  if (p.options.useSignificantWhitespace) {
    throw new NotImplementedError("useSignificantWhitespace", parseFunctionDeclarationStatement);
  } else {
    p.optional([TokenType.WhiteSpace]);
  }
  const superglobal = p.optional([TokenType.Const]);
  if (p.options.useSignificantWhitespace) {
    throw new NotImplementedError("useSignificantWhitespace", parseFunctionDeclarationStatement);
  } else {
    p.optional([TokenType.WhiteSpace]);
  }

  const modifiers: VariableModifiers = { canReassign: assignmentModifier.type === TokenType.Var, canMutate: mutationModifier.type === TokenType.Var, superglobal: false };
  if (
    assignmentModifier.type === TokenType.Const &&
    mutationModifier.type === TokenType.Const &&
    superglobal !== null
  ) {
    modifiers.superglobal = true;
  }

  const identifier = p.expect([TokenType.Identifier]);
  if (p.options.useSignificantWhitespace) {
    throw new NotImplementedError("useSignificantWhitespace", parseFunctionDeclarationStatement);
  } else {
    p.optional([TokenType.WhiteSpace]);
  }

  if (p.options.useLifetime) {
    // const lifetime = p.executeHandler(parseLifetime)
    throw new NotImplementedError("lifetime", parseVariableDeclarationStatement);
  }
  const lifetime = undefined;
  if (p.options.useTypes) {
    // const lifetime = p.executeHandler(parseLifetime)
    throw new NotImplementedError("types", parseVariableDeclarationStatement);
  }

  let value: Expression | undefined = undefined;
  const assignment = p.optional([TokenType.Assignment]);
  if (p.options.useSignificantWhitespace) {
    throw new NotImplementedError("useSignificantWhitespace", parseFunctionDeclarationStatement);
  } else {
    p.optional([TokenType.WhiteSpace]);
  }

  if (assignment !== null) {
    // We can't use combined assignment in the declaration
    if (assignment.operator === undefined) {
      value = await p.executeHandler(ParsingFunctionMaps.createNudHandler(BindingPower.default_bp, parseExpression), Infinity);
    } else {
      throw p.exit(`We can't use combined assignment in a variable declaration. Found operator ${TokenType[assignment.operator]}`);
    }
  }
  p.expect([TokenType.EndOfStatement]);

  return createAstNode(AstNodeKind.VariableDeclarationStatement, {
    name: identifier.type === TokenType.Identifier ? identifier.value : "",
    modifiers,
    value,
    lifetime,
  });
}

export async function parseFunctionDeclarationStatement(p: Parser): Promise<FunctionDeclarationStatement> {
  const async = p.optional([TokenType.Async]);
  if (p.options.useSignificantWhitespace) {
    throw new NotImplementedError("useSignificantWhitespace", parseFunctionDeclarationStatement);
  } else {
    p.optional([TokenType.WhiteSpace]);
  }

  p.expect([TokenType.Function]);

  if (p.options.useSignificantWhitespace) {
    throw new NotImplementedError("useSignificantWhitespace", parseFunctionDeclarationStatement);
  } else {
    p.optional([TokenType.WhiteSpace]);
  }

  const identifier = p.expect([TokenType.Identifier]);

  if (p.options.useSignificantWhitespace) {
    throw new NotImplementedError("useSignificantWhitespace", parseFunctionDeclarationStatement);
  } else {
    p.optional([TokenType.WhiteSpace]);
  }

  const parameters = parseFunctionParametersDeclaration(p);

  if (p.options.useSignificantWhitespace) {
    throw new NotImplementedError("useSignificantWhitespace", parseFunctionDeclarationStatement);
  } else {
    p.optional([TokenType.WhiteSpace]);
  }

  p.expect([TokenType.Arrow]);

  if (p.options.useSignificantWhitespace) {
    throw new NotImplementedError("useSignificantWhitespace", parseFunctionDeclarationStatement);
  } else {
    p.optional([TokenType.WhiteSpace]);
  }

  let body: ExpressionStatement | BlockStatement | BranchingStatement<ExpressionStatement | BlockStatement>;
  if (p.optional([TokenType.OpenCurly]) !== null) { //!!! This doesn't work. We are eating the curly when it should be block statement that handles that. We need a way to give more than 1 thing to execute.
    body = await p.executeHandler(parseBlockStatement);
  } else {
    body = await p.executeHandler(parseExpressionStatement);
  }

  return createAstNode(AstNodeKind.FunctionDeclarationStatement, {
    name: identifier.value,
    parameters,
    isAsync: async !== null,
    body,
  });
}

function parseFunctionParametersDeclaration(p: Parser): FunctionParameterDeclaration[] {
  if (!p.options.useSignificantWhitespace) {
    p.expect([TokenType.OpenParen]);
  } else {
    throw new NotImplementedError("useSignificantWhitespace", parseFunctionParametersDeclaration);
  }

  const parameters: FunctionParameterDeclaration[] = [];
  while (true) {
    const identifier = p.expect([TokenType.Identifier]);
    if (p.options.useLifetime) {
      // const lifetime = p.executeHandler(parseLifetime)
      throw new NotImplementedError("lifetime", parseFunctionParametersDeclaration);
    }
    if (p.options.useTypes) {
      // const lifetime = p.executeHandler(parseLifetime)
      throw new NotImplementedError("types", parseFunctionParametersDeclaration);
    }
    parameters.push({ identifier: identifier.value });

    const comma = p.optional([TokenType.CommaDelimiter]);
    if (comma === null) {
      break;
    }
    if (p.options.useSignificantWhitespace) {
      throw new NotImplementedError("useSignificantWhitespace", parseFunctionParametersDeclaration);
    }
  }
  if (!p.options.useSignificantWhitespace) {
    p.expect([TokenType.CloseParen]);
  } else {
    throw new NotImplementedError("useSignificantWhitespace", parseFunctionParametersDeclaration);
  }

  return parameters;
}

export async function parseReturnStatement(p: Parser): Promise<ReturnStatement> {
  p.expect([TokenType.Return]);
  const expression = await p.executeHandler(ParsingFunctionMaps.createNudHandler(BindingPower.default_bp, parseExpression), Infinity);
  p.expect([TokenType.EndOfStatement]);
  return createAstNode(AstNodeKind.ReturnStatement, { argument: expression });
}

export async function parseIfStatement(p: Parser): Promise<IfStatement> {
  p.expect([TokenType.If]);

  if (!p.options.useSignificantWhitespace) {
    p.expect([TokenType.OpenParen]);
  } else {
    throw new NotImplementedError("useSignificantWhitespace", parseIfStatement);
  }

  const test = await p.executeHandler(ParsingFunctionMaps.createNudHandler(BindingPower.default_bp, parseExpression), Infinity);

  if (!p.options.useSignificantWhitespace) {
    p.expect([TokenType.CloseParen]);
  } else {
    throw new NotImplementedError("useSignificantWhitespace", parseIfStatement);
  }

  const consequent = await p.executeHandler(parseBlockStatement);

  let alternate: IfStatement | BlockStatement | undefined | BranchingStatement<IfStatement | BlockStatement>;
  if (p.expect([TokenType.Else])) {
    if (p.optional([TokenType.If])) {
      alternate = await p.executeHandler(parseIfStatement);
    } else {
      alternate = await p.executeHandler(parseBlockStatement);
    }
  }

  return createAstNode(AstNodeKind.IfStatement, { test, consequent, alternate });
}

export async function parseWhenStatement(p: Parser): Promise<WhenStatement> {
  p.expect([TokenType.When]);
  if (!p.options.useSignificantWhitespace) {
    p.expect([TokenType.OpenParen]);
  } else {
    throw new NotImplementedError("useSignificantWhitespace", parseWhenStatement);
  }

  const test = await p.executeHandler(ParsingFunctionMaps.createNudHandler(BindingPower.default_bp, parseExpression), Infinity);

  if (!p.options.useSignificantWhitespace) {
    p.expect([TokenType.CloseParen]);
  } else {
    throw new NotImplementedError("useSignificantWhitespace", parseWhenStatement);
  }

  const consequent = await p.executeHandler(parseBlockStatement);

  return createAstNode(AstNodeKind.WhenStatement, { test, consequent });
}

function parseClassDeclarationStatement() {}

function parseDeleteStatement() {}

function parseReverseStatement() {}

function parseImportStatement() {}

function parseExportStatement() {}

/* ---------------------------------- Expr ---------------------------------- */
export async function parseAssignmentExpression(p: Parser, left: Expression, bp: BindingPower, nbSpaces: number): Promise<AssignmentExpression> {
  // Make sure we only assign to a symbol or member because they are the only thing that can be assigned a value.
  if (left.kind !== AstNodeKind.SymbolExpression && left.kind !== AstNodeKind.MemberExpression) { //!!! This doesn't work for branching. Add a way to filter a branching to specific nodes
    throw p.exit("Can only assign a value to a SymbolExpression or a MemberExpression.");
  }

  const assignment = p.expect([TokenType.Assignment]);
  let value = await p.executeHandler(ParsingFunctionMaps.createNudHandler(bp, parseExpression), nbSpaces);

  // Create a new operation if we have an operator assignment
  if (assignment.operator !== undefined) {
    value = createAstNode(AstNodeKind.BinaryExpression, { left: left, operator: assignment.operator, right: value });
  }

  return createAstNode(AstNodeKind.AssignmentExpression, {
    assigne: left as SymbolExpression | MemberExpression | BranchingStatement<SymbolExpression | MemberExpression>,
    assignedValue: value,
  });
}

export async function parsePrefixExpression(p: Parser, bp: BindingPower, nbSpaces: number): Promise<PrefixExpression> {
  const prefix = p.expect([TokenType.LogicalNot, TokenType.BitwiseNot, TokenType.UnaryMinus]);

  const expression = await p.executeHandler(ParsingFunctionMaps.createNudHandler(bp, parseExpression), nbSpaces);

  return createAstNode(AstNodeKind.PrefixExpression, { prefix: prefix.type, right: expression });
}

export async function parseStateExpression(p: Parser, bp: BindingPower, nbSpaces: number): Promise<StateExpression> {
  const operator = p.expect([TokenType.PlusPlus, TokenType.MinusMinus, TokenType.Previous, TokenType.Current, TokenType.Next]);

  const expression = await p.executeHandler(ParsingFunctionMaps.createNudHandler(bp, parseExpression), nbSpaces);
  if (![AstNodeKind.SymbolExpression, AstNodeKind.MemberExpression].includes(expression.kind)) {
    throw p.exit(`Expected a SymbolExpression or a MemberExpression but got a ${expression.kindName} instead.`);
  }

  return createAstNode(AstNodeKind.StateExpression, { operator: operator.type, argument: expression as SymbolExpression | MemberExpression });
}

export async function parseBinaryExpression(p: Parser, left: Expression, bp: BindingPower, nbSpaces: number): Promise<BinaryExpression> {
  const operator = p.expect([...BinaryOperators]);
  const right = await p.executeHandler(ParsingFunctionMaps.createNudHandler(bp, parseExpression), nbSpaces);

  return createAstNode(AstNodeKind.BinaryExpression, { left, operator: operator.type, right });
}

export function parsePrimaryExpression(p: Parser, bp: BindingPower, nbSpaces: number): NumberExpression | StringExpression | SymbolExpression {
  const token = p.expect([TokenType.Number, TokenType.String, TokenType.Identifier]);

  switch (token.type) {
    case TokenType.Number: {
      return createAstNode(AstNodeKind.NumberExpression, { value: token.value, end: p.getPosition() });
    }
    case TokenType.String: {
      return createAstNode(AstNodeKind.StringExpression, { value: token.value, end: p.getPosition() });
    }
    case TokenType.Identifier: {
      return createAstNode(AstNodeKind.SymbolExpression, { symbol: token.value, end: p.getPosition() });
    }
  }
}

export function parseObjectDeclarationExpression() {}

export function parseArrayDeclarationExpression() {}

export async function parseMemberExpression(p: Parser, left: Expression, bp: BindingPower, nbSpaces: number): Promise<MemberExpression> {
  let computed: boolean = false;
  let property: SymbolExpression | Expression;

  if (p.optional([TokenType.Dot])) {
    property = await p.executeHandler(ParsingFunctionMaps.createNudHandler(bp, parseExpression), nbSpaces);
    // when using the dot notation, we can only use a symbol.
    if (![AstNodeKind.SymbolExpression].includes(property.kind)) {
      throw p.exit(`Expected a SymbolExpression but got a ${property.kindName} instead.`);
    }
  } else {
    p.expect([TokenType.OpenBracket]);
    computed = true;
    property = await p.executeHandler(ParsingFunctionMaps.createNudHandler(bp, parseExpression), nbSpaces);
    p.expect([TokenType.CloseBracket]);
  }

  return createAstNode(AstNodeKind.MemberExpression, {
    object: left,
    property,
    computed,
  });
}

export async function parseCallExpression(p: Parser, left: Expression, bp: BindingPower, nbSpaces: number): Promise<CallExpression> {
  if (![AstNodeKind.SymbolExpression, AstNodeKind.MemberExpression].includes(left.kind)) {
    throw p.exit(`Expected a SymbolExpression or MemberExpression but got a ${left.kindName} instead.`);
  }

  if (!p.options.useSignificantWhitespace) {
    p.expect([TokenType.OpenParen]);
  } else {
    throw new NotImplementedError("useSignificantWhitespace", parseCallExpression);
  }

  const callArguments: Expression[] = [];
  while (true) {
    const expression = await p.executeHandler(ParsingFunctionMaps.createNudHandler(bp, parseExpression), nbSpaces);
    callArguments.push(expression);

    const comma = p.optional([TokenType.CommaDelimiter]);
    if (comma === null) {
      break;
    }
  }

  if (!p.options.useSignificantWhitespace) {
    p.expect([TokenType.CloseParen]);
  } else {
    throw new NotImplementedError("useSignificantWhitespace", parseCallExpression);
  }

  return createAstNode(AstNodeKind.CallExpression, { callee: left, arguments: callArguments });
}
