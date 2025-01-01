import { getChoiceAtPosition, TokenValue } from "../../lexer/token.ts";
import { ExitBranchError } from "../parser.ts";
import { LedHandler, NudHandler, StmtHandler } from "../parsingFunctionMaps.ts";
import { Statement } from "../astNodes.ts";

export interface TokenChoice {
  start: number;
  value: TokenValue | undefined;
  nullCount: number;
  totalNullCount: number;
}

export type ResultChoice = [endPosition: number, results: Statement];

export class ParserState {
  public position: number;
  /** This is a list of the choice of tokens we made to get from the last checkpoint to here. */
  public _tokenChoices: TokenChoice[];
  public _handlerChoices: (StmtHandler | NudHandler | LedHandler | null)[];
  public _handlerChoiceIndex: number = 0;
  public _resultChoices: ResultChoice[] = [];
  public _resultChoiceIndex: number = 0;

  constructor(startPosition: number, tokenChoices: TokenChoice[], handlerChoices: (StmtHandler | NudHandler | LedHandler | null)[], resultChoices: ResultChoice[]) {
    this.position = startPosition;
    this._tokenChoices = tokenChoices;
    this._handlerChoices = handlerChoices;
    this._resultChoices = resultChoices;
  }

  public static copy(state: ParserState, checkpointStartPosition: number): ParserState {
    const tokenChoicesCopy: TokenChoice[] = [];
    for (const tokenChoice of state._tokenChoices) {
      tokenChoicesCopy.push({
        start: tokenChoice.start,
        value: tokenChoice.value,
        nullCount: 0,
        totalNullCount: tokenChoice.totalNullCount,
      });
    }

    const handlerChoicesCopy = [...state._handlerChoices];

    const resultChoicesCopy = [...state._resultChoices];

    return new ParserState(checkpointStartPosition, tokenChoicesCopy, handlerChoicesCopy, resultChoicesCopy);
  }

  public addTokenChoice(choiceStartPosition: number, choiceValue: TokenValue | null) {
    let choice = getChoiceAtPosition(choiceStartPosition, this._tokenChoices);
    if (choice === undefined) {
      choice = {
        start: choiceStartPosition,
        value: undefined,
        nullCount: 0,
        totalNullCount: 0,
      };
      this._tokenChoices.push(choice);
    }

    if (choiceValue === null) {
      choice.totalNullCount++;
    } else {
      if (choice.value !== undefined) {
        throw new ExitBranchError("We already have a token choice.");
      }
      choice.value = choiceValue;
    }
  }

  public getTokenChoice(): TokenValue | null | undefined {
    const tokenChoice = getChoiceAtPosition(this.position, this._tokenChoices);

    if (tokenChoice === undefined) {
      return undefined;
    }
    if (tokenChoice.nullCount < tokenChoice.totalNullCount) {
      tokenChoice.nullCount++;
      return null;
    }
    return tokenChoice.value;
  }

  public addHandlerChoice(choice: StmtHandler | NudHandler | LedHandler | null) {
    this._handlerChoices.push(choice);
  }

  public getHandlerChoice(): StmtHandler | NudHandler | LedHandler | null | undefined {
    if (this._handlerChoiceIndex < this._handlerChoices.length) {
      return this._handlerChoices[this._handlerChoiceIndex++];
    }
    return undefined;
  }

  public addResultChoice(choice: ResultChoice) {
    this._resultChoices.push(choice);
  }

  public getResultChoice(): ResultChoice | undefined {
    if (this._resultChoiceIndex < this._resultChoices.length) {
      return this._resultChoices[this._resultChoiceIndex++];
    }
    return undefined;
  }
}
