import { Token, TokenType } from "../lexer/token";

// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
const none = {} as any;

/* -------------------------- Node types and utils -------------------------- */
export enum AstNodeKind {
  None,
  ExpressionStatement,
  BlockStatement,
  VariableDeclarationStatement,
  FunctionDeclarationStatement,
  ReturnStatement,
  IfStatement,
  WhenStatement,
  ClassDeclarationStatement,
  DeleteStatement,
  ReverseStatement,
  ImportStatement,
  ExportStatement,

  AssignmentExpression,

  PrefixExpression,
  StateExpression,
  BinaryExpression,
  NumberExpression,
  StringExpression,
  SymbolExpression,
  ObjectDeclarationExpression,
  ArrayDeclarationExpression,
  MemberExpression,
  CallExpression,

  EOFStatement,
  EndOfBlockStatement,

  BranchingStatement,
  BranchingExpression
}

// prettier-ignore
export type AstNodeType<T extends AstNodeKind> =
  T extends AstNodeKind.ExpressionStatement ? ExpressionStatement
  : T extends AstNodeKind.BlockStatement ? BlockStatement
  : T extends AstNodeKind.VariableDeclarationStatement ? VariableDeclarationStatement
  : T extends AstNodeKind.AssignmentExpression ? AssignmentExpression
  : T extends AstNodeKind.FunctionDeclarationStatement ? FunctionDeclarationStatement
  : T extends AstNodeKind.ReturnStatement ? ReturnStatement
  : T extends AstNodeKind.IfStatement ? IfStatement
  : T extends AstNodeKind.WhenStatement ? WhenStatement
  : T extends AstNodeKind.ClassDeclarationStatement ? ClassDeclarationStatement
  : T extends AstNodeKind.DeleteStatement ? DeleteStatement
  : T extends AstNodeKind.ReverseStatement ? ReverseStatement
  : T extends AstNodeKind.ImportStatement ? ImportStatement
  : T extends AstNodeKind.ExportStatement ? ExportStatement

  : T extends AstNodeKind.PrefixExpression ? PrefixExpression
  : T extends AstNodeKind.StateExpression ? StateExpression
  : T extends AstNodeKind.BinaryExpression ? BinaryExpression
  : T extends AstNodeKind.NumberExpression ? NumberExpression
  : T extends AstNodeKind.StringExpression ? StringExpression
  : T extends AstNodeKind.SymbolExpression ? SymbolExpression
  : T extends AstNodeKind.ObjectDeclarationExpression ? ObjectDeclarationExpression
  : T extends AstNodeKind.ArrayDeclarationExpression ? ArrayDeclarationExpression
  : T extends AstNodeKind.MemberExpression ? MemberExpression
  : T extends AstNodeKind.CallExpression ? CallExpression

  : T extends AstNodeKind.BranchingStatement ? BranchingStatement
  : T extends AstNodeKind.BranchingExpression ? BranchingExpression
  : T extends AstNodeKind.EOFStatement ? EOFStatement
  : T extends AstNodeKind.EndOfBlockStatement ? EndOfBlockStatement
  : Statement;

type AstNodeProperties<T extends AstNodeKind> = Omit<AstNodeType<T>, keyof Statement>;

export function createAstNode<T extends AstNodeKind>(
  kind: T,
  properties: AstNodeProperties<T>
): AstNodeType<T> {

  return {
    kindName: AstNodeKind[kind] as string,
    kind: kind,
    ...properties,
  } as AstNodeType<T>;
}

/* ---------------------------- Node Definitions ---------------------------- */
export interface Statement {
  kind: AstNodeKind;
  kindName: string;
}

export interface Expression extends Statement {}

/** These are not real statements, they are when we have a syntax that can be more than one thing */
export interface BranchingStatement extends Statement {
  kind: AstNodeKind.BranchingExpression;
  branches: (Statement | Statement[])[];
}

export interface BranchingExpression extends Expression {
  kind: AstNodeKind.BranchingExpression;
  branches: Expression[];
}

export type Lifetime = {
  duration: number;
  unit: "s" | "lines";
}

export interface EOFStatement extends Statement {
  kind: AstNodeKind.EOFStatement;
}

