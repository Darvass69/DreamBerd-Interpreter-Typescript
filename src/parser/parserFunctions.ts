import {BinaryOperators, TokenType} from "../lexer/token";
import {
  AstNodeKind,
  BinaryExpression,
  BlockStatement,
  createAstNode,
  Expression,
  ExpressionStatement,
  NumberExpression,
  Statement,
  StringExpression,
  SymbolExpression,
} from "./astNodes";
import { BindingPower } from "./bindingPower";
import { Checkpoint } from "./branches/checkpoint";
import Lookups, { LedHandler, NudHandler } from "./lookups";
import Parser, { options } from "./parser";


/* --------------------------------- Program -------------------------------- */
export async function parseProgram(p: Parser): Promise<BlockStatement> {
  const body: Statement[] = [];
  while (p.hasToken()) {
    body.push(await p.executeHandler(parseStatement));
  }
  return createAstNode(AstNodeKind.BlockStatement, {body});
}

export async function parseStatement(p: Parser): Promise<Statement> {
  p.optional([TokenType.WhiteSpace]);
  return p.executeHandler(p.getStmt());
}

export async function parseExpression(p: Parser, bp: BindingPower, nbSpaces: number): Promise<Expression> {
  // if (options.useSignificantWhitespace) {
  //   //
  // }

  // NUDs check the spacing before and after themselves, LEDs only need to pass it down.

  // if (nbSpaces != parseSpaces()) {
  //   p.exit();
  // }

  p.optional([TokenType.WhiteSpace]);

  const nud_handler = p.getNud(bp);
  if (nud_handler === undefined) {
    p.exit();
  }

  let left = await p.executeHandler(nud_handler, nbSpaces);
  p.optional([TokenType.WhiteSpace]); //! this will be a problem. We can't always eat this one, sometimes we might need to keep it to parse the next grouping
  
  let led_handler: LedHandler | null = p.getLed(bp);
  while (led_handler != null) { //! we need to add a branch with null
    left = await p.executeHandler(led_handler, left, nbSpaces);
    p.optional([TokenType.WhiteSpace]);
    led_handler = p.getLed(bp);
  }
  return left;
}

// Essentially a NUD, but its whitespace counterpart is way more complicated
export async function parseGroupingExpressionParen(p: Parser, bp: BindingPower, nbSpaces: number): Promise<Expression> {
  p.expect([TokenType.OpenParen]);
  const expression = await p.executeHandler(Lookups.createNudHandler(BindingPower.default_bp, parseExpression), nbSpaces);
  p.expect([TokenType.CloseParen]);
  return expression;
}

// export function parseGroupingExpressionWhitespace(p: Parser): Expression {

//   p.expect([TokenType.WhiteSpace]);
//   const expression = parseExpression(p, BindingPower.default_bp);
//   p.expect([TokenType.CloseParen]);

//   return expression;
// }

    /*
      Spaces are a bit complicated. When getting a NUD, we have 3 possibilities:
        left < right (_NUD__) -> we need to close the group. We return the NUD and add a futur choice to close the group
        left == right (__NUD__) -> we return the NUD
        left > right (__NUD_) -> we need to open a group.
          we first return parseGroupingExpression as the handler, it will eat the space.
          Then we are back here, we are still looking for a NUD and we still have left > right, so we need to do something different.
          The only difference now is that we are one token later, so when we are passed the space, we don't open a group.
    */

            // private nextNonSpaces(expected: TokenType[]): [leftSpaces: number, current: TokenType | null, rightSpaces: number, isPassedSpace: boolean] {
  //   this.hideLogs = true;
  //   const keepSpacePosition = this.state.position;
  //   const [left, isPassedSpace] = this.parseSpace();

  //   const skipSpacePosition = this.state.position;
    
  //   // We keep the old position to change it back after we do our things
  //   const type = this.optional(expected)?.type ?? null;
  //   const [right] = this.parseSpace();

  //   // When we don't need to parse the space, we skip it
  //   if (left > right && !isPassedSpace || isNil(type)) {
  //     this.state.position = keepSpacePosition;
  //   } else {
  //     this.state.position = skipSpacePosition;
  //   }

  //   console.log("End space", this.state.position, left, type, right, isPassedSpace);
  //   this.hideLogs = false;
  //   return [left, type, right, isPassedSpace];
  // }

  // private parseSpace(): [left: number, isPassedSpace: boolean] {
  //   let nbSpaces = 0;
  //   let isPassedSpace = false;
  //   let foundSomething = false;

  //   while (true) {
  //     if (this.state.position === 0) {
  //       isPassedSpace = true;
  //       nbSpaces = Infinity;
  //     }
  //     const optional = this.optional([TokenType.WhiteSpace/*TODO , TokenType.LineBreak*/]);
  //     if (isNil(optional)) {
  //       break;
  //     }
  //     foundSomething = true;

  //     if (optional.type == TokenType.WhiteSpace) {
  //       nbSpaces += optional.nbSpaces ?? 0;
  //     }
  //   }

  //   if (!foundSomething) {
  //     // check previous token to see if its a space
  //     const previousSpace = references.tokens.find((token) => token.start + (token.WhiteSpace?.nbSpaces ?? 0) === this.state.position)?.WhiteSpace;
  //     if (!isNil(previousSpace)) {
  //       nbSpaces = previousSpace.nbSpaces; 
  //       isPassedSpace = true;
  //     }
  //   }

  //   return [nbSpaces, isPassedSpace];
  // }

  // private peekNextSpaces(): number {
  //   //TODO somewhat incomplete, if we have a new line, we need to count the spaces after.
  //   return this.current().WhiteSpace?.nbSpaces ?? 0;
  // }

