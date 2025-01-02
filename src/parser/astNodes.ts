import { TokenType } from "../lexer/token.ts";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const none = {} as any;

/* -------------------------- Node types and utils -------------------------- */
export enum AstNodeKind {
  None,
  Error,
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
  BranchingExpression,
}

// prettier-ignore
export type AstNodeType<T extends AstNodeKind> = /* Just for better formatting */ T extends never ? never
  // Statements
  : T extends AstNodeKind.ExpressionStatement ? ExpressionStatement
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
  // Expressions
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
  // Other
  : T extends AstNodeKind.BranchingStatement ? BranchingStatement<any>
  : T extends AstNodeKind.BranchingExpression ? BranchingExpression<any>
  : T extends AstNodeKind.EOFStatement ? EOFStatement
  : T extends AstNodeKind.EndOfBlockStatement ? EndOfBlockStatement
  : Statement;

type AstNodeProperties<T extends AstNodeKind> = Omit<AstNodeType<T>, "kindName" | "kind">;

export function createAstNode<T extends AstNodeKind>(
  kind: T,
  properties: AstNodeProperties<T>,
): AstNodeType<T> {
  Object.entries(properties).forEach(([name, value]) => {
    value === undefined && delete properties[name as keyof typeof properties];
  });

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
  start?: number;
  end?: number;
}

export interface Expression extends Statement {}

/** These are not real statements, they are when we have a syntax that can be more than one thing */
export interface BranchingStatement<T extends Statement> extends Statement {
  kind: AstNodeKind.BranchingStatement;
  branches: T[];
}

export interface BranchingExpression<T extends Expression> extends Expression {
  kind: AstNodeKind.BranchingExpression;
  branches: T[];
}

export type Lifetime = {
  duration: number;
  unit: "s" | "lines";
};

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

export interface VariableModifiers {
  canReassign: boolean;
  canMutate: boolean;
  superglobal: boolean;
}

export interface VariableDeclarationStatement extends Statement {
  kind: AstNodeKind.VariableDeclarationStatement;
  name: string;
  modifiers: VariableModifiers; // isConst, isConst
  value?: Expression;
  lifetime?: Lifetime;
}

export interface FunctionDeclarationStatement extends Statement {
  kind: AstNodeKind.FunctionDeclarationStatement;
  name: string;
  parameters: FunctionParameterDeclaration[];
  isAsync: boolean;
  body: ExpressionStatement | BlockStatement | BranchingStatement<ExpressionStatement | BlockStatement>;
}

export interface FunctionParameterDeclaration {
  identifier: string;
  lifetime?: Lifetime;
}

export interface ReturnStatement extends Statement {
  kind: AstNodeKind.ReturnStatement;
  argument: Expression;
}

export interface IfStatement extends Statement {
  kind: AstNodeKind.IfStatement;
  test: Expression;
  consequent: BlockStatement | BranchingStatement<BlockStatement>;
  alternate?: IfStatement | BlockStatement | BranchingStatement<IfStatement | BlockStatement>;
}

export interface WhenStatement extends Statement {
  kind: AstNodeKind.WhenStatement;
  test: Expression;
  consequent: BlockStatement | BranchingStatement<BlockStatement>;
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
  assigne: SymbolExpression | MemberExpression | BranchingStatement<SymbolExpression | MemberExpression>;
  assignedValue: Expression;
  // operator?: Token;
}

export interface PrefixExpression extends Expression {
  kind: AstNodeKind.PrefixExpression;
  prefix: TokenType;
  right: Expression;
}

export interface StateExpression extends Expression {
  kind: AstNodeKind.StateExpression;
  operator: TokenType;
  argument: SymbolExpression | MemberExpression;
}

export interface BinaryExpression extends Expression {
  kind: AstNodeKind.BinaryExpression;
  left: Expression;
  operator: TokenType;
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
  properties: Property[];
}

interface Property {
  key: StringExpression | NumberExpression | SymbolExpression;
  value: Expression;
  //~ not used yet
  shorthand: boolean; // if we do smt like {value}
  computed: boolean; // if we do smt like {[name]: value}
}

export interface ArrayDeclarationExpression extends Expression {
  kind: AstNodeKind.ArrayDeclarationExpression;
  elements: Expression;
}

export interface MemberExpression extends Expression {
  kind: AstNodeKind.MemberExpression;
  object: Expression;
  property: SymbolExpression | Expression;
  computed: boolean;
}

export interface CallExpression extends Expression {
  kind: AstNodeKind.CallExpression;
  callee: Expression;
  arguments: Expression[];
}
