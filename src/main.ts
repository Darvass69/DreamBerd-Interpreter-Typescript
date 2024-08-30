import fs from 'node:fs';
import Parser from './parser/parser';
import { createGlobalScope } from './runtime/environment';
import { evaluate } from './runtime/interpreter';

/** Path to the file that will be executed. */
let path: string;

// const arguments_ = process.argv.slice(2);
//  path = arguments_[0] ?? "./src/examples/firstTest.db";
const tests = ["test.db", "lexerTests.db", "samples.dbx", "runtimeTests.db"];
const testNb = 0;

//! CHANGE THIS TO SELECT THE FILE YOU WANT TO EXECUTE
path = "./src/examples/" + tests[testNb];
const file = fs.readFileSync(path, 'utf8');

async function main() {
	const parser = new Parser();
	const environment = createGlobalScope(); // global scope, use special fn to create

	const program = parser.parse(file);
	fs.writeFileSync("./ast.json", JSON.stringify(program, ignoreKeys, 2));
	console.info("successfully created the AST !!!");

	const result = evaluate(program, environment);
	console.log(result);
}

const ignoredKeys = new Set(["kind"]);
export function ignoreKeys(key: any, value: any)
{
	if (ignoredKeys.has(key)) {
		return;
	}
  return value;
}

main();