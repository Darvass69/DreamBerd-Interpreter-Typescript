import { Token, TokenType } from "../lexer/token";
import { ArrayDeclarationExpression, AssignmentExpression, AstNodeKind, AstNodeType, BinaryExpression, BlockStatement, CallExpression, ClassDeclarationStatement, DeleteStatement, EndOfBlockStatement, EOFStatement, ExportStatement, ExpressionStatement, FunctionDeclarationStatement, IfStatement, ImportStatement, MemberExpression, NumberExpression, ObjectDeclarationExpression, PrefixExpression, ReturnStatement, ReverseStatement, StateExpression, Statement, StringExpression, SymbolExpression, VariableDeclarationStatement, WhenStatement } from "../parser/astNodes";
import Environment from "./environment";
import { BooleanValue, createBoolean, createNull, createNumber, createRuntimeValue, createString, NullValue, NumberValue, PrimitiveValue, RuntimeValue, StringValue, ValueKind } from "./values";

type EvalFunction<T extends Statement> = (node: T, environment: Environment) => RuntimeValue;
const eval_lu: {[K in AstNodeKind]?: EvalFunction<AstNodeType<K>>} = {};


export function evaluate(node: Statement, environment: Environment): RuntimeValue {
	const evalFunction = eval_lu[node.kind];

	if (evalFunction == undefined) {
		console.error(`This AST node type (${node.kindName}) has not yet been setup for interpretation. :(`);
		process.exit();
	}

	return (evalFunction as EvalFunction<typeof node>)(node, environment);
}

// Functions to evaluate each AST nodes and get a runtime value from expressions (statements return null because they don't have a value)

/* -------------------------------------------------------------------------- */
/*                                 Statements                                 */
/* -------------------------------------------------------------------------- */
eval_lu[AstNodeKind.ExpressionStatement] = (node: ExpressionStatement, environment: Environment): RuntimeValue => {
	return evaluate(node.expression, environment);
};

eval_lu[AstNodeKind.BlockStatement] = (node: BlockStatement, environment: Environment): RuntimeValue => {
	//TODO Can be improved?
	let current: RuntimeValue | undefined;
	for (const statement of node.body) {
		current = evaluate(statement, environment);
	}
	return current ?? createRuntimeValue(ValueKind.null, {value: null});
};

eval_lu[AstNodeKind.VariableDeclarationStatement] = (node: VariableDeclarationStatement, environment: Environment): RuntimeValue => {
	let result: RuntimeValue;
	if (node.value == undefined) {
		result = environment.declareVar(node.identifier, node.modifiers, undefined, node.lifetime);
	} else {
		result = environment.declareVar(node.identifier, node.modifiers, evaluate(node.value, environment), node.lifetime);
	}

	return result;
};

eval_lu[AstNodeKind.FunctionDeclarationStatement] = (node: FunctionDeclarationStatement, environment: Environment): RuntimeValue => {
	TODO(node);
	return createRuntimeValue(ValueKind.null, {value: null}); // TODO
};

eval_lu[AstNodeKind.ReturnStatement] = (node: ReturnStatement, environment: Environment): RuntimeValue => {
	TODO(node);
	return createRuntimeValue(ValueKind.null, {value: null}); // TODO
};

eval_lu[AstNodeKind.IfStatement] = (node: IfStatement, environment: Environment): RuntimeValue => {
	if (testRuntimeValue(evaluate(node.test, environment))) {
		return evaluate(node.consequent, environment);
	}

	if (node.alternate) {
		return evaluate(node.alternate, environment);
	}

	return createNull();

	function testRuntimeValue(value: RuntimeValue): boolean {
		switch (value.type) {
			case ValueKind.NullValue: 
			case ValueKind.UndefinedValue: {
				return false;
			}
			case ValueKind.BooleanValue: {
				return (value as BooleanValue).value;
			}
			case ValueKind.NumberValue: {
				return !!(value as NumberValue).value;
			}
			case ValueKind.StringValue: {
				return !!(value as StringValue).value;
			}
			// case ValueKind.ObjectValue:
			// case ValueKind.ArrayValue:
			// case ValueKind.NativeFunctionValue:
			// case ValueKind.FunctionValue:
			default: {
				return true;
			}
		}

	}
};

eval_lu[AstNodeKind.WhenStatement] = (node: WhenStatement, environment: Environment): RuntimeValue => {
	TODO(node);
	return createRuntimeValue(ValueKind.null, {value: null}); // TODO
};