export interface EndOfBlockStatement extends Statement {
  kind: AstNodeKind.EndOfBlockStatement;
}

/* -------------------------------------------------------------------------- */
/*                                 Statements                                 */
/* -------------------------------------------------------------------------- */
export interface ExpressionStatement extends Statement {
  kind: AstNodeKind.ExpressionStatement;
  expression: Expression;
}

export interface BlockStatement extends Statement {
  kind: AstNodeKind.BlockStatement;
  body: Statement[];
}

export interface VariableDeclarationStatement extends Statement {
  kind: AstNodeKind.VariableDeclarationStatement;
  identifier: string;
  modifiers: [canReassign: boolean, canMutate: boolean]; // isConst, isConst
  value?: Expression;
  lifetime?: Lifetime;
}

export interface FunctionDeclarationStatement extends Statement {
  kind: AstNodeKind.FunctionDeclarationStatement;
  identifier: Token;
  parameters: FunctionParameter[];
  isAsync: boolean;
  body: ExpressionStatement | BlockStatement;
}

export interface FunctionParameter {
  identifier: Token;
  lifetime?: Lifetime
}

export interface ReturnStatement extends Statement {
  kind: AstNodeKind.ReturnStatement;
  argument: Expression;
}

export interface IfStatement extends Statement {
  kind: AstNodeKind.IfStatement;
  test: Expression;
  consequent: BlockStatement;
  alternate?: IfStatement | BlockStatement
}

export interface WhenStatement extends Statement {
  kind: AstNodeKind.WhenStatement;
  test: Expression;
  consequent: BlockStatement;
}

export interface ClassDeclarationStatement extends Statement {
  kind: AstNodeKind.ClassDeclarationStatement; //TODO
}

export interface DeleteStatement extends Statement {
  kind: AstNodeKind.DeleteStatement; //TODO
}

export interface ReverseStatement extends Statement {
  kind: AstNodeKind.ReverseStatement; //TODO
}

export interface ImportStatement extends Statement {
  kind: AstNodeKind.ImportStatement; //TODO
}

export interface ExportStatement extends Statement {
  kind: AstNodeKind.ExportStatement; //TODO
}

/* -------------------------------------------------------------------------- */
/*                                 Expressions                                */
/* -------------------------------------------------------------------------- */
export interface AssignmentExpression extends Expression {
  kind: AstNodeKind.AssignmentExpression;
  assigne: SymbolExpression | MemberExpression;
  assignedValue: Expression;
  // operator?: Token;
}

export interface PrefixExpression extends Expression {
  kind: AstNodeKind.PrefixExpression;
  prefix: Token;
  right: Expression;
}

export interface StateExpression extends Expression {
  kind: AstNodeKind.StateExpression;
  operator: Token;
  argument: SymbolExpression | MemberExpression
}

export interface BinaryExpression extends Expression {
  kind: AstNodeKind.BinaryExpression;
  left: Expression;
  operator: Token;
  right: Expression;
}

// Primary expression
export interface NumberExpression extends Expression {
  kind: AstNodeKind.NumberExpression;
  value: number;
}

// Primary expression
export interface StringExpression extends Expression {
  kind: AstNodeKind.StringExpression;
  value: string;
}

// Primary expression
export interface SymbolExpression extends Expression {
  kind: AstNodeKind.SymbolExpression;
  symbol: string;
}

export interface ObjectDeclarationExpression extends Expression {
  kind: AstNodeKind.ObjectDeclarationExpression;
  properties: Property[]
}

interface Property {
	key: StringExpression | NumberExpression | SymbolExpression
	value: Expression
  //~ not used yet
  shorthand: boolean // if we do smt like {value}
	computed: boolean // if we do smt like {[name]: value}
}

export interface ArrayDeclarationExpression extends Expression {
  kind: AstNodeKind.ArrayDeclarationExpression;
  elements: Expression
}

export interface MemberExpression extends Expression {
  kind: AstNodeKind.MemberExpression;
  object: Expression
  property: SymbolExpression | Expression
  computed: boolean
}

export interface CallExpression extends Expression {
  kind: AstNodeKind.CallExpression;
  callee: Expression
  arguments: Expression[]
}
