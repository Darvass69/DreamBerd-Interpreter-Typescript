import { FunctionParameter, Statement } from "../parser/astNodes";
import Environment from "./environment";

export enum ValueKind {
	null,
	NullValue,
	UndefinedValue,
	BooleanValue,
	NumberValue,
	StringValue,
	ObjectValue,
	ArrayValue,
	NativeFunctionValue,
	FunctionValue
} 

export type ValueType<T> =
  T extends ValueKind.NullValue ? NullValue
  : T extends ValueKind.UndefinedValue ? UndefinedValue
  : T extends ValueKind.BooleanValue ? BooleanValue
  : T extends ValueKind.NumberValue ? NumberValue
  : T extends ValueKind.StringValue ? StringValue
  : T extends ValueKind.ObjectValue ? ObjectValue
  : T extends ValueKind.ArrayValue ? ArrayValue
  : T extends ValueKind.NativeFunctionValue ? NativeFunctionValue
  : T extends ValueKind.FunctionValue ? FunctionValue
  : RuntimeValue;

type ValueProperties<T extends ValueKind> = Omit<ValueType<T>, keyof RuntimeValue>;

export function createRuntimeValue<T extends ValueKind>(kind: T, properties: ValueProperties<T>): ValueType<T> {
  return {
    typeName: ValueKind[kind] as string,
    type: kind,
    ...properties,
  } as ValueType<T>;
}


export interface RuntimeValue {
	type: ValueKind
	typeName: string
}

/* --------------------------------- Values --------------------------------- */
export type PrimitiveValue = BooleanValue | NumberValue | StringValue

export interface NullValue extends RuntimeValue {
	type: ValueKind.NullValue;
	value: null
}
export function createNull(): NullValue {
	return createRuntimeValue(ValueKind.NullValue, {value: null});
}

export interface UndefinedValue extends RuntimeValue {
	type: ValueKind.UndefinedValue;
	value: undefined
}
export function createUndefined(): UndefinedValue {
	return createRuntimeValue(ValueKind.UndefinedValue, {value: undefined});
}


export interface BooleanValue extends RuntimeValue {
	type: ValueKind.BooleanValue
	value: boolean
}
export function createBoolean(value: boolean): BooleanValue {
	return createRuntimeValue(ValueKind.BooleanValue, {value});
}


export interface NumberValue extends RuntimeValue {
	type: ValueKind.NumberValue
	value: number
}
export function createNumber(value: number): NumberValue {
	return createRuntimeValue(ValueKind.NumberValue, {value});
}


export interface StringValue extends RuntimeValue {
	type: ValueKind.StringValue
	value: string
}
export function createString(value: string): StringValue {
	return createRuntimeValue(ValueKind.StringValue, {value});
}


//TODO these need to be a bit more complex to handle default properties like push
export interface ObjectValue extends RuntimeValue {
	type: ValueKind.ObjectValue
	properties: Map<string, RuntimeValue>
}

export interface ArrayValue extends RuntimeValue {
	type: ValueKind.ArrayValue
	properties: Map<number, RuntimeValue>
}

/* -------------------------------- Functions ------------------------------- */
export type FunctionCall = (parameters: RuntimeValue[], environment: Environment) => RuntimeValue;

export interface NativeFunctionValue extends RuntimeValue {
	type: ValueKind.NativeFunctionValue
	call: FunctionCall
}

export interface FunctionValue extends RuntimeValue {
	type: ValueKind.FunctionValue
	name: string
	parameters: FunctionParameter[]
	declarationEnvironment: Environment,
	body: Statement[]
}


//TODO runtime lifetime