// eval_lu[AstNodeKind.ClassDeclarationStatement] = (node: ClassDeclarationStatement, environment: Environment): RuntimeValue => {
// 	return createRuntimeValue(ValueKind.null, {value: null}); // TODO
// };

// eval_lu[AstNodeKind.DeleteStatement] = (node: DeleteStatement, environment: Environment): RuntimeValue => {
// 	return createRuntimeValue(ValueKind.null, {value: null}); // TODO
// };

// eval_lu[AstNodeKind.ReverseStatement] = (node: ReverseStatement, environment: Environment): RuntimeValue => {
// 	return createRuntimeValue(ValueKind.null, {value: null}); // TODO
// };

// eval_lu[AstNodeKind.ImportStatement] = (node: ImportStatement, environment: Environment): RuntimeValue => {
// 	return createRuntimeValue(ValueKind.null, {value: null}); // TODO
// };

// eval_lu[AstNodeKind.ExportStatement] = (node: ExportStatement, environment: Environment): RuntimeValue => {
// 	return createRuntimeValue(ValueKind.null, {value: null}); // TODO
// };

/* -------------------------------------------------------------------------- */
/*                                 Expressions                                */
/* -------------------------------------------------------------------------- */
eval_lu[AstNodeKind.AssignmentExpression] = (node: AssignmentExpression, environment: Environment): RuntimeValue => {
	if (node.assigne.kind === AstNodeKind.SymbolExpression) {
		return environment.assignVar(node.assigne.symbol, evaluate(node.assignedValue, environment));
	}

	// else: node.assigne.kind === AstNodeKind.MemberExpression
	evaluate(node.assignedValue, environment);
	return createRuntimeValue(ValueKind.null, {value: null}); // TODO handle member expression (TODO when doing objects)
};

eval_lu[AstNodeKind.PrefixExpression] = (node: PrefixExpression, environment: Environment): RuntimeValue => {
	//TODO handle more data type
	switch (node.prefix.type) {
		case TokenType.Subtract: {
			const value = evaluate(node.right, environment);
			if ((value as PrimitiveValue).value != undefined) {
				return createNumber(-(value as PrimitiveValue).value);
			}
			return createNull();
		}
		case TokenType.LogicalNot: {
			const value = evaluate(node.right, environment);
			if ((value as PrimitiveValue).value != undefined) {
				return createBoolean(!(value as PrimitiveValue).value);
			}
			return createNull();
		}
		case TokenType.BitwiseNot: {
			const value = evaluate(node.right, environment);
			if ((value as PrimitiveValue).value != undefined) {
				return createNumber(~(value as PrimitiveValue).value);
			}
			return createNull();
		}
		default: {
			return createNull();
		}
	}


	TODO(node);
	return createRuntimeValue(ValueKind.null, {value: null}); // TODO
};

eval_lu[AstNodeKind.StateExpression] = (node: StateExpression, environment: Environment): RuntimeValue => {
	TODO(node);

	return createRuntimeValue(ValueKind.null, {value: null});
};

