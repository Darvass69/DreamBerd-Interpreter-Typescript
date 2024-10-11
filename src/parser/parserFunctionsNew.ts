import { tokenize } from "../lexer/lexer";
import { ArithmeticMap, BitwiseMap, ComparisonMap, LogicalMap, newToken, Token, TokenToString, TokenType } from "../lexer/token";
import { AstNodeKind, BinaryExpression, BlockStatement, BranchingStatement, createAstNode, Expression, ExpressionStatement, NumberExpression, Statement, StringExpression, SymbolExpression } from "./astNodes";
import { BindingPower } from "./lookups";


const debug = true;
/** We assume this will always be filled before we need it */
export const global = ({} as unknown) as {
  tokens: Token[]
  lookups: Lookups
  branchManager: BranchManager
};

// Find a better name
export async function createAst(sourceCode: string): Promise<BlockStatement | BranchingStatement<BlockStatement>> {
  const tokens = tokenize(sourceCode);
  const lookups = new Lookups();
  const branchManager = new BranchManager();

  global.tokens = tokens;
  global.lookups= lookups;
  global.branchManager = branchManager;

  const checkpoint = new Checkpoint(parseProgram, []);

  const parser = new Parser(checkpoint);
  console.log("Created initial branch");
  branchManager.addBranch(parser);
  await branchManager.run();
  return checkpoint.result;
}





/**
 * Checkpoint explores all the branches down stream
 * whenever it creates a new branch it keeps track of important info
 * at the end, it creates branches for the parent checkpoint with only unique branches
 *  
 * WIP
 * needs to remember what checkpoint already exist/be able to use a checkpoint for more than 1 fn call
 */
class Checkpoint<T extends any[], R extends Statement> {
  private _results: R[] = [];

  get result(): BranchingStatement<R> {
    return createAstNode(AstNodeKind.BranchingStatement, {branches: this._results});
  }

  public constructor(
    private parsingFunction: (parser: Parser, ...parameters: T) => R, 
    private parameters: T
  ) {}

  /**
   * Parse using the function in the checkpoint.
   * @param parser 
   */
  public parseFunction(parser: Parser): R {
    const result = this.parsingFunction(parser, ...this.parameters);
    this._results.push(result);
    return result;
  }
}

class BranchManager {
  private branches: Parser[] = [];

  public addBranch(p: Parser) {
    this.branches.push(p);
  }

  /**
   * Continuously parse branches one by one from the buffer.
   * I don't think we need it to be async or to have a loop, but its future proof.
   */
  public async run() {
    // If we have no references to any branches, it means we are done
    while (this.branches.length > 0) {
      try {
        console.log("\x1b[35m" + "Processing new branch" + "\x1b[0m"); //!! this.branches[0].log
        this.branches[0].parse();
      } catch (error) {
        if (!(error instanceof ExitBranchError)) {
          throw error;
        }
      } finally {
        this.branches.shift();
      }
    }
  }
}










/* --------------------------------- Program -------------------------------- */
export function parseProgram(p: Parser): BlockStatement {
  const body: Statement[] = [];
  while (p.hasToken()) {
    body.push(parseStatement(p));
  }
  return createAstNode(AstNodeKind.BlockStatement, {body});
}

/* ---------------------------------- Stmt ---------------------------------- */
export function parseStatement(p: Parser): Statement {
  // we create branches with all the possibilities inside getStmt
  return p.getStmt()(p);
}

export function parseExpressionStatement(p: Parser): ExpressionStatement {
  // const expression = parseExpression(p, BindingPower.default_bp);
  // p.expect(EndOfLineTokens); //~ This could be parseEndOfLine

  // return createAstNode(AstNodeKind.ExpressionStatement, {expression});
  p.changeCheckpoint(testCheckpoint);
  testCheckpoint.parseFunction(p)
  const expression = testCheckpoint.result;
  p.expect(EndOfLineTokens); //~ This could be parseEndOfLine

  return createAstNode(AstNodeKind.ExpressionStatement, {expression});
}


/* ---------------------------------- Expr ---------------------------------- */
export function parseExpression(p: Parser, bp: BindingPower): Expression {
  const nud_handler = p.getNud();
  if (nud_handler === undefined) {
    p.exit();
  }
  
  let left = nud_handler(p);
  let led_handler: LedHandler | null;
  while ((led_handler = p.getLed(bp)) != null) { //! we need to add a branch with null
    left = led_handler(p, left, bp);
  }
  return left;
}

export function parseGroupingExpression(p: Parser): Expression {
  p.expect([TokenType.OpenParen]);
  const expression = parseExpression(p, BindingPower.default_bp);
  p.expect([TokenType.CloseParen]);
  return expression;
}

const binaryOperators: TokenType[] = [...Object.values(ComparisonMap), ...Object.values(ArithmeticMap), ...Object.values(LogicalMap), ...Object.values(BitwiseMap)]
export function parseBinaryExpression(p: Parser, left: Expression, bp: BindingPower): BinaryExpression {
	// We assume we are already at the operator token
	const operator = p.expect(binaryOperators);
	const right = parseExpression(p, bp);

	return createAstNode(AstNodeKind.BinaryExpression, {left, operator, right});
}

export function parsePrimaryExpression(p: Parser): NumberExpression | StringExpression | SymbolExpression {
  const token = p.expect([TokenType.Number, TokenType.String, TokenType.Symbol]);

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















const testCheckpoint = new Checkpoint(parseExpression, [BindingPower.default_bp]);


























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