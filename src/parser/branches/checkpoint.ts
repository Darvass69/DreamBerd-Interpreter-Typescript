import { AstNodeKind, BranchingStatement, createAstNode, Expression, Statement } from "../astNodes.ts";
import { LedHandler, NudHandler, StmtHandler } from "../parsingFunctionMaps.ts";
import Parser, { ExitBranchError, Options, ParsingEnvironment } from "../parser.ts";
import { TokenValue } from "../../lexer/token.ts";
import { ParserState } from "./parserState.ts";
import { CheckpointLogger, ParserLogger } from "./logger.ts";

export type HandlerParameters = Parameters<StmtHandler | NudHandler | LedHandler> extends [Parser, ...infer P] ? P : never;
export type Handler<T extends HandlerParameters, R extends Statement | Expression> = ((parser: Parser, ...parameters: T) => R | Promise<R>) & (StmtHandler | NudHandler | LedHandler);

/**
 * Checkpoint explores all the branches down stream
 * whenever it creates a new branch it keeps track of important info
 * at the end, it creates branches for the parent checkpoint with only unique branches.
 *
 * Each checkpoint is identified by:
 *  position
 *  function
 *  left?
 *    if left start and end at the same place, it can be considered to be the same?
 *  bp
 *  choices?
 */
export class Checkpoint<T extends HandlerParameters, R extends Statement> {
  /** Map<position, Map<function_name, Checkpoint>> */
  private static checkpoints: Map<number, Map<string, Checkpoint<any, any>[]>> = new Map();
  private static checkpointId: number = 0;
  private instanceCheckpointId: number;

  /** Map<endPosition, results> */
  private results: Map<number, R[]> = new Map();
  private isDone: boolean = false;
  private returnHandlers: (() => void)[] = [];

  private branches: Parser[] = [];
  private totalBranches = 0;

  private logger: CheckpointLogger;

  private constructor(
    public options: Options,
    public environment: ParsingEnvironment,
    private startPosition: number,
    private parsingFunction: Handler<T, R>,
    private parameters: T,
    externalLogger: ParserLogger,
  ) {
    // start parsing with the checkpoint
    this.instanceCheckpointId = Checkpoint.checkpointId++;
    this.logger = externalLogger.createdCheckpoint(
      this.instanceCheckpointId,
      startPosition,
      parsingFunction,
      parameters,
      this.results,
    );
    this.newBranch(new ParserState(startPosition, [], [], []));
    void this.run();
  }

