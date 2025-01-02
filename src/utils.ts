import fs from "node:fs";
import { TokenType } from "./lexer/token.ts";

// Ignore some keys when logging the AST
const ignoredKeys = new Set(["kind"]);
export function astToStringJson(key: any, value: any) {
  if (ignoredKeys.has(key)) {
    return;
  }

  if (key === "operator") {
    return TokenType[value];
  }
  return value;
}

//
export function tokenListToStringJson(key: any, value: any) {
  if (key === "type") {
    return TokenType[value as TokenType];
  }
  return value;
}

export function saveLogs(fileName: string, content: string) {
  fs.writeFileSync(`./${fileName}`, content);
}
