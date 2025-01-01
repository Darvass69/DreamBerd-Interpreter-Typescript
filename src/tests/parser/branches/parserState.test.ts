import { afterEach, beforeEach, describe, it } from "@std/testing/bdd";
import { assert, assertAlmostEquals, assertArrayIncludes, assertEquals, assertExists, assertMatch, assertNotStrictEquals, assertObjectMatch } from "@std/assert";
import { ParserState, ResultChoice } from "../../../parser/branches/parserState.ts";
import { TokenType, TokenValue } from "../../../lexer/token.ts";
import ParsingFunctionMaps, { NudHandler } from "../../../parser/parsingFunctionMaps.ts";
import { BindingPower } from "../../../parser/bindingPower.ts";
import { parseExpression, parsePrimaryExpression } from "../../../parser/parserFunctions.ts";
import { AstNodeKind, createAstNode, Statement } from "../../../parser/astNodes.ts";

describe("parserState", () => {
  let original: ParserState;
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
    original = new ParserState(
      8,
      [
        { start: 5, value: { type: TokenType.Number, value: 42, end: 7 }, nullCount: 0, totalNullCount: 0 },
        { start: 7, value: { type: TokenType.Add, end: 8 }, nullCount: 0, totalNullCount: 0 },
        { start: 8, value: { type: TokenType.Number, value: 69, end: 10 }, nullCount: 0, totalNullCount: 0 },
      ],
      [handlerChoice],
      [resultChoice],
    );
  });

  afterEach(() => {
  });

  describe("copy", () => {
    let copy: ParserState;

    beforeEach(() => {
      copy = ParserState.copy(original, 5);
    });

    it("should create a new parser state", () => {
      assert(copy !== original);
    });

    it("should start at the start position", () => {
      assertEquals(copy.position, 5);
    });

    it("should deep copy tokens", () => {
      assert(copy._tokenChoices !== original._tokenChoices);
      assertEquals(copy._tokenChoices, original._tokenChoices);

      for (let i = 0; i < copy._tokenChoices.length; i++) {
        assert(copy._tokenChoices[i] !== original._tokenChoices[i]);
      }
    });

    it("should shallow copy the handler choices", () => {
      assert(copy._handlerChoices !== original._handlerChoices);
      assertEquals(copy._handlerChoices, original._handlerChoices);
    });

    it("should shallow copy the result choices", () => {
      assert(copy._resultChoices !== original._resultChoices);
      assertEquals(copy._resultChoices, original._resultChoices);
    });
  });

  describe("addTokenChoice", () => {
    //TODO add test for null values, they may not work properly
    it("should add a new token choice", () => {
      original.addTokenChoice(69, { type: TokenType.PlusPlus, end: 71 });
      assertArrayIncludes(original._tokenChoices, [{ start: 69, value: { type: TokenType.PlusPlus, end: 71 }, nullCount: 0, totalNullCount: 0 }]);
    });
  });

  describe("getTokenChoice", () => {
    //TODO add test for null values (and undefined), they may not work properly
    it("should get the right token choice", () => {
      assertObjectMatch(original.getTokenChoice() as TokenValue, { type: TokenType.Number, value: 69, end: 10 });
    });
  });

  describe("addHandlerChoice", () => {
    //TODO add test for null values, they may not work properly
    it("should add a new handler choice", () => {
      const handler = ParsingFunctionMaps.createNudHandler(BindingPower.primary, ParsingFunctionMaps.createNudHandler(BindingPower.default_bp, parseExpression));
      original.addHandlerChoice(handler);
      assertArrayIncludes(original._handlerChoices, [handler]);
    });
  });

  describe("getHandlerChoice", () => {
    //TODO add test for null values (and undefined), they may not work properly
    it("should get the right handler choice", () => {
      assertEquals(original.getHandlerChoice(), handlerChoice);
    });
  });

  describe("addResultChoice", () => {
    //TODO add test for null values, they may not work properly
    it("should add a new result choice", () => {
      const result: ResultChoice = [12, createAstNode(AstNodeKind.NumberExpression, { value: 1, end: 12 })];
      original.addResultChoice(result);
      assertArrayIncludes(original._resultChoices, [result]);
    });
  });

  describe("getHandlerChoice", () => {
    //TODO add test for null values (and undefined), they may not work properly
    it("should get the right result choice", () => {
      assertEquals(original.getResultChoice(), resultChoice);
    });
  });
});
