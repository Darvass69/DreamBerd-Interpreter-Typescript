import fs from "node:fs";
import { createAst } from "./parser/parser.ts";
import { Tokenizer } from "./lexer/lexer.ts";
import { TokenType } from "./lexer/token.ts";
import { AstNodeKind, createAstNode } from "./parser/astNodes.ts";
import { astToStringJson, tokenListToStringJson } from "./utils.ts";
// import { createGlobalScope } from './runtime/environment';
// import { evaluate } from './runtime/interpreter';

/** Path to the file that will be executed. */

const files = ["test.db", "lexerTests.db", "samples.dbx", "runtimeTests.db", "tokenizerTest.db"];
const fileNb = 0;

const path = "./src/examples/" + files[fileNb];
// const execute = false;

async function main() {
  const file = fs.readFileSync(path, "utf8");

  const tokens = new Tokenizer(file).tokenize();
  fs.writeFileSync("./tokens.json", JSON.stringify(tokens, tokenListToStringJson, 2));

  console.log(`successfully created ${tokens.length} tokens.`);
  // console.log(getTokenValues(tokens, 0, []));

  const [program, logs] = await createAst(file);
  fs.writeFileSync("./ast.json", JSON.stringify(program, astToStringJson, 2));
  fs.writeFileSync("./logs.json", logs);
  console.info("successfully created the AST !!!");

  // if (execute) {
  // 	const environment = createGlobalScope(); // global scope, use special fn to create
  // 	const result = evaluate(program, environment);
  // 	console.log(result);
  // } else {
  // 	console.log("Program execution skipped");
  // }
}

try {
  void main();
} catch (error) {
  console.error("Caught error in main:", error);
}

/*
1 * 2 + 3 * 4
->
...
((#1 | "1" | 1 * #2 | "2" | 2) | "1 * 2") + ((#3 | "3" | 3 * #4 | "4" | 4) | "3 * 4")
...




flags:

future flags:
significant whitespace
strict whitespace (default is loose, only care about whitespace when it matters/change the meaning of the code)
no branching statements/expressions




*/