// let openGroup: boolean = false;
//     let closeGroup: boolean = false;
//     if (left > right && !isPassedSpace) {
//       //! isPassedSpace might not be useful
//       // Open grouping
//       openGroup = true;
//     }
//     if (left < right) {
//       // Close grouping
//       closeGroup = true;
//     }

//     references.lookups.getNud(current as TokenType, bp)?.forEach((handler) => {
//       if (openGroup) {
//         handlers.push([parseGroupingExpression, handler]);
//       } else if (closeGroup) {
//         handlers.push([handler, null]);
//       } else {
//         handlers.push([handler]);
//       }
//     });


/* ---------------------------------- Stmt ---------------------------------- */
export async function parseExpressionStatement(p: Parser): Promise<ExpressionStatement> {
  const start = p.getPosition();
  // const expression = parseExpression(p, BindingPower.default_bp, Infinity);
  const expression = await p.executeHandler(Lookups.createNudHandler(BindingPower.default_bp, parseExpression), Infinity);
  p.expect([TokenType.EndOfStatement]); //~ This could be parseEndOfStatement and could handle new lines

  return createAstNode(AstNodeKind.ExpressionStatement, {start, expression});
}


/* ---------------------------------- Expr ---------------------------------- */
export async function parseBinaryExpression(p: Parser, left: Expression, bp: BindingPower, nbSpaces: number): Promise<BinaryExpression> {
	// We assume we are already at the operator token
	const operator = p.expect([...BinaryOperators]);
	const right = await p.executeHandler(Lookups.createNudHandler(bp, parseExpression), nbSpaces);

	return createAstNode(AstNodeKind.BinaryExpression, {left, operator: operator.type, right});
}

export function parsePrimaryExpression(p: Parser, bp: BindingPower, nbSpaces: number): NumberExpression | StringExpression | SymbolExpression {
  const token = p.expect([TokenType.Number, TokenType.String, TokenType.Identifier]);

	switch (token.type) {
		case TokenType.Number: {
			return createAstNode(AstNodeKind.NumberExpression, {value: token.value, end: p.getPosition()});
		}
		case TokenType.String: {
			return createAstNode(AstNodeKind.StringExpression, {value: token.value, end: p.getPosition()});
		}
		case TokenType.Identifier: {
			return createAstNode(AstNodeKind.SymbolExpression, {symbol: token.value, end: p.getPosition()});
		}
		default: {
			return createAstNode(AstNodeKind.StringExpression, {value: ""});
		}
	}
}

// const fn = (parser: Parser, nbSpaces: number) => parseExpression(parser, BindingPower.default_bp, nbSpaces)
// fn.bp = BindingPower.default_bp;
// const testCheckpoint = Checkpoint.new(0, fn, [Infinity]);






















// const ignoredTypes = new Set([TokenType.WhiteSpace, TokenType.LineBreak]);
// function goToNextMeaningfulToken(parser: Parser): Token {
//   while (ignoredTypes.has(parser.currentToken().type)) {
//     parser.advance();
//   }
//   return parser.currentToken();
// }

