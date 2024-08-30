import { Lifetime } from "../parser/astNodes";
import { createNull, createUndefined, RuntimeValue } from "./values";

export function createGlobalScope() {
	const environment = new Environment();
	// Create Default Global Enviornment
	// environment.declareVar("true", MK_BOOL(true), true);
	// environment.declareVar("false", MK_BOOL(false), true);
	// environment.declareVar("null", MK_NULL(), true);

	// Define a native builtin method
	// environment.declareVar(
	// 	"print",
	// 	MK_NATIVE_FN((args, scope) => {
	// 		console.log(...args);
	// 		return MK_NULL();
	// 	}),
	// 	true
	// );

	// function timeFunction(_args: RuntimeVal[], _env: Environment) {
	// 	return MK_NUMBER(Date.now());
	// }
	// environment.declareVar("time", MK_NATIVE_FN(timeFunction), true);

	return environment;
}

// scope
export default class Environment {
  private parent?: Environment;
  // TODO change variables so they can work in when statements and use previous and next
  private variables: Map<string, RuntimeValue>;
  private constants: Set<string>;

  constructor(parentENV?: Environment) {
    this.parent = parentENV;
    this.variables = new Map();
    this.constants = new Set();
  }

  public declareVar(variableName: string, modifiers: [canReassign: boolean, canMutate: boolean], value?: RuntimeValue, lifetime?: Lifetime): RuntimeValue {
    if (this.variables.has(variableName)) {
      throw `Cannot declare variable ${variableName} as it's already defined.`;
    }
    if (value == undefined) {
      value = createUndefined();
    }

    this.variables.set(variableName, value);
    return value;
  }

  public assignVar(variableName: string, value: RuntimeValue): RuntimeValue {
    const environment = this.resolve(variableName);
    environment.variables.set(variableName, value);
    return value;
  }

  public lookupVar(variableName: string): RuntimeValue {
    const environment = this.resolve(variableName);
    return environment.variables.get(variableName) as RuntimeValue;
  }

  public resolve(variableName: string): Environment {
    if (this.variables.has(variableName)) return this;

    if (this.parent == undefined)
      throw `Cannot resolve ${variableName} as it doesn't exist.`;

    return this.parent.resolve(variableName);
  }
}