eval_lu[AstNodeKind.BinaryExpression] = (node: BinaryExpression, environment: Environment): RuntimeValue => {
	return calcBinaryOperation(evaluate(node.left, environment), node.operator, evaluate(node.right, environment));

	function calcBinaryOperation(left: RuntimeValue, operator: Token, right: RuntimeValue): RuntimeValue {
		//TODO check inputs to make sure they are compatible with the operators
		const leftValue = (left as PrimitiveValue).value;
		const rightValue = (right as PrimitiveValue).value;
	
		switch (operator.type) {
			// Comparison
			case TokenType.EqualSign: {
				return createNull(); //TODO
			}
			case TokenType.Smaller: {
				return createBoolean(leftValue < rightValue);
			}
			case TokenType.Greater: {
				return createBoolean(leftValue > rightValue);
			}
			case TokenType.SmallerEq: {
				return createBoolean(leftValue <= rightValue);
			}
			case TokenType.GreaterEq: {
				return createBoolean(leftValue >= rightValue);
			}
			case TokenType.Equals: {
				return createBoolean(leftValue == rightValue);
			}
			case TokenType.NotEq: {
				return createBoolean(leftValue != rightValue);
			}
			case TokenType.StrongEq: {
				return createBoolean(leftValue === rightValue);
			}
			case TokenType.StrongNotEq: {
				return createBoolean(leftValue !== rightValue);
			}
			case TokenType.StrongestEq: {
				return createNull(); //TODO
			}
			case TokenType.StrongestNotEq: {
				return createNull(); //TODO
			}
	
			// Arithmetic
			case TokenType.Add: {
				const value = (leftValue + (rightValue as any)) as string | number;
				if (typeof value == "number") {
					return createNumber(value);
				}
				return createString(value);
			}
			case TokenType.Subtract: {
				return createNumber((leftValue as any) - (rightValue as any));
			}
			case TokenType.Multiply: {
				return createNumber((leftValue as any) * (rightValue as any));
			}
			case TokenType.Divide: {
				return createNumber((leftValue as any) / (rightValue as any));
			}
			case TokenType.Modulo: {
				return createNumber((leftValue as any) % (rightValue as any));
			}
			case TokenType.Exponent: {
				return createNumber((leftValue as any) ** (rightValue as any));
			}
	
			// Logical
			case TokenType.LogicalAnd: {
				return createBoolean((leftValue as any) && (rightValue as any));
			}
			case TokenType.LogicalOr: {
				return createBoolean((leftValue as any) || (rightValue as any));
			}
	
			// Bitwise
			case TokenType.BitwiseAnd: {
				return createNumber((leftValue as any) & (rightValue as any));
			}
			case TokenType.BitwiseOr: {
				return createNumber((leftValue as any) | (rightValue as any));
			}
			case TokenType.BitwiseXor: {
				return createNumber((leftValue as any) ^ (rightValue as any));
			}
			case TokenType.BitShiftLeft: {
				return createNumber((leftValue as any) << (rightValue as any));
			}
			case TokenType.BitShiftRight: {
				return createNumber((leftValue as any) >> (rightValue as any));
			}
			case TokenType.BitShiftUnsignedLeft: {
				return createNumber((leftValue as any) << (rightValue as any)); //^ Doesn't exist, but I keep it for the lulz
			}
			case TokenType.BitShiftUnsignedRight: {
				return createNumber((leftValue as any) >>> (rightValue as any));
			}
	
			default: {
				return createNull();
			}
		}
	};
};

eval_lu[AstNodeKind.NumberExpression] = (node: NumberExpression, environment: Environment): RuntimeValue => {
	return createNumber(node.value);
};

eval_lu[AstNodeKind.StringExpression] = (node: StringExpression, environment: Environment): RuntimeValue => {
	return createString(node.value);
};

eval_lu[AstNodeKind.SymbolExpression] = (node: SymbolExpression, environment: Environment): RuntimeValue => {
	return environment.lookupVar(node.symbol);
};

// eval_lu[AstNodeKind.ObjectDeclarationExpression] = (node: ObjectDeclarationExpression, environment: Environment): RuntimeValue => {
// 	return createRuntimeValue(ValueKind.null, {value: null}); // TODO
// };

// eval_lu[AstNodeKind.ArrayDeclarationExpression] = (node: ArrayDeclarationExpression, environment: Environment): RuntimeValue => {
// 	return createRuntimeValue(ValueKind.null, {value: null}); // TODO
// };

// eval_lu[AstNodeKind.MemberExpression] = (node: MemberExpression, environment: Environment): RuntimeValue => {
// 	return createRuntimeValue(ValueKind.null, {value: null}); // TODO
// };

eval_lu[AstNodeKind.CallExpression] = (node: CallExpression, environment: Environment): RuntimeValue => {
	TODO(node);
	return createRuntimeValue(ValueKind.null, {value: null}); // TODO
};

/* -------------------------------------------------------------------------- */
/*                                End of blocks                               */
/* -------------------------------------------------------------------------- */
eval_lu[AstNodeKind.EOFStatement] = (node: EOFStatement, environment: Environment): RuntimeValue => {
	TODO(node);
	return createRuntimeValue(ValueKind.null, {value: null}); // TODO
};
eval_lu[AstNodeKind.EndOfBlockStatement] = (node: EndOfBlockStatement, environment: Environment): RuntimeValue => {
	TODO(node);
	return createRuntimeValue(ValueKind.null, {value: null}); // TODO
};


/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
/* -------------------------------------------------------------------------- */
function TODO(node: Statement) {
	console.log(`This AST node type (${node.kindName}) is under construction.`);
}