// /* --------------------------------- Parsing -------------------------------- */
// export function parseStatement(parser: Parser): Statement {
//   const stmt_handler = parser.lookups.getStmt(goToNextMeaningfulToken(parser))[0];

//   if (stmt_handler != undefined) {
//     return stmt_handler(parser);
//   }

//   // skip to parse expression
//   return parseExpressionStatement(parser);
// }

// export function parseExpression(parser: Parser, bp: BindingPower): Expression {
//   // We expect a nud at the start of an expression
//   const [exists, nud_handler, _] = parser.lookups.getNud(goToNextMeaningfulToken(parser));

//   if (!exists) {
//     console.error(
//       `Expected NUD handler for token ${TokenToString(parser.currentToken())} at token ${parser.getPosition()}`
//     );
//     process.exit(1);
//   }
//   let left = nud_handler(parser);

//   let led:  [boolean, LedHandler, BindingPower];
//   while ((led = parser.lookups.getLed(goToNextMeaningfulToken(parser)))[2] > bp) {
//     const [exists, led_handler, led_bp] = led;
    
//     if (!exists) {
//       console.error(
//         `Expected LED handler for token ${TokenToString(parser.currentToken())} at token ${parser.getPosition()}`
//       );
//       process.exit(1);
//     }

//     left = led_handler(parser, left, led_bp);
//   }

//   return left;
// }

// /* ------------------------------- Statements ------------------------------- */
// export function parseExpressionStatement(parser: Parser): ExpressionStatement {
//   const expression = parseExpression(parser, BindingPower.default_bp);
//   parser.expect(EndOfLineTokens);

//   return createAstNode(AstNodeKind.ExpressionStatement, {expression});
// }

// export function parseBlockStatement(parser: Parser): BlockStatement {
//   parser.expect([TokenType.OpenCurly]);
//   const body: Statement[] = [];

//   while (
//     parser.hasToken() &&
//     !parser.expect([TokenType.CloseCurly], undefined, false, false)[0]
//   ) {
//     // expect indent
//     body.push(parseStatement(parser));
//   }

//   parser.expect([TokenType.CloseCurly]);
//   return createAstNode(AstNodeKind.BlockStatement, {body});
// }

// export function parseVariableDeclarationStatement(parser: Parser): VariableDeclarationStatement {
//   const modifier1 = parser.expectIdentifier(["const", "var"])[1];
//   const modifiers: [canReassign: Modifiers, canMutate: Modifiers] = [Modifiers.None, Modifiers.None];
//   if (modifier1.value == "const") {
//     modifiers[0] = Modifiers.Const;
//   } else if (modifier1.value == "var") {
//     modifiers[0] = Modifiers.Var;
//   }

//   const modifier2 = parser.expectIdentifier(["const", "var"])[1];
//   if (modifier2.value == "const") {
//     modifiers[1] = Modifiers.Const;;
//   } else if (modifier2.value == "var") {
//     modifiers[1] = Modifiers.Var;
//   }

//   const identifierToken = parser.expect([TokenType.Identifier])[1];
//   const identifier = identifierToken.value;

//   //TODO
//   const lifetime = undefined;

//   //TODO
//   // type

//   let value: Expression | undefined = undefined;
//   const [assignment] = parser.expect([TokenType.EqualSign], undefined, false, false);
//   if (assignment) {
//     parser.expect([TokenType.EqualSign]);
//     value = parseExpression(parser, BindingPower.default_bp);
//   }
//   parser.expect(EndOfLineTokens);

//   return createAstNode(AstNodeKind.VariableDeclarationStatement, {
//     name: identifier,
//     modifiers,
//     ...(value == undefined ? undefined : {value}),
//     ...(lifetime == undefined ? undefined : {lifetime}),
//   });
// }

// export function parseFunctionDeclarationStatement(parser: Parser): FunctionDeclarationStatement {
//   const [isAsync] = parser.expectIdentifier(["async"], undefined, false, false);
//   if (isAsync) {
//     parser.advance();
//   }

//   parser.expectIdentifier(["function"]);
//   const [, identifier] = parser.expect([TokenType.Identifier]);
//   parser.expect([TokenType.OpenParen]);
//   const parameters = parseFunctionParameters(parser);
//   parser.expect([TokenType.CloseParen]);

