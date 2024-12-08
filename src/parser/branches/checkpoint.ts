import { isEmpty } from "lodash";
import { AstNodeKind, BranchingStatement, createAstNode, Expression, Statement } from "../astNodes";
import { LedHandler, NudHandler, StmtHandler } from "../lookups";
import Parser from "../parser";

// export type ParsingFunctionParameter<T extends (...args: any) => any> = Parameters<T> extends [Parser, ...infer P] ? P : never;
export type HandlerParameters = Parameters<StmtHandler | NudHandler | LedHandler> extends [Parser, ...infer P] ? P : never;
export type Handler<T extends HandlerParameters, R extends Statement | Expression> = ((parser: Parser, ...parameters: T) => R) & (StmtHandler | NudHandler | LedHandler);

//These work, but are not used
type ParsingFunctionParameters<Functions extends (parser: Parser, ...args: any) => any> = Parameters<Functions> extends [Parser, ...infer P] ? P : never;
type ParsingFunction<Functions extends (parser: Parser, ...args: any) => any & unknown, R extends Statement | Expression> = ((parser: Parser, ...parameters: ParsingFunctionParameters<Functions>) => R) & (Functions);

/**
 * Checkpoint explores all the branches down stream
 * whenever it creates a new branch it keeps track of important info
 * at the end, it creates branches for the parent checkpoint with only unique branches.
 * 
 * TODO make the checkpoint manage branch creation/what branch is allowed to exist?
 * 
 * Each checkpoint is identified by:
 *  position
 *  function
  *  left?
  *    if left start and end at the same place, it can be considered to be the same. 
  *  bp
 *  choices?
 * 
 * Also, we should choose what branch is created. If we already have a branch that does something, there is no point in re creating it.
 * 
 * TODO check that the types are valid and restrict enough to prevent errors
 * 
 * 
 * ! To make the checkpoints work, we need to still parse from the start. If we don't then we never get a result (we only do the last step and nothing more)
 * 
 * WIP
 * needs to remember what checkpoint already exist/be able to use a checkpoint for more than 1 fn call
 */
export class Checkpoint<T extends HandlerParameters, R extends Statement> {
  private _results: R[] = [];
  // Map<position, Map<function name, args>
  private static checkpoints: Map<number, Map<string, Checkpoint<any,any>[]>> = new Map();

  get result(): BranchingStatement<R> {
    return createAstNode(AstNodeKind.BranchingStatement, {branches: this._results});
  }

	private constructor(
    private parsingFunction: Handler<T, R>, 
    private parameters: T
  ) {}


	public static new<T extends HandlerParameters, R extends Statement>(
		position: number,
    parsingFunction: Handler<T, R>,
    parameters: T
	): Checkpoint<T,R> {
    //^ I think it works.

    // check choices?

    // Check if a checkpoint already exist for the inputs.
    const oldCheckpoint = (this.checkpoints.get(position)?.get(parsingFunction.name) ?? []).filter((checkpoint) => {
      // check same bp
      const fn = checkpoint.parsingFunction;
      if ('bp' in parsingFunction && 'bp' in fn) {
        return parsingFunction.bp === fn.bp;
      } else if (!('bp' in parsingFunction || 'bp' in fn)) {
        return true;
      }
      return false;
    }).filter((checkpoint) => {
      // check parameters
      return this.isParametersEqual(parameters, checkpoint.parameters);
    });

    let returnCheckpoint: Checkpoint<T,R>;
    if (isEmpty(oldCheckpoint)) {
      // Use new checkpoint
      returnCheckpoint = new Checkpoint(parsingFunction, parameters);
    } else if (oldCheckpoint.length > 1) {
      console.error("Found 2 checkpoints with same signature.");
      throw "Found 2 checkpoints with same signature.";
    } else {
      returnCheckpoint = oldCheckpoint[0];
    }

    if (this.checkpoints.get(position) === undefined) {
      this.checkpoints.set(position, new Map<string, Checkpoint<T,R>[]>());
    }
    if (this.checkpoints.get(position)?.get(parsingFunction.name) === undefined) {
      this.checkpoints.get(position)?.set(parsingFunction.name, []);
    }
    this.checkpoints.get(position)?.get(parsingFunction.name)?.push(returnCheckpoint);
    return returnCheckpoint;
	}

  private static isParametersEqual(parameter1: HandlerParameters, parameter2: HandlerParameters) {
    if (parameter1.length !== parameter2.length) {
      return false;
    }

    // Stmt
    if (parameter1.length === 0) {
      return true;
    }

    // Nud
    if (parameter1.length === 1) {
      return parameter1[0] !== parameter2[0];
    }

    // Led
    if (parameter1.length === 2) {
      return parameter1[1] !== parameter2[1] && this.isSameLeft(parameter1[0], parameter2[0] as typeof parameter1[0]);
    }
  }

  private static isSameLeft(left1: Expression, left2: Expression) {
    return left1 === left2;
  }


  /**
   * Parse using the function in the checkpoint.
   * @param parser 
   */
  public execute(parser: Parser): void {
    //TODO Optimizing exec time. This will have to simulate parsing when we already have the results.
    const result = this.parsingFunction(parser, ...this.parameters);
    this._results.push(result);
  }
}