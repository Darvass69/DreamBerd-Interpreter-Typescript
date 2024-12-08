import { BinaryOperators, TokenType } from "../lexer/token";
// import { AstNodeKind, BinaryExpression, BlockStatement, createAstNode, Expression, ExpressionStatement, NumberExpression, Statement, StringExpression, SymbolExpression } from "./astNodes";
// import { Checkpoint } from "./branches/checkpoint";
// import { LedHandler } from "./lookups";
// import { BindingPower } from "./BindingPower";
// import Parser from "./parser";










// /* --------------------------------- Program -------------------------------- */
// export function parseProgram(p: Parser): BlockStatement {
//   const body: Statement[] = [];
//   while (p.hasToken()) {
//     body.push(parseStatement(p));
//   }
//   return createAstNode(AstNodeKind.BlockStatement, {body});
// }

// /* ---------------------------------- Stmt ---------------------------------- */
// export function parseStatement(p: Parser): Statement {
//   // we create branches with all the possibilities inside getStmt
//   return p.getStmt()(p);
// }

// export function parseExpressionStatement(p: Parser): ExpressionStatement {
//   // const expression = parseExpression(p, BindingPower.default_bp);
//   // p.expect(EndOfLineTokens); //~ This could be parseEndOfLine

//   // return createAstNode(AstNodeKind.ExpressionStatement, {expression});
//   p.changeCheckpoint(testCheckpoint);
//   testCheckpoint.parseFunction(p);
//   const expression = testCheckpoint.result;
//   p.expect([TokenType.EndOfStatement]); //~ This could be parseEndOfLine

//   return createAstNode(AstNodeKind.ExpressionStatement, {expression});
// }


// /* ---------------------------------- Expr ---------------------------------- */
// export function parseExpression(p: Parser, bp: BindingPower): Expression {
//   const nud_handler = p.getNud(bp);
//   if (nud_handler === undefined) {
//     p.exit();
//   }
  
//   let left = nud_handler(p);
//   let led_handler: LedHandler | null;
//   while ((led_handler = p.getLed(bp)) != null) { //! we need to add a branch with null
//     left = led_handler(p, left);
//   }
//   return left;
// }

// export function parseGroupingExpression(p: Parser): Expression {
  
//     /*
//     closing a group might get messy because we can't eat the token and we want to create branches with 2 choices at the same time.
//     type RecurringTuple = [string, number, RecurringTuple[]];
//     */

//   p.expect([TokenType.OpenParen]);
//   const expression = parseExpression(p, BindingPower.default_bp);
//   p.expect([TokenType.CloseParen]);
//   return expression;
// }

// export function parseBinaryExpression(p: Parser, left: Expression, bp: BindingPower): BinaryExpression {
// 	// We assume we are already at the operator token
// 	const operator = p.expect([...BinaryOperators]);
// 	const right = parseExpression(p, bp);

// 	return createAstNode(AstNodeKind.BinaryExpression, {left, operator: operator.type, right});
// }

// export function parsePrimaryExpression(p: Parser): NumberExpression | StringExpression | SymbolExpression {
//   const token = p.expect([TokenType.Number, TokenType.String, TokenType.Identifier]);

// 	switch (token.type) {
// 		case TokenType.Number: {
// 			return createAstNode(AstNodeKind.NumberExpression, {value: token.value.value});
// 		}
// 		case TokenType.String: {
// 			return createAstNode(AstNodeKind.StringExpression, {value: token.value.value});
// 		}
// 		case TokenType.Identifier: {
// 			return createAstNode(AstNodeKind.SymbolExpression, {symbol: token.value.value});
// 		}
// 		default: {
// 			return createAstNode(AstNodeKind.StringExpression, {value: ""});
// 		}
// 	}
// }


// const testCheckpoint = Checkpoint.new(0, parseExpression, [BindingPower.default_bp]);


























/* -------------------------------------------------------------------------- */
/*                                PLEASE IGNORE                               */
/* -------------------------------------------------------------------------- */