//   parser.expect([TokenType.Arrow]);
  
//   let body: ExpressionStatement | BlockStatement;
//   if (parser.expect([TokenType.OpenCurly], undefined, false, false)[0]) {
//     body = parseBlockStatement(parser);
//   } else {
//     body = parseExpressionStatement(parser);
//   }

//   return createAstNode(AstNodeKind.FunctionDeclarationStatement, {
//     name: identifier,
//     parameters,
//     isAsync,
//     body
//   });

//   function parseFunctionParameters(parser: Parser): FunctionParameter[] {
//     let isFirstPass = true;
//     const parameters: FunctionParameter[] = [];
//     while (parser.currentToken().type != TokenType.CloseParen) {
//       if (!isFirstPass) {
//         parser.expect([TokenType.Comma]);
//       }
//       const [, token] = parser.expect([TokenType.Identifier]);
//       parameters.push({identifier: token});
  
//       isFirstPass = false;
//     }
//     return parameters;
//   }
// }

// export function parseReturnStatement(parser: Parser): ReturnStatement {
//   parser.expectIdentifier(["return"]);
//   const expression = parseExpression(parser, BindingPower.default_bp);
//   parser.expect(EndOfLineTokens);
//   return createAstNode(AstNodeKind.ReturnStatement, {argument: expression});
// }

// export function parseIfStatement(parser: Parser): IfStatement {
//   parser.expectIdentifier(["if"]);
//   parser.expect([TokenType.OpenParen]);
//   const test = parseExpression(parser, BindingPower.default_bp);
//   parser.expect([TokenType.CloseParen]);
  
//   const consequent = parseBlockStatement(parser);

//   let alternate: IfStatement | BlockStatement | undefined;
//   if (parser.expectIdentifier(["else"], undefined, false, false)[0]) {
//     parser.expectIdentifier(["else"]);
//     if (parser.expectIdentifier(["if"], undefined, false, false)[0]) {
//       alternate = parseIfStatement(parser);
//     } else {
//       alternate = parseBlockStatement(parser);
//     }
//   }

//   return createAstNode(AstNodeKind.IfStatement, {test, consequent, ...(alternate == undefined ? undefined : {alternate}),});
// }

// export function parseWhenStatement(parser: Parser) {
//   parser.expectIdentifier(["when"]);
//   parser.expect([TokenType.OpenParen]);
//   const test = parseExpression(parser, BindingPower.default_bp);
//   parser.expect([TokenType.CloseParen]);
  
//   const consequent = parseBlockStatement(parser);

//   return createAstNode(AstNodeKind.WhenStatement, {test, consequent});
// }

// function parseClassDeclarationStatement() {}

// function parseDeleteStatement() {}

// function parseReverseStatement() {}

// function parseImportStatement() {}

// function parseExportStatement() {}

// /* ------------------------------- Expressions ------------------------------ */
// export function parseAssignmentExpression(parser: Parser, left: Expression, bp: BindingPower): AssignmentExpression {
//   // Make sure we only assign to a symbol or member because they are the only thing that can be assigned a value.
//   if (left.kind != AstNodeKind.SymbolExpression && left.kind != AstNodeKind.MemberExpression) {
//     parser.exit();
//   }

//   const [, assignment] = parser.expect([TokenType.CombinedAssignment, TokenType.EqualSign]);
//   let value = parseExpression(parser, BindingPower.assignment);

//   // Create a new operation if we have an operator assignment
//   if (assignment.type == TokenType.CombinedAssignment) {
//     value = createAstNode(AstNodeKind.BinaryExpression, {left: left, operator: assignment, right: value})
//   }

//   return createAstNode(AstNodeKind.AssignmentExpression, {
//     assigne: left as SymbolExpression | MemberExpression,
//     assignedValue: value,
//     // ...(assignment.type == TokenType.CombinedAssignment ? {operator: assignment} : undefined)
//   });
// }

// export function parseGroupingExpression(parser: Parser): Expression {
//   parser.expect([TokenType.OpenParen]);
//   const expression = parseExpression(parser, BindingPower.default_bp);
//   parser.expect([TokenType.CloseParen]);
//   return expression;
// }

