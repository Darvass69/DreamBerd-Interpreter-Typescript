import { beforeEach, describe } from "@std/testing/bdd";
import { Options } from "./parser.ts";
import { Tokenizer } from "../lexer/lexer.ts";
import ParsingFunctionMaps from "./parsingFunctionMaps.ts";
import { Checkpoint } from "./branches/checkpoint.ts";
import { ParserLogger } from "./branches/logger.ts";
import { HandlerParameters } from "./branches/checkpoint.ts";
import { Statement } from "./astNodes.ts";
import { Handler } from "./branches/checkpoint.ts";
import { parsePrimaryExpression } from "./parsingFunctions.ts";

/*
This is the important tests.

We want to test parsing with each function to make sure they work in every little edge case.
Its a way to make sure all things are consistent.

Test in here and in token and lexer that eof is handled consistently between everything. I think we do some weird stuff right now.


Do all (most) tests twice (or more). 1st with only the mappings for the function we are doing and 1 with everything and make sure we find our target in both.
This makes sure that the function works, and that there isn't something elsewhere that breaks it.
*/
let checkpoint: Checkpoint<any, any>;
let source: string = "";

function buildTestCase<T extends HandlerParameters, R extends Statement>(fn: Handler<T, R>, parameters: T) {
  const options: Options = {
    debug: true,
    useSignificantWhitespace: false,
    saveLogs: true,
  };
  const tokens = new Tokenizer(source).tokenize();
  const mappings = new ParsingFunctionMaps(options);

  checkpoint = Checkpoint.newCheckpoint(options, { tokens, mappings }, 0, fn, parameters, new ParserLogger([]));

  // const resultList = await checkpoint.getResultsAsStartingPoint();
}

describe("parsePrimaryExpression", () => {
  /*
	1 -> #1, ~1~, "1"?
	*/
  parsePrimaryExpression;
});
