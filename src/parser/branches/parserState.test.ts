import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assert, assertArrayIncludes, assertEquals, assertObjectMatch } from "@std/assert";
import { ParserState, ResultChoice, TokenChoice } from "./parserState.ts";
import { TokenType, TokenValue } from "../../lexer/token.ts";
import ParsingFunctionMaps, { NudHandler } from "../parsingFunctionMaps.ts";
import { BindingPower } from "../bindingPower.ts";
import { parseExpression, parsePrimaryExpression } from "../parsingFunctions.ts";
import { AstNodeKind, createAstNode } from "../astNodes.ts";

describe("parserState", () => {
  let parserState: ParserState;
  let tokenChoices: TokenChoice[];
  let expectedTokenChoicesCopy: TokenChoice[];
  let handlerChoice: NudHandler;
  let resultChoice: ResultChoice;

  beforeEach(() => {
    handlerChoice = ParsingFunctionMaps.createNudHandler(BindingPower.primary, parsePrimaryExpression);
    resultChoice = [
      10,
      createAstNode(AstNodeKind.BinaryExpression, {
        left: createAstNode(AstNodeKind.NumberExpression, { value: 42, end: 7 }),
        operator: TokenType.Add,
        right: createAstNode(AstNodeKind.NumberExpression, { value: 69, end: 10 }),
      }),
    ];
    const tokens: TokenChoice[] = [
      { start: 5, value: { type: TokenType.Number, value: 42, end: 7 }, nullCount: 3, totalNullCount: 5 },
      { start: 7, value: { type: TokenType.Add, end: 8 }, nullCount: 0, totalNullCount: 0 },
      { start: 8, value: { type: TokenType.Number, value: 69, end: 10 }, nullCount: 0, totalNullCount: 0 },
    ];
    tokenChoices = JSON.parse(JSON.stringify(tokens));
    expectedTokenChoicesCopy = JSON.parse(JSON.stringify(tokens));
    expectedTokenChoicesCopy[0].nullCount = 0;

    parserState = new ParserState(
      8,
      tokens,
      [handlerChoice],
      [resultChoice],
    );
  });

  afterEach(() => {
  });

  describe("copy", () => {
    let copy: ParserState;

    beforeEach(() => {
      copy = ParserState.copy(parserState, 5);
    });

    it("should create a new parser state", () => {
      assert(copy !== parserState);
    });

    it("should start at the start position", () => {
      assertEquals(copy.position, 5);
    });

    it("should deep copy tokens", () => {
      assert(copy._tokenChoices !== parserState._tokenChoices);
      assertEquals(copy._tokenChoices, expectedTokenChoicesCopy);

      for (let i = 0; i < copy._tokenChoices.length; i++) {
        assert(copy._tokenChoices[i] !== parserState._tokenChoices[i]);
      }
    });

    it("should shallow copy the handler choices", () => {
      assert(copy._handlerChoices !== parserState._handlerChoices);
      assertEquals(copy._handlerChoices, parserState._handlerChoices);
    });

    it("should shallow copy the result choices", () => {
      assert(copy._resultChoices !== parserState._resultChoices);
      assertEquals(copy._resultChoices, parserState._resultChoices);
    });
  });

  describe("addTokenChoice", () => {
    it("should add a new token choice", () => {
      parserState.addTokenChoice(69, { type: TokenType.PlusPlus, end: 71 });
      assertArrayIncludes(parserState._tokenChoices, [{ start: 69, value: { type: TokenType.PlusPlus, end: 71 }, nullCount: 0, totalNullCount: 0 }]);
    });
    it("should add a new null token choice", () => {
      parserState.addTokenChoice(69, null);
      assertArrayIncludes(parserState._tokenChoices, [{ start: 69, value: undefined, nullCount: 0, totalNullCount: 1 }]);
    });
    it("should update existing null token choice", () => {
      parserState.addTokenChoice(tokenChoices[0].start, null);
      assertArrayIncludes(parserState._tokenChoices, [{
        start: tokenChoices[0].start,
        value: tokenChoices[0].value,
        nullCount: tokenChoices[0].nullCount,
        totalNullCount: tokenChoices[0].totalNullCount + 1,
      }]);
    });
  });

  describe("getTokenChoice", () => {
    it("should get the right token choice", () => {
      assertObjectMatch(parserState.getTokenChoice() as TokenValue, { type: TokenType.Number, value: 69, end: 10 });
    });
    it("should get a null token choice and update the null count", () => {
      parserState.position = 5;
      assert(parserState.getTokenChoice() === null);
      assert(parserState._tokenChoices[0].nullCount === 4);
    });
    it("should get not get a token if there isn't one", () => {
      parserState.position = 4;
      assert(parserState.getTokenChoice() === undefined);
    });
  });

  describe("addHandlerChoice", () => {
    //TODO add test for null values, they may not work properly
    it("should add a new handler choice", () => {
      const handler = ParsingFunctionMaps.createNudHandler(BindingPower.primary, ParsingFunctionMaps.createNudHandler(BindingPower.default_bp, parseExpression));
      parserState.addHandlerChoice(handler);
      assertArrayIncludes(parserState._handlerChoices, [handler]);
    });
  });

  describe("getHandlerChoice", () => {
    //TODO add test for null values (and undefined), they may not work properly
    it("should get the right handler choice", () => {
      assertEquals(parserState.getHandlerChoice(), handlerChoice);
    });
  });

  describe("addResultChoice", () => {
    //TODO add test for null values, they may not work properly
    it("should add a new result choice", () => {
      const result: ResultChoice = [12, createAstNode(AstNodeKind.NumberExpression, { value: 1, end: 12 })];
      parserState.addResultChoice(result);
      assertArrayIncludes(parserState._resultChoices, [result]);
    });
  });

  describe("getHandlerChoice", () => {
    //TODO add test for null values (and undefined), they may not work properly
    it("should get the right result choice", () => {
      assertEquals(parserState.getResultChoice(), resultChoice);
    });
  });
});