// export function parsePrefixExpression(parser: Parser): PrefixExpression {
//   const [,prefix] = parser.expect([TokenType.Subtract, TokenType.LogicalNot, TokenType.BitwiseNot]);

//   const expression = parseExpression(parser, BindingPower.prefix);

//   return createAstNode(AstNodeKind.PrefixExpression, {prefix, right: expression});
// }

// export function parseStateExpression(parser: Parser) {
//   let operator: Token;
//   if (parser.expectIdentifier(["previous", "next", "current"], undefined, false, false)[0]){
//     [,operator] = parser.expectIdentifier(["previous", "next", "current"]);
//   } else {
//     [,operator] = parser.expect([TokenType.PlusPlus, TokenType.MinusMinus]);
//   }

//   const expression = parseExpression(parser, BindingPower.prefix);
//   if (! [AstNodeKind.SymbolExpression, AstNodeKind.MemberExpression].includes(expression.kind)) {
//     console.error(`Expected a variable expression but instead got ${JSON.stringify(expression, ignoreKeys, 2)}`);
//     parser.exit();
//   }

//   return createAstNode(AstNodeKind.StateExpression, {operator, argument: expression as SymbolExpression | MemberExpression});
// }

// export function parseBinaryExpression(parser: Parser, left: Expression, bp: BindingPower): BinaryExpression {
// 	// We assume we are already at the operator token
// 	const operator = parser.advance();
// 	const right = parseExpression(parser, bp);

// 	return createAstNode(AstNodeKind.BinaryExpression, {left, operator, right});
// }

// export function parsePrimaryExpression(parser: Parser): NumberExpression | StringExpression | SymbolExpression {
// 	const [, token] = parser.expect([TokenType.Number, TokenType.String, TokenType.Identifier]);
// 	switch (token.type) {
// 		case TokenType.Number: {
// 			return createAstNode(AstNodeKind.NumberExpression, {value: Number(token.value)});
// 		}
// 		case TokenType.String: {
// 			return createAstNode(AstNodeKind.StringExpression, {value: token.value});
// 		}
// 		case TokenType.Identifier: {
// 			return createAstNode(AstNodeKind.SymbolExpression, {symbol: token.value});
// 		}
// 		default: {
// 			return createAstNode(AstNodeKind.StringExpression, {value: ""});
// 		}
// 	}
// }

// export function parseObjectDeclarationExpression() {}

// export function parseArrayDeclarationExpression() {}

// export function parseMemberExpression(parser: Parser, left: Expression, bp: BindingPower): MemberExpression {
//   let computed: boolean = false;
//   let property: SymbolExpression | Expression;

//   //! This is not the right way to do it. We should be doing expect and passing an empty array as ignored.
//   if (parser.currentToken().type == TokenType.Dot) {
//     parser.expect([TokenType.Dot]);
//     property = parseExpression(parser, bp);
//     // we can only have a symbol when using the dot notation
//     if (property.kind != AstNodeKind.SymbolExpression && property.kind != AstNodeKind.NumberExpression) {
//       parser.exit(`When parsing memberExpression, expected SymbolExpression or NumberExpression but got ${property.kindName} instead`);
//     }
//   } else if (parser.currentToken().type == TokenType.OpenBracket) {
//     parser.expect([TokenType.OpenBracket]);
//     computed = true;
//     property = parseExpression(parser, BindingPower.default_bp);
//     parser.expect([TokenType.CloseBracket]);
//   } else {
//     parser.exit();
//     property = createAstNode(AstNodeKind.None, {});
//   }

//   return createAstNode(AstNodeKind.MemberExpression, {
//     object: left,
//     property,
//     computed
//   });
// }

// export function parseCallExpression(parser: Parser, left: Expression, bp: BindingPower): CallExpression {
//   parser.expect([TokenType.OpenParen]);

//   // parse arguments
//   let isFirstPass = true;
//   const callArguments: Expression[] = [];
//   while (parser.currentToken().type != TokenType.CloseParen) {
//     if (!isFirstPass) {
//       parser.expect([TokenType.Comma]);
//     }
//     const expression = parseExpression(parser, BindingPower.default_bp);
//     callArguments.push(expression);

//     isFirstPass = false;
//   }

//   parser.expect([TokenType.CloseParen]);
  
//   return createAstNode(AstNodeKind.CallExpression, {callee: left, arguments: callArguments});
// }