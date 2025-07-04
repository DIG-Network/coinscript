/**
 * CoinScript AST Types
 * 
 * Abstract Syntax Tree node definitions for CoinScript
 */

export interface ASTNode {
  type: string;
  line: number;
  column: number;
}

export interface CoinDeclaration extends ASTNode {
  type: 'CoinDeclaration';
  name: string;
  layers: LayerDeclaration[];
  storage?: StorageVariable[];
  constructor?: Constructor;
  actions: ActionDeclaration[];
  events: EventDeclaration[];
  innerPuzzles?: InnerPuzzleDeclaration[];
  composition?: CompositionBlock;
  stateBlock?: StateBlock;
  stateDeclarations?: StateDeclaration[];
  decorators?: Decorator[];
}

export interface LayerDeclaration extends ASTNode {
  type: 'LayerDeclaration';
  layerType: string;
  params: Record<string, Expression>;
}

export interface StorageVariable extends ASTNode {
  type: 'StorageVariable';
  dataType: string;
  name: string;
  initialValue?: Expression;
}

export interface Constructor extends ASTNode {
  type: 'Constructor';
  parameters: Parameter[];
  body: Statement[];
}

export interface ActionDeclaration extends ASTNode {
  type: 'ActionDeclaration';
  name: string;
  parameters: Parameter[];
  body: Statement[];
  decorators?: Decorator[];
  modifiers?: string[];
  returnType?: string;
  visibility?: 'view' | 'pure';
}

export interface EventDeclaration extends ASTNode {
  type: 'EventDeclaration';
  name: string;
  parameters: Parameter[];
}

export interface Parameter extends ASTNode {
  type: 'Parameter';
  dataType: string;
  name: string;
}

// Statements
export interface Statement extends ASTNode {
  // Base interface for statements
}

export interface RequireStatement extends Statement {
  type: 'RequireStatement';
  condition: Expression;
  message?: string;
}

export interface SendStatement extends Statement {
  type: 'SendStatement';
  recipient: Expression;
  amount: Expression;
}

export interface EmitStatement extends Statement {
  type: 'EmitStatement';
  eventName: string;
  arguments: Expression[];
}

export interface IfStatement extends Statement {
  type: 'IfStatement';
  condition: Expression;
  thenBody: Statement[];
  elseBody?: Statement[];
}

export interface AssignmentStatement extends Statement {
  type: 'AssignmentStatement';
  target: Expression;
  operator: string;
  value: Expression;
}

export interface ExpressionStatement extends Statement {
  type: 'ExpressionStatement';
  expression: Expression;
}

// Expressions
export interface Expression extends ASTNode {
  // Base interface for expressions
  toModHash?(): string;
  toPuzzleReveal?(): string;
  toChiaLisp?(): string;
}

export interface BinaryExpression extends Expression {
  type: 'BinaryExpression';
  left: Expression;
  operator: string;
  right: Expression;
}

export interface UnaryExpression extends Expression {
  type: 'UnaryExpression';
  operator: string;
  operand: Expression;
}

export interface MemberExpression extends Expression {
  type: 'MemberExpression';
  object: Expression;
  property: Expression;
  computed: boolean;
}

export interface CallExpression extends Expression {
  type: 'CallExpression';
  callee: Expression;
  arguments: Expression[];
}

export interface Identifier extends Expression {
  type: 'Identifier';
  name: string;
}

export interface Literal extends Expression {
  type: 'Literal';
  value: string | number | boolean;
  raw: string;
}

// State and Decorator nodes
export interface StateBlock extends ASTNode {
  type: 'StateBlock';
  fields: StateField[];
}

export interface StateField extends ASTNode {
  type: 'StateField';
  dataType: string;
  name: string;
  isMapping?: boolean;
}

export interface StateDeclaration extends ASTNode {
  type: 'StateDeclaration';
  dataType: string;
  name: string;
  initialValue?: Expression;
}

export interface Decorator extends ASTNode {
  type: 'Decorator';
  name: string;
  arguments: Expression[];
}

// Inner Puzzle nodes
export interface PuzzleDeclaration extends ASTNode {
  type: 'PuzzleDeclaration';
  name: string;
  constructor?: Constructor;
  actions: ActionDeclaration[];
}

export interface InnerPuzzleDeclaration extends ASTNode {
  type: 'InnerPuzzleDeclaration';
  name: string;
  inline: boolean;
  puzzle?: PuzzleDeclaration;
  interfaceType?: string;
}

export interface CompositionBlock extends ASTNode {
  type: 'CompositionBlock';
  base: CompositionEntry;
  layers: CompositionEntry[];
}

export interface CompositionEntry extends ASTNode {
  type: 'CompositionEntry';
  puzzleName: string;
  parameters: Record<string, Expression>;
}

export interface UseStatement extends ASTNode {
  type: 'UseStatement';
  puzzleName: string;
  parameters: Record<string, Expression>;
} 