  public static newCheckpoint<T extends HandlerParameters, R extends Statement>(
    options: Options,
    environment: ParsingEnvironment,
    position: number,
    parsingFunction: Handler<T, R>,
    parameters: T,
    externalLogger: ParserLogger,
  ): Checkpoint<T, R> {
    // Check if a checkpoint already exist for the inputs.
    const oldCheckpoint = (this.checkpoints.get(position)?.get(parsingFunction.name) ?? []).filter((checkpoint) => {
      // check same bp
      const fn = checkpoint.parsingFunction;
      if ("bp" in parsingFunction && "bp" in fn) {
        return parsingFunction.bp === fn.bp;
      } else if (!("bp" in parsingFunction || "bp" in fn)) {
        return true;
      }
      return false;
    }).filter((checkpoint) => {
      // check parameters
      return this.isParametersEqual(parameters, checkpoint.parameters);
    });

    let returnCheckpoint: Checkpoint<T, R>;
    if (oldCheckpoint.length === 0) {
      // Use new checkpoint
      returnCheckpoint = new Checkpoint(options, environment, position, parsingFunction, parameters, externalLogger);

      // Add checkpoint to static list, based on its identifiable characteristics (position and fn name)
      if (this.checkpoints.get(position) === undefined) {
        this.checkpoints.set(position, new Map<string, Checkpoint<T, R>[]>());
      }
      if (this.checkpoints.get(position)?.get(parsingFunction.name) === undefined) {
        this.checkpoints.get(position)?.set(parsingFunction.name, []);
      }
      this.checkpoints.get(position)?.get(parsingFunction.name)?.push(returnCheckpoint);
    } else if (oldCheckpoint.length > 1) {
      console.error("Found 2 checkpoints with same signature.");
      //& If we hit this, something is seriously wrong.
      throw new Error("Found 2 checkpoints with same signature.");
    } else {
      returnCheckpoint = oldCheckpoint[0];
      externalLogger.retrievedCheckpoint(returnCheckpoint.instanceCheckpointId);
    }

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

  private submitNewStates(states: ParserState[]) {
    for (const state of states) {
      this.newBranch(state);
    }
  }

  public submitTokenChoices(choices: (TokenValue | null)[], state: ParserState) {
    // in the checkpoint, create a new state for each choice. The first choice goes to the current parser's state.
    if (choices.length === 0) {
      throw new ExitBranchError("Found no token choices");
    }

    const firstChoice = choices.shift() as TokenValue | null;

    // when we make a new state, we should default everything to the start of the checkpoint
    const newStates: ParserState[] = [];
    for (const choice of choices) {
      const newState = ParserState.copy(state, this.startPosition);
      newState.addTokenChoice(state.position, choice);
      newStates.push(newState);
    }
    this.submitNewStates(newStates);

    state.addTokenChoice(state.position, firstChoice);
  }

  public submitHandlerChoices(choices: (StmtHandler | NudHandler | LedHandler | null)[], state: ParserState) {
    // in the checkpoint, create a new state for each choice. The first choice goes to the current parser's state.
    if (choices.length === 0) {
      throw new ExitBranchError("Found no token choices");
    }

    const firstChoice = choices.shift() as StmtHandler | NudHandler | LedHandler | null;

    // when we make a new state, we should default everything to the start of the checkpoint
    const newStates: ParserState[] = [];
    for (const choice of choices) {
      const newState = ParserState.copy(state, this.startPosition);
      newState.addHandlerChoice(choice);
      newStates.push(newState);
    }
    this.submitNewStates(newStates);

    state.addHandlerChoice(firstChoice);
  }

  public submitResultChoice(choices: [endPosition: number, results: R | BranchingStatement<R>][], state: ParserState) { //!!!!! This might be why we have duplicated sections
    // in the checkpoint, create a new state for each choice. The first choice goes to the current parser's state.
    if (choices.length === 0) {
      throw new ExitBranchError("Found no token choices");
    }

    const firstChoice = choices.shift() as [endPosition: number, results: R | BranchingStatement<R>];

    // when we make a new state, we should default everything to the start of the checkpoint
    const newStates: ParserState[] = [];
    for (const choice of choices) {
      const newState = ParserState.copy(state, this.startPosition);
      newState.addResultChoice(choice);
      newStates.push(newState);
    }
    this.submitNewStates(newStates);

    state.addResultChoice(firstChoice);
  }

  private newBranch(state: ParserState) {
    this.branches.unshift(new Parser(this, state, this.logger.newBranch()));
  }

  /**
   * Continuously parse branches one by one from the buffer.
   * I don't think we need it to be async or to have a loop, but its future proof.
   */
  public async run() {
    // If we have no references to any branches, it means we are done
    while (this.branches.length > 0 && this.totalBranches < 1000) {
      try {
        const branch = this.branches.shift() as Parser;
        const result = await this.parsingFunction(branch, ...this.parameters);
        this.addResult(branch.getPosition(), result);
      } catch (error) {
        if (!(error instanceof ExitBranchError)) {
          throw error;
        }
      } finally {
        this.totalBranches++;
        this.isDone = true;
      }
    }

    for (const submit of this.returnHandlers) {
      submit();
    }
  }

  private addResult(endPosition: number, result: R) {
    if (this.results.get(endPosition) === undefined) {
      this.results.set(endPosition, []);
    }
    this.results.get(endPosition)?.push(result);
  }

  private get result(): [endPosition: number, results: BranchingStatement<R> | R][] {
    const finalResults: [endPosition: number, results: BranchingStatement<R> | R][] = [];
    for (const [endPosition, results] of this.results.entries()) {
      if (results.length === 0) {
        throw new ExitBranchError("There were no branch remaining after parsing.");
      } else if (results.length === 1) {
        finalResults.push([endPosition, results[0]]);
      } else {
        finalResults.push([endPosition, createAstNode(AstNodeKind.BranchingStatement, { branches: results })]);
      }
    }

    return finalResults;
  }

  /**
   * Parse using the function in the checkpoint.
   * @param parser
   */
  public async getResults(): Promise<[endPosition: number, results: BranchingStatement<R> | R][]> {
    const promise = new Promise<[endPosition: number, results: BranchingStatement<R> | R][]>((resolve, reject) => {
      // only called when done
      const handleResults = () => {
        try {
          resolve(this.result);
        } catch (e) {
          reject(e);
        }
      };

      if (this.isDone) {
        handleResults();
      } else {
        this.returnHandlers.push(handleResults);
      }
    });

    return await promise;
  }

  public async getResultsAsStartingPoint() {
    const allResults = (await this.getResults()).map(([, results]) => results);

    return allResults.flatMap((astNode) => {
      if (astNode.kind === AstNodeKind.BranchingStatement) {
        return (astNode as BranchingStatement<R>).branches;
      }
      return [astNode];
    });
  }
}
