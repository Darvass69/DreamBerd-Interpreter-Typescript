import fs from 'node:fs';
import { createAst } from './parser/parserFunctionsNew';
// import { createGlobalScope } from './runtime/environment';
// import { evaluate } from './runtime/interpreter';

/** Path to the file that will be executed. */

const files = ["test.db", "lexerTests.db", "samples.dbx", "runtimeTests.db"];
const fileNb = 0;


const path = "./src/examples/" + files[fileNb];
// const execute = false;


async function main() {
	const file = fs.readFileSync(path, 'utf8');
	const program = await createAst(file);
	fs.writeFileSync("./ast.json", JSON.stringify(program, ignoreKeys, 2));
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
	main();
} catch (error) {
	console.error("Caught error in main:", error);
}


// Ignore some keys when logging the AST
const ignoredKeys = new Set(["kind"]);
export function ignoreKeys(key: any, value: any)
{
	if (ignoredKeys.has(key)) {
		return;
	}
  return value;
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