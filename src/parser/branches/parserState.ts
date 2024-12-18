import { isNil } from "lodash";
import { getChoiceAtPosition, Token, TokenValue } from "../../lexer/token";
import { LedHandler, NudHandler, StmtHandler } from "../lookups";
import { ExitBranchError } from "../parser";
import { Statement } from "../astNodes";

export interface TokenChoice {
  start: number,
  value: TokenValue | undefined
	nullCount: number,
	totalNullCount: number
}

export class ParserState {
  public position: number;
  /** This is a list of the choice of tokens we made to get from the last checkpoint to here. */
  private tokenChoices: TokenChoice[];
  public _handlerChoices: (StmtHandler | NudHandler | LedHandler | null)[]; //* doesn't need to be public. It's public only for logs
  public _handlerChoiceIndex: number = 0; //* doesn't need to be public. It's public only for logs
  private resultChoices: [endPosition: number, results: Statement][] = [];
  private resultChoiceIndex: number = 0;

  constructor(startPosition: number, tokenChoices: TokenChoice[], handlerChoices: (StmtHandler | NudHandler | LedHandler | null)[]) {
    this.position = startPosition;
    this.tokenChoices = tokenChoices;
    this._handlerChoices = handlerChoices;
  }

  public static copy(state: ParserState, checkpointStartPosition: number): ParserState {
    const tokenChoicesCopy: TokenChoice[] = []
    for (const tokenChoice of state.tokenChoices) {
      tokenChoicesCopy.push({
        start: tokenChoice.start,
        value: tokenChoice.value,
        nullCount: 0,
        totalNullCount: tokenChoice.totalNullCount
      })
    }

    const handlerChoicesCopy = [...state._handlerChoices];

    return new ParserState(checkpointStartPosition, tokenChoicesCopy, handlerChoicesCopy)
  }

  public addTokenChoice(choiceStartPosition: number, choiceValue: TokenValue | null) {
    let choice = getChoiceAtPosition(choiceStartPosition, this.tokenChoices);
    if (choice === undefined) {
      choice = {
        start: choiceStartPosition,
        value: undefined,
        nullCount: 0,
        totalNullCount: 0
      }
    }

    if (choiceValue === null) {
      choice.nullCount++
      choice.totalNullCount++
    } else {
      if (choice.value != undefined) {
        throw new ExitBranchError("We already have a token choice.")
      }
      choice.value = choiceValue;
    }
  }

  public getTokenChoice(): TokenValue | null | undefined {
    const tokenChoice = getChoiceAtPosition(this.position, this.tokenChoices);

    if (tokenChoice === undefined) {
      return undefined;
    }
    if (tokenChoice.value === undefined) {
      tokenChoice.nullCount++;
      return null;
    }
    return tokenChoice.value;
  }

  public addHandlerChoice(choice: StmtHandler | NudHandler | LedHandler | null) {
    this._handlerChoices.push(choice);
  }

  public getHandlerChoice(): StmtHandler | NudHandler | LedHandler | null | undefined {
    if (this._handlerChoices.length < this._handlerChoiceIndex) {
      return this._handlerChoices[this._handlerChoiceIndex++];
    }
    return undefined;
  }

  public addResultChoice(choice: [endPosition: number, results: Statement]) {
    this.resultChoices.push(choice);
  }

  public getResultChoice(): [endPosition: number, results: Statement] | undefined {
    if (this.resultChoices.length < this.resultChoiceIndex) {
      return this.resultChoices[this.resultChoiceIndex++];
    }
    return undefined;
  }
}