// // Its not really optimized, but its more of a proof of concept
// export function parseVariableDeclarationStatement(p: Parser): VariableDeclarationStatement {
//   const modifiers: [canReassign: Modifiers, canMutate: Modifiers] = [Modifiers.None, Modifiers.None];

//   const modifier1Token = p.expect(["const", "var"]);
//   modifiers[0] = modifier1Token.value == "const" ? Modifiers.Const : (modifier1Token.value == "var" ? Modifiers.Var : Modifiers.None);

//   const modifier2Token = p.expect(["const", "var"]);
//   modifiers[1] = modifier2Token.value == "const" ? Modifiers.Const : (modifier2Token.value == "var" ? Modifiers.Var : Modifiers.None);

//   // Look for superglobals
//   if (modifiers[0] == Modifiers.Const && modifiers[1] == Modifiers.Const 
//       && p.optional(["const"])
//     ) {
//       //!!! we get 2 branches, one where we interpret it as a superGlobal and one where we don't
//       // When we get to this call, we save the choice we are doing here, then calling this fn with a copy of the initial parser and giving it a way to know we did this choice
//       // It will then take another choice, create a new branch if necessary until we have explored everything.
//       modifiers[0] = Modifiers.SuperGlobal;
//       modifiers[1] = Modifiers.SuperGlobal;
//   }

//   /* -------------------------- Parsing the var name -------------------------- */
//   const name, lifetime = parseVariableDeclarationName(p)
//   /*
//   const identifier = p.expect([TokenType.Symbol]).value // This may create a bunch of branches depending on how we handle identifiers and lifetimes
//   //TODO
//   const lifetime = undefined;
//   */

//   //TODO parse the type (and ignores it)
//   // type
//   parseVariableType(p)
//   /* -------------------------------------------------------------------------- */


//   let value: Expression | undefined = undefined;
//   if (p.optional([TokenType.EqualSign])) {
//     //! Instead of directly parsing it, maybe its better if we do something like p.exec(fn)?
//     //! Or we don't for now. Its only good for memo/only repeating a small portion of the code instead of all of it.
//     //! Because all the functions are deterministic, we can just chain them and remember the choices we made.
//     //! eventually, we'll memoize as much as possible, but for now its not necessary.
//     //! This also gives us for free any branch that stops early because of something that can be interpreted as the end of an expression
//       //! We just need to be aware of everything that can end an expression
//     value = parseExpression(p, BindingPower.default_bp);
//   }
//   p.expect(EndOfLineTokens);

//   return createAstNode(AstNodeKind.VariableDeclarationStatement, {
//     name,
//     modifiers,
//     ...(value == undefined ? undefined : {value}),
//     ...(lifetime == undefined ? undefined : {lifetime}),
//   });
// }



// //! When we parse, any time we get something that can be an EOS, we call this to create new branches if necessary.
// /**
//  * @throws {AbortBranch}
//  */
// function parseEndOfStatement(p: ParsingObject) {
//   //TODO
//   //`!\n` or `!!!\n` or `?\n` will always be an end of statement, no matter what
//   p.expect(TokenType.Exclamation);
// }






// /*
// A (nud) B (led) C (nud)
// D (nud) E (led) F (nud) G (nud)

// Bloc A [0,4[
// Bloc B [4,7[
// Bloc C [7,11[
// Bloc D [0,2[
// Bloc E [2,4[
// Bloc F [4,7[
// Bloc G [7,12[
// */
// let x = {
//   0: [
//     {
//       start: 0,
//       node: {
//         type: "B",
//         // if we had more than 1 option, these would have start and end positions
//         left: {type: "A"},
//         right: {type: "C"},
//         end: 11
//       }
//     },
//     {
//       start: 0,
//       type: "E",
//       left: {type: "D"},
//       right: {
//         type: "F",
//         right: {type: "G"},
//         end: 12
//       },
//       end: 12

//     }
//   ]
// };