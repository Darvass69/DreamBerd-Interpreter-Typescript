import { TokenType, TokenValue } from "../../lexer/token.ts";
import { astToStringJson } from "../../utils.ts";
import { Expression, Statement } from "../astNodes.ts";
import { Handler, HandlerParameters } from "./checkpoint.ts";
import { ResultChoice } from "./parserState.ts";

/*
Should we add a log when we create a new branch.



???
better represent choices
  when starting new branch, print the choices for that branch
    ex:
      parseExpressionStatement
        parsePrimaryExpression: Identifier(1)
        parseBinaryExpression: Add()
        parsePrimaryExpression: Identifier(1)
        parseBinaryExpression: Add()
        parsePrimaryExpression: Identifier(1)
      Position: 9
???


*/

type Branch = string[];
type Branches = Branch[];
export class Logger {
  public static showResults = false;

  protected static logs: {
    [cpId: number]: {
      startPosition: number;
      parsingFunction: string;
      parameters: string;
      branches: Branches;
      results: Map<number, Statement[]>;
    };
  } = {};

  public static getLogs(): string {
    const mapsToStringJson = (key: any, value: any) => {
      if (value instanceof Map) {
        if (this.showResults) {
          return Array.from(value.entries());
        }
        return Array.from(value.keys());
      }
      return value;
    };

    return JSON.stringify(this.logs, mapsToStringJson, 2);
  }

  public static parametersToString(parameters: HandlerParameters): string {
    if (parameters.length === 0) {
      return "";
    } else if (parameters.length === 1) {
      return `nbSpaces:${parameters[0]}`;
    } else {
      return `left:${Logger.leftToString(parameters[0])}; nbSpaces:${parameters[1]}`;
    }
  }

  public static leftToString(left: Expression) {
    return JSON.stringify(left, astToStringJson);
  }
}

export class ParserLogger extends Logger {
  public constructor(private branch: Branch) {
    super();
  }

  public createdCheckpoint(
    instanceCheckpointId: number,
    startPosition: number,
    parsingFunction: Handler<any, any>,
    parameters: HandlerParameters,
    results: Map<number, Statement[]>,
  ) {
    // add line that says 'new cp#' with info
    const branches: Branches = [];
    Logger.logs[instanceCheckpointId] = {
      startPosition,
      parsingFunction: parsingFunction.name,
      parameters: Logger.parametersToString(parameters),
      branches,
      results,
    };
    this.branch.push(`New cp${instanceCheckpointId}`);
    return new CheckpointLogger(instanceCheckpointId);
  }

  public retrievedCheckpoint(instanceCheckpointId: number) {
    // 'cp#' if it wasn't created
    this.branch.push(`cp${instanceCheckpointId}`);
  }

  public tokenFound(
    isOptional: boolean,
    isChoice: boolean,
    expected: TokenType[],
    result: TokenValue | null,
    oldPosition: number,
    newPosition: number,
  ) {
    // - (choice) optional/expected: (position (start-end), type, value?)
    this.branch.push(`${isOptional ? "optional" : "expected"}${isChoice ? " choice" : ""}: ${result === null ? "null" : TokenType[result.type]} of ${expected.map((type) => TokenType[type])} at ${oldPosition}-${newPosition}`);
  }

  public handlerFound(
    type: string,
    isChoice: boolean,
    handler: Handler<any, any> | null,
  ) {
    // - (choice) nud/led/stmt (name and type)
    this.branch.push(`${type}${isChoice ? " choice" : ""}: ${handler === null ? "null" : handler.name}`);
  }

  public resultFound(
    isChoice: boolean,
    result: ResultChoice,
  ) {
    // - (choice) result (result)
    //? from what cp?
    this.branch.push(`result${isChoice ? " choice" : ""}: ${JSON.stringify(result, astToStringJson, 0)}`);
  }

  public exit(message: string) {
    // exited because of: message
    this.branch.push(message);
  }
}

export class CheckpointLogger extends Logger {
  public constructor(private instanceCheckpointId: number) {
    super();
  }

  public newBranch(): ParserLogger {
    // new branch (what choice it has that is diff from the last branch (or just the list of choices since last cp, with the last one highlighted?))
    const newBranch: Branch = [];
    //TODO add something like a 'from this branch' so we can know where it was created from
    Logger.logs[this.instanceCheckpointId].branches.push(newBranch);
    return new ParserLogger(newBranch);
  }
}
