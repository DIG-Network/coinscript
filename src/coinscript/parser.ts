/**
 * CoinScript Parser
 * 
 * Parses CoinScript syntax and compiles to PuzzleBuilder objects
 */

import { PuzzleBuilder, variable, expr } from '../builder';
import { 
  withStateLayer, 
  withSingletonLayer,
  createSingletonLauncher, 
  withOwnershipLayer, 
  withRoyaltyLayer, 
  withMetadataLayer, 
  withNotificationLayer, 
  withTransferProgramLayer,
  withActionLayer,
  withSlotMachineLayer,
  createSingletonTemplate
} from '../layers';
import { Expression as PuzzleExpression } from '../builder/PuzzleBuilder';
import { sha256tree, list, int, sym, NIL, TreeNode, Atom, List } from '../core';
import { createHash } from 'crypto';
import * as fs from 'fs';
import { addressToPuzzleHash } from '@dignetwork/datalayer-driver';

// Token types
enum TokenType {
  // Keywords
  COIN = 'COIN',
  STORAGE = 'STORAGE',
  CONSTRUCTOR = 'CONSTRUCTOR',
  ACTION = 'ACTION',
  EVENT = 'EVENT',
  REQUIRE = 'REQUIRE',
  IF = 'IF',
  ELSE = 'ELSE',
  SEND = 'SEND',
  EMIT = 'EMIT',
  EXCEPTION = 'EXCEPTION',
  LAYER = 'LAYER',
  WITH = 'WITH',
  SINGLETON = 'SINGLETON',
  STATE = 'STATE',
  OWNERSHIP = 'OWNERSHIP',
  ROYALTY = 'ROYALTY',
  METADATA = 'METADATA',
  NOTIFICATION = 'NOTIFICATION',
  TRANSFER = 'TRANSFER',
  ACTIONLAYER = 'ACTIONLAYER',
  CONST = 'CONST',
  FUNCTION = 'FUNCTION',
  INLINE = 'INLINE',
  RETURN = 'RETURN',
  
  // Types
  UINT256 = 'UINT256',
  ADDRESS = 'ADDRESS',
  BOOL = 'BOOL',
  MAPPING = 'MAPPING',
  BYTES32 = 'BYTES32',
  STRING_TYPE = 'STRING_TYPE',
  
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  IDENTIFIER = 'IDENTIFIER',
  HEX = 'HEX',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  
  // Operators
  PLUS = 'PLUS',
  MINUS = 'MINUS',
  MULTIPLY = 'MULTIPLY',
  DIVIDE = 'DIVIDE',
  MODULO = 'MODULO',
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  GREATER_EQUALS = 'GREATER_EQUALS',
  LESS_EQUALS = 'LESS_EQUALS',
  ASSIGN = 'ASSIGN',
  PLUS_ASSIGN = 'PLUS_ASSIGN',
  MINUS_ASSIGN = 'MINUS_ASSIGN',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  
  // Delimiters
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACE = 'LBRACE',
  RBRACE = 'RBRACE',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  SEMICOLON = 'SEMICOLON',
  COMMA = 'COMMA',
  DOT = 'DOT',
  ARROW = 'ARROW',
  COLON = 'COLON',
  AT = 'AT',
  
  // Special
  EOF = 'EOF',
  NEWLINE = 'NEWLINE',
  COMMENT = 'COMMENT'
}

interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

/**
 * Tokenizer for CoinScript
 */
class Tokenizer {
  private input: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;
  
  constructor(input: string) {
    this.input = input;
  }
  
  tokenize(): Token[] {
    const tokens: Token[] = [];
    
    while (this.position < this.input.length) {
      this.skipWhitespace();
      
      if (this.position >= this.input.length) break;
      
      const token = this.nextToken();
      if (token && token.type !== TokenType.COMMENT) {
        tokens.push(token);
      }
    }
    
    tokens.push({
      type: TokenType.EOF,
      value: '',
      line: this.line,
      column: this.column
    });
    
    return tokens;
  }
  
  private nextToken(): Token | null {
    const startLine = this.line;
    const startColumn = this.column;
    
    const char = this.input[this.position];
    
    // Comments
    if (char === '/' && this.peek() === '/') {
      return this.readComment();
    }
    
    // Hex literals - check before general numbers
    if (char === '0' && (this.peek() === 'x' || this.peek() === 'X')) {
      return this.readHex();
    }
    
    // Numbers
    if (/\d/.test(char)) {
      return this.readNumber();
    }
    
    // Strings
    if (char === '"' || char === "'") {
      return this.readString();
    }
    
    // Identifiers and keywords
    if (/[a-zA-Z_]/.test(char)) {
      return this.readIdentifier();
    }
    
    // Two-character operators
    const twoChar = this.input.slice(this.position, this.position + 2);
    const twoCharOps: Record<string, TokenType> = {
      '==': TokenType.EQUALS,
      '!=': TokenType.NOT_EQUALS,
      '>=': TokenType.GREATER_EQUALS,
      '<=': TokenType.LESS_EQUALS,
      '+=': TokenType.PLUS_ASSIGN,
      '-=': TokenType.MINUS_ASSIGN,
      '=>': TokenType.ARROW,
      '&&': TokenType.AND,
      '||': TokenType.OR
    };
    
    if (twoCharOps[twoChar]) {
      this.advance(2);
      return {
        type: twoCharOps[twoChar],
        value: twoChar,
        line: startLine,
        column: startColumn
      };
    }
    
    // Single-character tokens
    const singleCharOps: Record<string, TokenType> = {
      '+': TokenType.PLUS,
      '-': TokenType.MINUS,
      '*': TokenType.MULTIPLY,
      '/': TokenType.DIVIDE,
      '%': TokenType.MODULO,
      '>': TokenType.GREATER_THAN,
      '<': TokenType.LESS_THAN,
      '=': TokenType.ASSIGN,
      '!': TokenType.NOT,
      '(': TokenType.LPAREN,
      ')': TokenType.RPAREN,
      '{': TokenType.LBRACE,
      '}': TokenType.RBRACE,
      '[': TokenType.LBRACKET,
      ']': TokenType.RBRACKET,
      ';': TokenType.SEMICOLON,
      ',': TokenType.COMMA,
      '.': TokenType.DOT,
      ':': TokenType.COLON,
      '@': TokenType.AT
    };
    
    if (singleCharOps[char]) {
      this.advance();
      return {
        type: singleCharOps[char],
        value: char,
        line: startLine,
        column: startColumn
      };
    }
    
    throw new Error(`Unexpected character '${char}' at line ${this.line}, column ${this.column}`);
  }
  
  private readComment(): Token {
    const startLine = this.line;
    const startColumn = this.column;
    
    this.advance(2); // Skip //
    const start = this.position;
    
    while (this.position < this.input.length && this.input[this.position] !== '\n') {
      this.advance();
    }
    
    return {
      type: TokenType.COMMENT,
      value: this.input.slice(start, this.position).trim(),
      line: startLine,
      column: startColumn
    };
  }
  
  private readNumber(): Token {
    const start = this.position;
    const startLine = this.line;
    const startColumn = this.column;
    
    while (this.position < this.input.length && /[\d_]/.test(this.input[this.position])) {
      this.advance();
    }
    
    const value = this.input.slice(start, this.position).replace(/_/g, '');
    
    return {
      type: TokenType.NUMBER,
      value,
      line: startLine,
      column: startColumn
    };
  }
  
  private readHex(): Token {
    const start = this.position;
    const startLine = this.line;
    const startColumn = this.column;
    
    this.advance(2); // Skip 0x
    
    while (this.position < this.input.length && /[0-9a-fA-F]/.test(this.input[this.position])) {
      this.advance();
    }
    
    return {
      type: TokenType.HEX,
      value: this.input.slice(start, this.position),
      line: startLine,
      column: startColumn
    };
  }
  
  private readString(): Token {
    const startLine = this.line;
    const startColumn = this.column;
    const quote = this.input[this.position];
    
    this.advance(); // Skip opening quote
    
    let value = '';
    while (this.position < this.input.length && this.input[this.position] !== quote) {
      if (this.input[this.position] === '\\' && this.position + 1 < this.input.length) {
        this.advance();
        // Handle escape sequences
        const escaped = this.input[this.position];
        switch (escaped) {
          case 'n': value += '\n'; break;
          case 't': value += '\t'; break;
          case 'r': value += '\r'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          case "'": value += "'"; break;
          default: value += escaped;
        }
      } else {
        value += this.input[this.position];
      }
      this.advance();
    }
    
    if (this.position >= this.input.length) {
      throw new Error(`Unterminated string at line ${startLine}, column ${startColumn}`);
    }
    
    this.advance(); // Skip closing quote
    
    return {
      type: TokenType.STRING,
      value,
      line: startLine,
      column: startColumn
    };
  }
  
  private readIdentifier(): Token {
    const start = this.position;
    const startLine = this.line;
    const startColumn = this.column;
    
    while (this.position < this.input.length && /[a-zA-Z0-9_]/.test(this.input[this.position])) {
      this.advance();
    }
    
    const value = this.input.slice(start, this.position);
    
    // Check if it's a keyword
    const keywords: Record<string, TokenType> = {
      'coin': TokenType.COIN,
      'storage': TokenType.STORAGE,
      'constructor': TokenType.CONSTRUCTOR,
      'action': TokenType.ACTION,
      'event': TokenType.EVENT,
      'require': TokenType.REQUIRE,
      'if': TokenType.IF,
      'else': TokenType.ELSE,
      'send': TokenType.SEND,
      'emit': TokenType.EMIT,
      'exception': TokenType.EXCEPTION,
      'layer': TokenType.LAYER,
      'with': TokenType.WITH,
      'singleton': TokenType.SINGLETON,
      'state': TokenType.STATE,
      'ownership': TokenType.OWNERSHIP,
      'royalty': TokenType.ROYALTY,
      'metadata': TokenType.METADATA,
      'notification': TokenType.NOTIFICATION,
      'transfer': TokenType.TRANSFER,
      'actionlayer': TokenType.ACTIONLAYER,
      'const': TokenType.CONST,
      'function': TokenType.FUNCTION,
      'inline': TokenType.INLINE,
      'return': TokenType.RETURN,
      'uint256': TokenType.UINT256,
      'address': TokenType.ADDRESS,
      'bool': TokenType.BOOL,
      'bytes32': TokenType.BYTES32,
      'string': TokenType.STRING_TYPE,
      'mapping': TokenType.MAPPING,
      'true': TokenType.TRUE,
      'false': TokenType.FALSE
    };
    
    const type = keywords[value.toLowerCase()] || TokenType.IDENTIFIER;
    
    return {
      type,
      value,
      line: startLine,
      column: startColumn
    };
  }
  
  private skipWhitespace(): void {
    while (this.position < this.input.length && /\s/.test(this.input[this.position])) {
      if (this.input[this.position] === '\n') {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
      this.position++;
    }
  }
  
  private advance(count: number = 1): void {
    for (let i = 0; i < count; i++) {
      if (this.position < this.input.length) {
        if (this.input[this.position] === '\n') {
          this.line++;
          this.column = 1;
        } else {
          this.column++;
        }
        this.position++;
      }
    }
  }
  
  private peek(): string {
    return this.position + 1 < this.input.length ? this.input[this.position + 1] : '';
  }
}

/**
 * AST Node types
 */
interface ASTNode {
  type: string;
  line: number;
  column: number;
}

interface CoinDeclaration extends ASTNode {
  type: 'CoinDeclaration';
  name: string;
  layers: LayerDeclaration[];
  storage?: StorageVariable[];
  state?: StateVariable[];
  stateBlock?: StateBlock;
  constructor?: Constructor;
  constants?: ConstantDeclaration[];
  functions?: FunctionDeclaration[];
  actions: ActionDeclaration[];
  events: EventDeclaration[];
  decorators?: Decorator[];
}

interface LayerDeclaration extends ASTNode {
  type: 'LayerDeclaration';
  layerType: string;
  params: Record<string, Expression>;
}

interface StorageVariable extends ASTNode {
  type: 'StorageVariable';
  dataType: string;
  name: string;
  initialValue?: Expression;
}

interface StateVariable extends ASTNode {
  type: 'StateVariable';
  dataType: string;
  name: string;
  initialValue?: Expression;
}

interface Constructor extends ASTNode {
  type: 'Constructor';
  parameters: Parameter[];
  body: Statement[];
}

interface ActionDeclaration extends ASTNode {
  type: 'ActionDeclaration';
  name: string;
  parameters: Parameter[];
  body: Statement[];
  decorators?: Decorator[];
}

interface EventDeclaration extends ASTNode {
  type: 'EventDeclaration';
  name: string;
  parameters: Parameter[];
}

interface ConstantDeclaration extends ASTNode {
  type: 'ConstantDeclaration';
  name: string;
  value: Expression;
}

interface FunctionDeclaration extends ASTNode {
  type: 'FunctionDeclaration';
  name: string;
  parameters: Parameter[];
  returnType?: string;
  body: Statement[];
  isInline?: boolean;
}

interface Parameter extends ASTNode {
  type: 'Parameter';
  dataType: string;
  name: string;
}

interface Statement extends ASTNode {
  // Base interface for statements
}

interface RequireStatement extends Statement {
  type: 'RequireStatement';
  condition: Expression;
  message?: string;
}

interface SendStatement extends Statement {
  type: 'SendStatement';
  recipient: Expression;
  amount: Expression;
  memo?: Expression;
}

interface EmitStatement extends Statement {
  type: 'EmitStatement';
  eventName: string;
  arguments: Expression[];
}

interface ExceptionStatement extends Statement {
  type: 'ExceptionStatement';
  message?: string;
}

interface IfStatement extends Statement {
  type: 'IfStatement';
  condition: Expression;
  thenBody: Statement[];
  elseBody?: Statement[];
}

interface AssignmentStatement extends Statement {
  type: 'AssignmentStatement';
  target: Expression;
  operator: string;
  value: Expression;
}

interface ExpressionStatement extends Statement {
  type: 'ExpressionStatement';
  expression: Expression;
}

interface ReturnStatement extends Statement {
  type: 'ReturnStatement';
  value?: Expression;
}

interface Expression extends ASTNode {
  // Base interface for expressions
}

interface BinaryExpression extends Expression {
  type: 'BinaryExpression';
  left: Expression;
  operator: string;
  right: Expression;
}

interface UnaryExpression extends Expression {
  type: 'UnaryExpression';
  operator: string;
  operand: Expression;
}

interface MemberExpression extends Expression {
  type: 'MemberExpression';
  object: Expression;
  property: Expression;
  computed: boolean;
}

interface CallExpression extends Expression {
  type: 'CallExpression';
  callee: Expression;
  arguments: Expression[];
}

interface Identifier extends Expression {
  type: 'Identifier';
  name: string;
}

interface Literal extends Expression {
  type: 'Literal';
  value: string | number | boolean;
  raw: string;
}

interface Decorator extends ASTNode {
  type: 'Decorator';
  name: string;
  arguments: Expression[];
}

interface StateBlock extends ASTNode {
  type: 'StateBlock';
  fields: StateField[];
}

interface StateField extends ASTNode {
  type: 'StateField';
  dataType: string;
  name: string;
  isMapping?: boolean;
}

/**
 * Result of compiling CoinScript that may contain multiple puzzles
 */
export interface CoinScriptCompilationResult {
  /** Main puzzle for the coin */
  mainPuzzle: PuzzleBuilder;
  
  /** Optional launcher puzzle (e.g., for singleton) */
  launcherPuzzle?: PuzzleBuilder;
  
  /** Additional puzzles (e.g., action puzzles for slot machine) */
  additionalPuzzles?: Record<string, PuzzleBuilder>;
  
  /** Inner puzzle (unwrapped CoinScript logic) when using decorators like @singleton */
  innerPuzzle?: PuzzleBuilder;
  
  /** All puzzles in order (inner to outer) for serialization */
  allPuzzles?: PuzzleBuilder[];
  
  /** Metadata about the compilation */
  metadata?: {
    coinName: string;
    hasSingleton: boolean;
    hasStatefulActions: boolean;
    hasInnerPuzzleActions: boolean;
    launcherId?: string;
  };
}

/**
 * Parser for CoinScript
 */
class Parser {
  private tokens: Token[];
  private position: number = 0;
  
  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }
  
  parse(): CoinDeclaration {
    // Check for decorators before coin declaration
    let decorators: Decorator[] | undefined;
    if (this.check(TokenType.AT)) {
      decorators = this.parseDecorators();
    }
    
    const coin = this.parseCoinDeclaration();
    if (decorators) {
      coin.decorators = decorators;
    }
    
    return coin;
  }
  
  private parseCoinDeclaration(): CoinDeclaration {
    this.expect(TokenType.COIN);
    const name = this.expect(TokenType.IDENTIFIER);
    
    const coin: CoinDeclaration = {
      type: 'CoinDeclaration',
      name: name.value,
      layers: [],
      storage: undefined,
      state: undefined,
      stateBlock: undefined,
      constructor: undefined,
      actions: [],
      events: [],
      line: name.line,
      column: name.column
    };
    
    this.expect(TokenType.LBRACE);
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.match(TokenType.LAYER)) {
        coin.layers.push(this.parseLayerDeclaration());
      } else if (this.match(TokenType.STORAGE)) {
        // Check if it's a block or single declaration
        if (this.check(TokenType.LBRACE)) {
          // Block syntax: storage { ... }
          this.expect(TokenType.LBRACE);
          const variables: StorageVariable[] = [];
          while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
            variables.push(this.parseStorageVariable());
          }
          this.expect(TokenType.RBRACE);
          coin.storage = variables;
        } else {
          // Single declaration: storage type name = value;
          if (!coin.storage) coin.storage = [];
          coin.storage.push(this.parseStorageVariable());
        }
      } else if (this.match(TokenType.STATE)) {
        // Check if it's a block or single declaration
        if (this.check(TokenType.LBRACE)) {
          // State block syntax: state { ... }
          coin.stateBlock = this.parseStateBlock();
        } else {
          // Single declaration: state type name = value;
          if (!coin.state) coin.state = [];
          coin.state.push(this.parseStateVariable());
        }
      } else if (this.match(TokenType.CONSTRUCTOR)) {
        coin.constructor = this.parseConstructor();
      } else if (this.match(TokenType.CONST)) {
        if (!coin.constants) coin.constants = [];
        coin.constants.push(this.parseConstantDeclaration());
      } else if (this.match(TokenType.FUNCTION) || this.match(TokenType.INLINE)) {
        if (!coin.functions) coin.functions = [];
        coin.functions.push(this.parseFunctionDeclaration());
      } else if (this.match(TokenType.ACTION)) {
        coin.actions.push(this.parseActionDeclaration());
      } else if (this.match(TokenType.EVENT)) {
        coin.events.push(this.parseEventDeclaration());
      } else if (this.check(TokenType.AT)) {
        // Parse decorators followed by action
        const decorators = this.parseDecorators();
        this.expect(TokenType.ACTION);
        const action = this.parseActionDeclaration();
        action.decorators = decorators;
        coin.actions.push(action);
      } else {
        throw new Error(`Unexpected token ${this.current().value} at line ${this.current().line}`);
      }
    }
    
    this.expect(TokenType.RBRACE);
    
    return coin;
  }
  
  private parseLayerDeclaration(): LayerDeclaration {
    const layerType = this.expect(
      TokenType.SINGLETON,
      TokenType.STATE,
      TokenType.OWNERSHIP,
      TokenType.ROYALTY,
      TokenType.METADATA,
      TokenType.NOTIFICATION,
      TokenType.TRANSFER,
      TokenType.ACTIONLAYER
    );
    
    const layer: LayerDeclaration = {
      type: 'LayerDeclaration',
      layerType: layerType.value.toLowerCase(),
      params: {},
      line: layerType.line,
      column: layerType.column
    };
    
    if (this.match(TokenType.LPAREN)) {
      // Parse layer parameters
      while (!this.check(TokenType.RPAREN) && !this.isAtEnd()) {
        const paramName = this.expect(TokenType.IDENTIFIER);
        this.expect(TokenType.COLON);
        const paramValue = this.parseExpression();
        layer.params[paramName.value] = paramValue;
        
        if (!this.check(TokenType.RPAREN)) {
          this.expect(TokenType.COMMA);
        }
      }
      this.expect(TokenType.RPAREN);
    }
    
    this.expect(TokenType.SEMICOLON);
    
    return layer;
  }
  
  private parseStorageVariable(): StorageVariable {
    const dataType = this.parseDataType();
    const name = this.expect(TokenType.IDENTIFIER);
    
    const variable: StorageVariable = {
      type: 'StorageVariable',
      dataType,
      name: name.value,
      line: name.line,
      column: name.column
    };
    
    if (this.match(TokenType.ASSIGN)) {
      variable.initialValue = this.parseExpression();
    }
    
    this.expect(TokenType.SEMICOLON);
    
    return variable;
  }
  
  private parseStateVariable(): StateVariable {
    const dataType = this.parseDataType();
    const name = this.expect(TokenType.IDENTIFIER);
    
    const variable: StateVariable = {
      type: 'StateVariable',
      dataType,
      name: name.value,
      line: name.line,
      column: name.column
    };
    
    if (this.match(TokenType.ASSIGN)) {
      variable.initialValue = this.parseExpression();
    }
    
    this.expect(TokenType.SEMICOLON);
    
    return variable;
  }
  
  private parseConstructor(): Constructor {
    const constructor: Constructor = {
      type: 'Constructor',
      parameters: [],
      body: [],
      line: this.previous().line,
      column: this.previous().column
    };
    
    this.expect(TokenType.LPAREN);
    
    if (!this.check(TokenType.RPAREN)) {
      constructor.parameters = this.parseParameterList();
    }
    
    this.expect(TokenType.RPAREN);
    this.expect(TokenType.LBRACE);
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      constructor.body.push(this.parseStatement());
    }
    
    this.expect(TokenType.RBRACE);
    
    return constructor;
  }
  
  private parseActionDeclaration(): ActionDeclaration {
    // Accept identifier or certain keywords that can be action names
    let name: Token;
    if (this.check(TokenType.IDENTIFIER)) {
      name = this.advance();
    } else if (this.check(TokenType.TRANSFER)) {
      // Allow 'transfer' to be used as action name
      name = this.advance();
      name = { ...name, value: 'transfer' };
    } else {
      // For error message
      name = this.expect(TokenType.IDENTIFIER);
    }
    
    const action: ActionDeclaration = {
      type: 'ActionDeclaration',
      name: name.value,
      parameters: [],
      body: [],
      line: name.line,
      column: name.column
    };
    
    this.expect(TokenType.LPAREN);
    
    if (!this.check(TokenType.RPAREN)) {
      action.parameters = this.parseParameterList();
    }
    
    this.expect(TokenType.RPAREN);
    this.expect(TokenType.LBRACE);
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      action.body.push(this.parseStatement());
    }
    
    this.expect(TokenType.RBRACE);
    
    return action;
  }
  
  private parseEventDeclaration(): EventDeclaration {
    // Accept identifier or certain keywords that can be event names
    let name: Token;
    if (this.check(TokenType.IDENTIFIER)) {
      name = this.advance();
    } else if (this.check(TokenType.TRANSFER)) {
      // Allow 'transfer' to be used as event name
      name = this.advance();
      name = { ...name, value: 'Transfer' };
    } else {
      // For error message
      name = this.expect(TokenType.IDENTIFIER);
    }
    
    const event: EventDeclaration = {
      type: 'EventDeclaration',
      name: name.value,
      parameters: [],
      line: name.line,
      column: name.column
    };
    
    this.expect(TokenType.LPAREN);
    
    if (!this.check(TokenType.RPAREN)) {
      event.parameters = this.parseParameterList();
    }
    
    this.expect(TokenType.RPAREN);
    this.expect(TokenType.SEMICOLON);
    
    return event;
  }
  
  private parseConstantDeclaration(): ConstantDeclaration {
    const name = this.expect(TokenType.IDENTIFIER);
    this.expect(TokenType.ASSIGN);
    const value = this.parseExpression();
    this.expect(TokenType.SEMICOLON);
    
    return {
      type: 'ConstantDeclaration',
      name: name.value,
      value,
      line: name.line,
      column: name.column
    };
  }
  
  private parseFunctionDeclaration(): FunctionDeclaration {
    let isInline = false;
    
    // Check for optional inline modifier
    if (this.previous().type === TokenType.INLINE) {
      isInline = true;
      // We already consumed INLINE, now consume FUNCTION
      this.expect(TokenType.FUNCTION);
    } else {
      // We consumed FUNCTION already, but it wasn't inline
      isInline = false;
    }
    
    const name = this.expect(TokenType.IDENTIFIER);
    
    const func: FunctionDeclaration = {
      type: 'FunctionDeclaration',
      name: name.value,
      parameters: [],
      body: [],
      isInline,
      line: name.line,
      column: name.column
    };
    
    this.expect(TokenType.LPAREN);
    
    if (!this.check(TokenType.RPAREN)) {
      func.parameters = this.parseParameterList();
    }
    
    this.expect(TokenType.RPAREN);
    
    // Optional return type
    if (this.match(TokenType.ARROW)) {
      func.returnType = this.parseDataType();
    }
    
    this.expect(TokenType.LBRACE);
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      func.body.push(this.parseStatement());
    }
    
    this.expect(TokenType.RBRACE);
    
    return func;
  }
  
  private parseParameterList(): Parameter[] {
    const parameters: Parameter[] = [];
    
    do {
      const dataType = this.parseDataType();
      const name = this.expect(TokenType.IDENTIFIER);
      
      parameters.push({
        type: 'Parameter',
        dataType,
        name: name.value,
        line: name.line,
        column: name.column
      });
    } while (this.match(TokenType.COMMA));
    
    return parameters;
  }
  
  private parseStatement(): Statement {
    if (this.match(TokenType.REQUIRE)) {
      return this.parseRequireStatement();
    }
    
    if (this.match(TokenType.SEND)) {
      return this.parseSendStatement();
    }
    
    if (this.match(TokenType.EMIT)) {
      return this.parseEmitStatement();
    }
    
    if (this.match(TokenType.EXCEPTION)) {
      return this.parseExceptionStatement();
    }
    
    if (this.match(TokenType.IF)) {
      return this.parseIfStatement();
    }
    
    if (this.match(TokenType.RETURN)) {
      return this.parseReturnStatement();
    }
    
    // Check for type keywords that indicate a variable declaration
    if (this.check(TokenType.UINT256) || this.check(TokenType.ADDRESS) || 
        this.check(TokenType.BOOL) || this.check(TokenType.BYTES32) || 
        this.check(TokenType.STRING_TYPE)) {
      return this.parseVariableDeclaration();
    }
    
    // Try to parse assignment or expression statement
    const expr = this.parseExpression();
    
    if (this.check(TokenType.ASSIGN) || this.check(TokenType.PLUS_ASSIGN) || this.check(TokenType.MINUS_ASSIGN)) {
      const operator = this.advance().value;
      const value = this.parseExpression();
      this.expect(TokenType.SEMICOLON);
      
      const assignment: AssignmentStatement = {
        type: 'AssignmentStatement',
        target: expr,
        operator,
        value,
        line: expr.line,
        column: expr.column
      };
      
      return assignment;
    }
    
    this.expect(TokenType.SEMICOLON);
    
    // Expression statement
    const exprStmt: ExpressionStatement = {
      type: 'ExpressionStatement',
      expression: expr,
      line: expr.line,
      column: expr.column
    };
    
    return exprStmt;
  }
  
  private parseRequireStatement(): RequireStatement {
    this.expect(TokenType.LPAREN);
    const condition = this.parseExpression();
    
    const statement: RequireStatement = {
      type: 'RequireStatement',
      condition,
      line: this.previous().line,
      column: this.previous().column
    };
    
    if (this.match(TokenType.COMMA)) {
      const message = this.expect(TokenType.STRING);
      statement.message = message.value;
    }
    
    this.expect(TokenType.RPAREN);
    this.expect(TokenType.SEMICOLON);
    
    return statement;
  }
  
  private parseSendStatement(): SendStatement {
    const startToken = this.current();
    this.expect(TokenType.LPAREN);
    const recipient = this.parseExpression();
    this.expect(TokenType.COMMA);
    const amount = this.parseExpression();
    
    let memo: Expression | undefined;
    if (this.match(TokenType.COMMA)) {
      memo = this.parseExpression();
    }
    
    this.expect(TokenType.RPAREN);
    this.expect(TokenType.SEMICOLON);
    
    return {
      type: 'SendStatement',
      recipient,
      amount,
      memo,
      line: startToken.line,
      column: startToken.column
    };
  }
  
  private parseEmitStatement(): EmitStatement {
    // Accept identifier or certain keywords that can be event names
    let eventName: Token;
    if (this.check(TokenType.IDENTIFIER)) {
      eventName = this.advance();
    } else if (this.check(TokenType.TRANSFER)) {
      // Allow 'transfer' to be used as event name
      eventName = this.advance();
      eventName = { ...eventName, value: 'Transfer' };
    } else {
      // For error message
      eventName = this.expect(TokenType.IDENTIFIER);
    }
    
    const statement: EmitStatement = {
      type: 'EmitStatement',
      eventName: eventName.value,
      arguments: [],
      line: eventName.line,
      column: eventName.column
    };
    
    this.expect(TokenType.LPAREN);
    
    if (!this.check(TokenType.RPAREN)) {
      do {
        statement.arguments.push(this.parseExpression());
      } while (this.match(TokenType.COMMA));
    }
    
    this.expect(TokenType.RPAREN);
    this.expect(TokenType.SEMICOLON);
    
    return statement;
  }
  
  private parseExceptionStatement(): ExceptionStatement {
    const startToken = this.previous();
    
    // Check if there's an optional message
    let message: string | undefined;
    
    if (this.match(TokenType.LPAREN)) {
      // Allow empty parentheses or a string message
      if (!this.check(TokenType.RPAREN)) {
        const messageToken = this.expect(TokenType.STRING);
        message = messageToken.value;
      }
      this.expect(TokenType.RPAREN);
    }
    
    this.expect(TokenType.SEMICOLON);
    
    return {
      type: 'ExceptionStatement',
      message,
      line: startToken.line,
      column: startToken.column
    };
  }
  
  private parseIfStatement(): IfStatement {
    this.expect(TokenType.LPAREN);
    const condition = this.parseExpression();
    this.expect(TokenType.RPAREN);
    this.expect(TokenType.LBRACE);
    
    const thenBody: Statement[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      thenBody.push(this.parseStatement());
    }
    
    this.expect(TokenType.RBRACE);
    
    const statement: IfStatement = {
      type: 'IfStatement',
      condition,
      thenBody,
      line: this.previous().line,
      column: this.previous().column
    };
    
    if (this.match(TokenType.ELSE)) {
      this.expect(TokenType.LBRACE);
      statement.elseBody = [];
      
      while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        statement.elseBody.push(this.parseStatement());
      }
      
      this.expect(TokenType.RBRACE);
    }
    
    return statement;
  }
  
  private parseReturnStatement(): ReturnStatement {
    const startToken = this.previous();
    
    const statement: ReturnStatement = {
      type: 'ReturnStatement',
      line: startToken.line,
      column: startToken.column
    };
    
    // Check if there's a return value (not semicolon or end of file)
    if (!this.check(TokenType.SEMICOLON) && !this.isAtEnd()) {
      statement.value = this.parseExpression();
    }
    
    this.expect(TokenType.SEMICOLON);
    
    return statement;
  }
  
  private parseVariableDeclaration(): Statement {
    this.parseDataType(); // Parse and discard type info for now
    const name = this.expect(TokenType.IDENTIFIER);
    
    this.expect(TokenType.ASSIGN);
    const value = this.parseExpression();
    this.expect(TokenType.SEMICOLON);
    
    // For now, treat variable declarations as assignments
    // In a complete implementation, we'd track local variables separately
    const identifier: Identifier = {
      type: 'Identifier',
      name: name.value,
      line: name.line,
      column: name.column
    };
    
    const assignment: AssignmentStatement = {
      type: 'AssignmentStatement',
      target: identifier,
      operator: '=',
      value,
      line: name.line,
      column: name.column
    };
    
    return assignment;
  }
  
  private parseExpression(): Expression {
    return this.parseOr();
  }
  
  private parseOr(): Expression {
    let expr = this.parseAnd();
    
    while (this.match(TokenType.OR)) {
      const operator = this.previous().value;
      const right = this.parseAnd();
      const binaryExpr: BinaryExpression = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        line: expr.line,
        column: expr.column
      };
      expr = binaryExpr;
    }
    
    return expr;
  }
  
  private parseAnd(): Expression {
    let expr = this.parseComparison();
    
    while (this.match(TokenType.AND)) {
      const operator = this.previous().value;
      const right = this.parseComparison();
      const binaryExpr: BinaryExpression = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        line: expr.line,
        column: expr.column
      };
      expr = binaryExpr;
    }
    
    return expr;
  }
  
  private parseComparison(): Expression {
    let expr = this.parseAddition();
    
    while (this.match(TokenType.GREATER_THAN, TokenType.LESS_THAN, TokenType.GREATER_EQUALS, TokenType.LESS_EQUALS, TokenType.EQUALS, TokenType.NOT_EQUALS)) {
      const operator = this.previous().value;
      const right = this.parseAddition();
      const binaryExpr: BinaryExpression = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        line: expr.line,
        column: expr.column
      };
      expr = binaryExpr;
    }
    
    return expr;
  }
  
  private parseAddition(): Expression {
    let expr = this.parseMultiplication();
    
    while (this.match(TokenType.PLUS, TokenType.MINUS)) {
      const operator = this.previous().value;
      const right = this.parseMultiplication();
      const binaryExpr: BinaryExpression = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        line: expr.line,
        column: expr.column
      };
      expr = binaryExpr;
    }
    
    return expr;
  }
  
  private parseMultiplication(): Expression {
    let expr = this.parseUnary();
    
    while (this.match(TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MODULO)) {
      const operator = this.previous().value;
      const right = this.parseUnary();
      const binaryExpr: BinaryExpression = {
        type: 'BinaryExpression',
        left: expr,
        operator,
        right,
        line: expr.line,
        column: expr.column
      };
      expr = binaryExpr;
    }
    
    return expr;
  }
  
  private parseUnary(): Expression {
    if (this.match(TokenType.NOT, TokenType.MINUS)) {
      const operator = this.previous().value;
      const operand = this.parseUnary();
      const unaryExpr: UnaryExpression = {
        type: 'UnaryExpression',
        operator,
        operand,
        line: this.previous().line,
        column: this.previous().column
      };
      return unaryExpr;
    }
    
    return this.parseMember();
  }
  
  private parseMember(): Expression {
    let expr = this.parsePrimary();
    
    // Use a flag to control the loop
    let continueLoop = true;
    while (continueLoop) {
      if (this.match(TokenType.DOT)) {
        const property = this.expect(TokenType.IDENTIFIER);
        const propId: Identifier = {
          type: 'Identifier',
          name: property.value,
          line: property.line,
          column: property.column
        };
        const memberExpr: MemberExpression = {
          type: 'MemberExpression',
          object: expr,
          property: propId,
          computed: false,
          line: expr.line,
          column: expr.column
        };
        expr = memberExpr;
      } else if (this.match(TokenType.LBRACKET)) {
        const property = this.parseExpression();
        this.expect(TokenType.RBRACKET);
        const memberExpr: MemberExpression = {
          type: 'MemberExpression',
          object: expr,
          property,
          computed: true,
          line: expr.line,
          column: expr.column
        };
        expr = memberExpr;
      } else if (this.match(TokenType.LPAREN)) {
        const args: Expression[] = [];
        
        if (!this.check(TokenType.RPAREN)) {
          do {
            args.push(this.parseExpression());
          } while (this.match(TokenType.COMMA));
        }
        
        this.expect(TokenType.RPAREN);
        
        const callExpr: CallExpression = {
          type: 'CallExpression',
          callee: expr,
          arguments: args,
          line: expr.line,
          column: expr.column
        };
        expr = callExpr;
      } else {
        continueLoop = false;
      }
    }
    
    return expr;
  }
  
  private parsePrimary(): Expression {
    if (this.match(TokenType.TRUE)) {
      const literal: Literal = {
        type: 'Literal',
        value: true,
        raw: 'true',
        line: this.previous().line,
        column: this.previous().column
      };
      return literal;
    }
    
    if (this.match(TokenType.FALSE)) {
      const literal: Literal = {
        type: 'Literal',
        value: false,
        raw: 'false',
        line: this.previous().line,
        column: this.previous().column
      };
      return literal;
    }
    
    if (this.match(TokenType.NUMBER)) {
      const token = this.previous();
      const literal: Literal = {
        type: 'Literal',
        value: parseInt(token.value),
        raw: token.value,
        line: token.line,
        column: token.column
      };
      return literal;
    }
    
    if (this.match(TokenType.HEX)) {
      const token = this.previous();
      const literal: Literal = {
        type: 'Literal',
        value: token.value,
        raw: token.value,
        line: token.line,
        column: token.column
      };
      return literal;
    }
    
    if (this.match(TokenType.STRING)) {
      const token = this.previous();
      const literal: Literal = {
        type: 'Literal',
        value: token.value,
        raw: `"${token.value}"`,
        line: token.line,
        column: token.column
      };
      return literal;
    }
    
    if (this.match(TokenType.IDENTIFIER)) {
      const token = this.previous();
      const identifier: Identifier = {
        type: 'Identifier',
        name: token.value,
        line: token.line,
        column: token.column
      };
      return identifier;
    }
    
    // Allow 'state' to be used as an identifier in expressions
    if (this.match(TokenType.STATE)) {
      const token = this.previous();
      const identifier: Identifier = {
        type: 'Identifier',
        name: 'state',
        line: token.line,
        column: token.column
      };
      return identifier;
    }
    
    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseExpression();
      this.expect(TokenType.RPAREN);
      return expr;
    }
    
    throw new Error(`Unexpected token ${this.current().value} at line ${this.current().line}`);
  }
  
  private parseDataType(): string {
    if (this.match(TokenType.UINT256, TokenType.ADDRESS, TokenType.BOOL, TokenType.BYTES32, TokenType.STRING_TYPE)) {
      return this.previous().value;
    }
    
    if (this.match(TokenType.MAPPING)) {
      this.expect(TokenType.LPAREN);
      const keyType = this.parseDataType();
      this.expect(TokenType.ARROW);
      const valueType = this.parseDataType();
      this.expect(TokenType.RPAREN);
      return `mapping(${keyType} => ${valueType})`;
    }
    
    throw new Error(`Expected data type at line ${this.current().line}`);
  }
  
  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }
  
  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.current().type === type;
  }
  
  private advance(): Token {
    if (!this.isAtEnd()) this.position++;
    return this.previous();
  }
  
  private isAtEnd(): boolean {
    return this.current().type === TokenType.EOF;
  }
  
  private current(): Token {
    return this.tokens[this.position];
  }
  
  private previous(): Token {
    return this.tokens[this.position - 1];
  }
  
  private expect(...types: TokenType[]): Token {
    for (const type of types) {
      if (this.check(type)) {
        return this.advance();
      }
    }
    
    throw new Error(`Expected one of ${types.join(', ')}, got ${this.current().type} at line ${this.current().line}`);
  }
  
  private parseDecorators(): Decorator[] {
    const decorators: Decorator[] = [];
    
    while (this.check(TokenType.AT)) {
      decorators.push(this.parseDecorator());
    }
    
    return decorators;
  }
  
  private parseDecorator(): Decorator {
    this.expect(TokenType.AT);
    
    // Accept identifier or certain keywords that can be decorator names
    let name: string;
    if (this.check(TokenType.IDENTIFIER)) {
      name = this.advance().value;
    } else if (this.check(TokenType.SINGLETON)) {
      name = 'singleton';
      this.advance();
    } else if (this.check(TokenType.STATE)) {
      name = 'state';
      this.advance();
    } else {
      // For error message
      const nameToken = this.expect(TokenType.IDENTIFIER);
      name = nameToken.value;
    }
    
    const decorator: Decorator = {
      type: 'Decorator',
      name,
      arguments: [],
      line: this.previous().line,
      column: this.previous().column
    };
    
    // Optional arguments
    if (this.match(TokenType.LPAREN)) {
      if (!this.check(TokenType.RPAREN)) {
        do {
          decorator.arguments.push(this.parseExpression());
        } while (this.match(TokenType.COMMA));
      }
      this.expect(TokenType.RPAREN);
    }
    
    return decorator;
  }
  
  private parseStateBlock(): StateBlock {
    this.expect(TokenType.LBRACE);
    const fields: StateField[] = [];
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const dataType = this.parseDataType();
      const name = this.expect(TokenType.IDENTIFIER);
      
      const field: StateField = {
        type: 'StateField',
        dataType,
        name: name.value,
        isMapping: dataType.startsWith('mapping'),
        line: name.line,
        column: name.column
      };
      
      fields.push(field);
      this.expect(TokenType.SEMICOLON);
    }
    
    this.expect(TokenType.RBRACE);
    
    return {
      type: 'StateBlock',
      fields,
      line: this.previous().line,
      column: this.previous().column
    };
  }
}

/**
 * Code generator - converts AST to PuzzleBuilder
 */
class CodeGenerator {
  private coin: CoinDeclaration;
  private storageValues: Map<string, unknown> = new Map(); // Track storage variable values
  // private _localVariables: Map<string, PuzzleExpression | string | number> = new Map(); // Track local variables - for future use
  private functionDefinitions: Map<string, FunctionDeclaration> = new Map(); // Track function definitions
  private _functionNodes: TreeNode[] = []; // Store compiled function nodes
  private _constantNodes: TreeNode[] = []; // Store compiled constant nodes
  
  constructor(coin: CoinDeclaration) {
    this.coin = coin;
  }
  
  generate(): CoinScriptCompilationResult {
    // Build the main puzzle
    let innerPuzzle = new PuzzleBuilder();
    
    // Initialize result
    const result: CoinScriptCompilationResult = {
      mainPuzzle: innerPuzzle,
      metadata: {
        coinName: this.coin.name,
        hasSingleton: false,
        hasStatefulActions: false,
        hasInnerPuzzleActions: false
      }
    };
    
    // Track if we need to generate additional puzzles
    let launcherId: string | undefined;
    const additionalPuzzles: Record<string, PuzzleBuilder> = {};
    const allPuzzles: PuzzleBuilder[] = [];
    
    // Check if we have any stateful actions
    const hasStatefulActions = this.coin.actions.some(action => 
      action.decorators?.some(d => d.name === 'stateful')
    );
    result.metadata!.hasStatefulActions = hasStatefulActions;
    
    // Check if we have any inner puzzle actions
    const hasInnerPuzzleActions = this.coin.actions.some(action => 
      action.decorators?.some(d => d.name === 'inner_puzzle')
    );
    result.metadata!.hasInnerPuzzleActions = hasInnerPuzzleActions;
    
    // Check if we have a state block
    const hasStateBlock = !!this.coin.stateBlock;
    
    // Process storage variables (immutable, curried into puzzle)
    if (this.coin.storage) {
      for (const variable of this.coin.storage) {
        const value = variable.initialValue 
          ? this.evaluateLiteral(variable.initialValue)
          : this.getDefaultValue(variable.dataType);
        
        // Store the value for later reference in expression generation
        this.storageValues.set(variable.name, value);
      }
    }
    
    // Process constants
    if (this.coin.constants) {
      for (const constant of this.coin.constants) {
        const value = this.evaluateLiteral(constant.value);
        this.storageValues.set(constant.name, value);
        
        // Generate defconstant node
        this._constantNodes.push(this.generateConstantNode(constant.name, value));
      }
    }
    
    // Process functions
    if (this.coin.functions) {
      for (const func of this.coin.functions) {
        this.generateFunction(innerPuzzle, func);
      }
    }
    
    // Now generate the actual function nodes and add them to the puzzle tree
    if (this.functionDefinitions.size > 0) {
      // Store function nodes for later use in puzzle generation
      this._functionNodes = Array.from(this.functionDefinitions.values()).map(f => 
        this.generateFunctionNode(f)
      );
    }
    
    // Process state variables (mutable, stored in coin memo)
    if (this.coin.state) {
      for (const variable of this.coin.state) {
        const value = variable.initialValue 
          ? this.evaluateLiteral(variable.initialValue)
          : this.getDefaultValue(variable.dataType);
        
        // For now, treat state variables like regular variables
        // The actual state management would need to be handled explicitly
        // through layers or custom logic
        this.storageValues.set(variable.name, value);
      }
    }
    
    // If we have stateful actions or a state block, we need to generate action merkle tree
    if (hasStatefulActions || hasStateBlock) {
      // Calculate merkle root of all actions
      const actionMerkleRoot = this.calculateActionMerkleRoot();
      
      // For now, use a placeholder TreeNode for initial state
      // In a complete implementation, this would encode the state properly
      const initialStateTree = list([int(0)]); // Placeholder state
      
      // Apply slot machine layer
      innerPuzzle = withSlotMachineLayer(innerPuzzle, {
        actionMerkleRoot,
        initialState: initialStateTree
      });
    }
    
    // Apply explicit layers first
    for (const layer of this.coin.layers) {
      innerPuzzle = this.applyLayer(innerPuzzle, layer);
    }
    
    // Check for decorator-based layers
    let hasSingletonDecorator = false;
    if (this.coin.decorators) {
      for (const decorator of this.coin.decorators) {
        if (decorator.name === 'singleton') {
          hasSingletonDecorator = true;
          // Generate launcher ID
          launcherId = decorator.arguments.length > 0
            ? String(this.evaluateExpression(decorator.arguments[0]))
            : this.generateLauncherId();
          
          result.metadata!.hasSingleton = true;
          result.metadata!.launcherId = launcherId;
          
          // Generate launcher puzzle for singleton
          const launcherPuzzle = createSingletonLauncher(
            '0x' + '0'.repeat(64), // placeholder puzzle hash
            1 // placeholder amount
          );
          
          result.launcherPuzzle = launcherPuzzle;
          
          // We'll apply the singleton layer AFTER building the inner puzzle
          // so we can output both separately
        }
      }
    }
    
    // Handle actions (spend functions)
    if (this.coin.actions.length > 0) {
      // Check if we have a default action
      const defaultAction = this.coin.actions.find(a => a.name === 'default');
              const otherActions = this.coin.actions.filter(a => 
          a.name !== 'default' && 
          !a.decorators?.some(d => d.name === 'inner_puzzle')
        );
      
      if (this.coin.actions.length === 1 && defaultAction && !hasInnerPuzzleActions) {
        // Only a default action and no inner puzzles - generate it directly without ACTION parameter
        const action = defaultAction;
        
        // Add solution parameters from the default action
        const params = action.parameters.map(p => p.name);
        if (params.length > 0) {
          innerPuzzle = innerPuzzle.withSolutionParams(...params);
        }
        
        // Generate the default action logic
        for (const stmt of action.body) {
          CodeGenerator.generateStatementStatic(innerPuzzle, stmt, this.storageValues);
        }
        
        // Check if the body has an explicit conditions return
        const hasExplicitConditions = action.body.some(stmt => 
          stmt.type === 'ExpressionStatement' && 
          (stmt as ExpressionStatement).expression.type === 'Identifier' &&
          ((stmt as ExpressionStatement).expression as Identifier).name === 'conditions'
        );
        
        // If we have an explicit conditions statement, it's already handled
        // Otherwise, add returnConditions
        if (!hasExplicitConditions && action.body.length === 0) {
          innerPuzzle.returnConditions();
        }
      } else if (otherActions.length > 0) {
        // Multiple actions or non-default actions - need ACTION parameter routing
        
        // Add ACTION parameter from constructor or implicitly
        const hasConstructor = this.coin.constructor && this.coin.constructor.parameters.some(p => p.name === 'ACTION');
        if (!hasConstructor) {
          // Add implicit ACTION parameter
          innerPuzzle = innerPuzzle.withSolutionParams('ACTION');
        } else {
          // Add all constructor parameters as solution parameters
          const constructorParams = this.coin.constructor!.parameters.map(p => p.name);
          innerPuzzle = innerPuzzle.withSolutionParams(...constructorParams);
        }
        
        // If we have inner puzzle actions, add parameters for them
        if (hasInnerPuzzleActions) {
          const innerPuzzleActions = this.coin.actions.filter(a => 
            a.decorators?.some(d => d.name === 'inner_puzzle')
          );
          const innerPuzzleParams = innerPuzzleActions.map(a => `${a.name}_puzzle`);
          innerPuzzle = innerPuzzle.withSolutionParams(...innerPuzzleParams);
        }
        
        // Build action routing logic
        innerPuzzle.comment('Action routing');
        
        // Build nested if-else chain for action routing
                  // Add condition codes library if needed for main puzzle
          let needsConditionCodes = false;
          
          // Check all non-inner_puzzle actions in the main routing logic
          for (const action of otherActions) {
            for (const stmt of action.body) {
              if (stmt.type === 'SendStatement' || stmt.type === 'EmitStatement') {
                needsConditionCodes = true;
                break;
              }
            }
            if (needsConditionCodes) break;
          }
          
          // Also check the default action if it exists
          if (defaultAction) {
            for (const stmt of defaultAction.body) {
              if (stmt.type === 'SendStatement' || stmt.type === 'EmitStatement') {
                needsConditionCodes = true;
                break;
              }
            }
          }
          
          if (needsConditionCodes) {
            innerPuzzle.includeConditionCodes();
          }
          
          const buildActionChain = (actions: ActionDeclaration[], index: number, builder: PuzzleBuilder): void => {
            if (index >= actions.length) {
              // Handle the case when all actions have been exhausted
              if (defaultAction) {
                builder.comment('Default action');
                for (const stmt of defaultAction.body) {
                  CodeGenerator.generateStatementStatic(builder, stmt, this.storageValues);
                }
                const hasReturn = defaultAction.body.some(stmt => 
                  stmt.type === 'ExpressionStatement' && 
                  (stmt as ExpressionStatement).expression.type === 'Identifier' &&
                  ((stmt as ExpressionStatement).expression as Identifier).name === 'conditions'
                );
                if (!hasReturn && defaultAction.body.length === 0) {
                  builder.returnConditions();
                }
              } else {
                // No default action - fail for unknown action
                builder.fail("Unknown action");
              }
              return;
            }
            
            const action = actions[index];
            
            builder.if(variable('ACTION').equals(variable(action.name)))
              .then(b => {
                b.comment(`Action: ${action.name}`);
                
                // Check if this is an inner puzzle action
                const isInnerPuzzle = action.decorators?.some(d => d.name === 'inner_puzzle') || false;
                
                if (isInnerPuzzle) {
                  // Route to inner puzzle
                  b.comment(`Apply inner puzzle: ${action.name}`);
                  
                  // Get the action parameters
                  const actionParams = action.parameters.map(p => p.name);
                  if (actionParams.length > 0) {
                    b.withSolutionParams(...actionParams);
                  }
                  
                  // Apply the inner puzzle with the action parameters
                  const puzzleParam = variable(`${action.name}_puzzle`);
                  
                  // Build the argument list for the inner puzzle
                  if (actionParams.length > 0) {
                    // Create a list of the parameters
                    const paramList = actionParams.reduce((acc, param, index) => {
                      if (index === 0) {
                        return variable(param);
                      }
                      // Build nested cons cells for multiple params
                      return expr(list([int(4), variable(param).tree, acc.tree]));
                    }, variable(actionParams[0]));
                    
                    // Apply the puzzle with parameters: (a puzzle_param param_list)
                    const applyExpr = expr(list([sym('a'), puzzleParam.tree, paramList.tree]));
                    b.returnValue(applyExpr);
                  } else {
                    // Apply with empty list: (a puzzle_param ())
                    const applyExpr = expr(list([sym('a'), puzzleParam.tree, NIL]));
                    b.returnValue(applyExpr);
                  }
                  
                  return; // Skip regular action processing
                }
                
                // Check if this is a stateful action
                const isStateful = action.decorators?.some(d => d.name === 'stateful') || false;
                
                // If stateful, add state as solution parameter
                if (isStateful) {
                  b.comment('Stateful action - receiving current state');
                  b.withSolutionParams('current_state');
                }
              
              // Handle decorators for access control
              if (action.decorators && action.decorators.length > 0) {
                for (const decorator of action.decorators) {
                  if (decorator.name === 'onlyAddress' && decorator.arguments.length > 0) {
                    // Generate address validation
                    b.comment('Access control: only allowed addresses');
                    
                    // Create OR condition for multiple addresses
                    let addressCheck: PuzzleExpression | null = null;
                    for (const arg of decorator.arguments) {
                      const address = CodeGenerator.generateExpressionStatic(arg, this.storageValues);
                      const addressExpr = CodeGenerator.toPuzzleExpressionStatic(address);
                      const checkExpr = variable('sender').equals(addressExpr);
                      
                      if (addressCheck === null) {
                        addressCheck = checkExpr;
                      } else {
                        addressCheck = addressCheck.or(checkExpr);
                      }
                    }
                    
                    if (addressCheck) {
                      b.require(addressCheck, "Unauthorized: sender not in allowed addresses");
                    }
                  }
                }
              }
              
              // Add action-specific parameters
              const actionParams = action.parameters.map(p => p.name);
              if (actionParams.length > 0) {
                b.withSolutionParams(...actionParams);
              }
              
              // Generate action body
              for (const stmt of action.body) {
                CodeGenerator.generateStatementStatic(b, stmt, this.storageValues, undefined, undefined, this.functionDefinitions);
              }
              
              // If stateful, create the next coin with updated state
              if (isStateful) {
                b.comment('State persistence: recreate self with updated state');
                
                // In a complete implementation, we would:
                // 1. Calculate the current puzzle hash
                // 2. Create a coin with the same puzzle hash
                // 3. The new coin would receive updated state in its next solution
                
                // Add a special marker that the runtime can use
                b.comment('STATEFUL_RECREATE_SELF');
                
                // The actual condition would be:
                // (51 SELF_PUZZLE_HASH AMOUNT)
                // But we need runtime support to calculate SELF_PUZZLE_HASH
              }
              
              // Check for explicit return
              const hasReturn = action.body.some(stmt => 
                stmt.type === 'ExpressionStatement' && 
                (stmt as ExpressionStatement).expression.type === 'Identifier'
              );
              
              if (!hasReturn && action.body.length === 0) {
                b.returnConditions();
              }
            })
            .else(b => {
              // Recursively build the rest of the chain
              buildActionChain(actions, index + 1, b);
            });
        };
        
        // Start building the action chain
        if (otherActions.length > 0) {
          buildActionChain(otherActions, 0, innerPuzzle);
        }
        
        // If there are no other actions but we have a default action
        if (otherActions.length === 0 && defaultAction && !hasInnerPuzzleActions) {
          // No inner puzzle actions - generate default action directly
          for (const stmt of defaultAction.body) {
            CodeGenerator.generateStatementStatic(innerPuzzle, stmt, this.storageValues);
          }
          
          // Check for explicit return
          const hasReturn = defaultAction.body.some(stmt => 
            stmt.type === 'ExpressionStatement' && 
            (stmt as ExpressionStatement).expression.type === 'Identifier' &&
            ((stmt as ExpressionStatement).expression as Identifier).name === 'conditions'
          );
          
          if (!hasReturn && defaultAction.body.length === 0) {
            innerPuzzle.returnConditions();
          }
        }
        
        // Handle mixed actions - need to also handle @inner_puzzle actions in the main routing
        const innerPuzzleActions = this.coin.actions.filter(a => 
          a.decorators?.some(d => d.name === 'inner_puzzle')
        );
        
        // If we have inner puzzle actions, we need routing logic (with or without default)
        if (hasInnerPuzzleActions && otherActions.length === 0) {
          innerPuzzle.comment('Routing to inner puzzles');
          
          // Parameters are already added above in the hasInnerPuzzleActions check
          
          const buildInnerPuzzleChain = (actions: ActionDeclaration[], index: number, builder: PuzzleBuilder): void => {
            if (index >= actions.length) {
              // No matching action found - use default if available
              if (defaultAction) {
                builder.comment('Default action');
                for (const stmt of defaultAction.body) {
                  CodeGenerator.generateStatementStatic(builder, stmt, this.storageValues);
                }
                const hasReturn = defaultAction.body.some(stmt => 
                  stmt.type === 'ExpressionStatement' && 
                  (stmt as ExpressionStatement).expression.type === 'Identifier' &&
                  ((stmt as ExpressionStatement).expression as Identifier).name === 'conditions'
                );
                if (!hasReturn && defaultAction.body.length === 0) {
                  builder.returnConditions();
                }
              } else {
                builder.fail("Unknown action");
              }
              return;
            }
            
            const action = actions[index];
            
            builder.if(variable('ACTION').equals(variable(action.name)))
              .then(b => {
                b.comment(`Apply inner puzzle: ${action.name}`);
                
                // Get the action parameters
                const actionParams = action.parameters.map(p => p.name);
                if (actionParams.length > 0) {
                  b.withSolutionParams(...actionParams);
                }
                
                // Apply the inner puzzle with the action parameters
                // Using 'a' (apply) to run the curried inner puzzle
                const puzzleParam = variable(`${action.name}_puzzle`);
                
                // Build the argument list for the inner puzzle
                if (actionParams.length > 0) {
                  // Create a list of the parameters
                  const paramList = actionParams.reduce((acc, param, index) => {
                    if (index === 0) {
                      return variable(param);
                    }
                    // Build nested cons cells for multiple params
                    return expr(list([int(4), variable(param).tree, acc.tree]));
                  }, variable(actionParams[0]));
                  
                  // Apply the puzzle with parameters: (a puzzle_param param_list)
                  const applyExpr = expr(list([sym('a'), puzzleParam.tree, paramList.tree]));
                  b.returnValue(applyExpr);
                } else {
                  // Apply with empty list: (a puzzle_param ())
                  const applyExpr = expr(list([sym('a'), puzzleParam.tree, NIL]));
                  b.returnValue(applyExpr);
                }
              })
              .else(b => {
                // Recursively build the rest of the chain
                buildInnerPuzzleChain(actions, index + 1, b);
              });
          };
          
          buildInnerPuzzleChain(innerPuzzleActions, 0, innerPuzzle);
        }
      } else {
        // Old behavior for single non-default spend action (backwards compatibility)
        const spendActions = this.coin.actions.filter(a => a.name.toLowerCase().includes('spend'));
        
        if (spendActions.length === 1 && this.coin.actions.length === 1) {
          // Single spend function - generate it directly
          const action = spendActions[0];
          
          // Add solution parameters from the spend function
          const params = action.parameters.map(p => p.name);
          if (params.length > 0) {
            innerPuzzle = innerPuzzle.withSolutionParams(...params);
          }
          
          // Generate the spend logic
          for (const stmt of action.body) {
            CodeGenerator.generateStatementStatic(innerPuzzle, stmt, this.storageValues);
          }
          
          // Check if the body has an explicit conditions return
          const hasExplicitConditions = action.body.some(stmt => 
            stmt.type === 'ExpressionStatement' && 
            (stmt as ExpressionStatement).expression.type === 'Identifier' &&
            ((stmt as ExpressionStatement).expression as Identifier).name === 'conditions'
          );
          
          // If we have an explicit conditions statement, it's already handled
          // Otherwise, add returnConditions
          if (!hasExplicitConditions && action.body.length === 0) {
            innerPuzzle.returnConditions();
          }
        }
      }
    }
    
    // Add state layer if we have state variables and not already present
    // NOTE: Commented out - layers should be explicitly added, not automatic
    // if (Object.keys(initialState).length > 0) {
    //   const hasStateLayer = this.coin.layers.some(l => l.layerType === 'state');
    //   if (!hasStateLayer) {
    //     innerPuzzle = withStateLayer(innerPuzzle, { initialState });
    //   }
    // }
    
    // Add notification layer if we have events and not already present
    // NOTE: Commented out - layers should be explicitly added, not automatic
    // if (this.coin.events.length > 0) {
    //   const hasNotificationLayer = this.coin.layers.some(l => l.layerType === 'notification');
    //   if (!hasNotificationLayer) {
    //     innerPuzzle = withNotificationLayer(innerPuzzle, {
    //       notificationId: this.coin.name
    //     });
    //   }
    // }
    
    // Don't automatically wrap in singleton - let the user decide
    // This allows creation of standard coins, CATs, NFTs, etc.
    
    // Handle @singleton decorator if present
    if (hasSingletonDecorator && launcherId) {
      // Store the inner puzzle (unwrapped CoinScript logic)
      result.innerPuzzle = innerPuzzle;
      
      // Apply singleton layer to create the wrapped puzzle
      const singletonPuzzle = withSingletonLayer(innerPuzzle, launcherId);
      result.mainPuzzle = singletonPuzzle;
      
      // Also add the singleton template to show the structure
      result.additionalPuzzles = result.additionalPuzzles || {};
      result.additionalPuzzles['singleton_template'] = createSingletonTemplate();
      
      // The launcher puzzle was already created above
    } else {
      // No singleton decorator - main puzzle is the inner puzzle
      result.mainPuzzle = innerPuzzle;
    }
    
    // Add stateful action puzzles if any
    if (hasStatefulActions) {
      for (const action of this.coin.actions) {
        if (action.decorators?.some(d => d.name === 'stateful')) {
          const actionPuzzle = this.generateActionPuzzle(action);
          additionalPuzzles[`action_${action.name}`] = actionPuzzle;
        }
      }
      if (Object.keys(additionalPuzzles).length > 0) {
        result.additionalPuzzles = additionalPuzzles;
      }
    }
    
    // Add inner puzzle action puzzles if any
    if (hasInnerPuzzleActions) {
      for (const action of this.coin.actions) {
        if (action.decorators?.some(d => d.name === 'inner_puzzle')) {
          const actionPuzzle = this.generateActionPuzzle(action);
          additionalPuzzles[`action_${action.name}`] = actionPuzzle;
          allPuzzles.push(actionPuzzle);
        }
      }
      if (Object.keys(additionalPuzzles).length > 0) {
        result.additionalPuzzles = additionalPuzzles;
      }
    }
    
    // Add main puzzle to allPuzzles (after inner puzzles)
    allPuzzles.push(result.mainPuzzle);
    
    // Add all puzzles in order if we have any
    if (allPuzzles.length > 0) {
      result.allPuzzles = allPuzzles;
    }
    
    // Apply decorator-based singleton layer last if requested
    if (hasSingletonDecorator) {
      // Build inner puzzle with functions included
      const innerPuzzleTree = this.buildPuzzleWithDefinitions(innerPuzzle);
      const innerPuzzleWithFunctions = new PuzzleBuilder()
        .withMod(innerPuzzleTree);
      
      const singletonWrappedPuzzle = withSingletonLayer(innerPuzzleWithFunctions, launcherId!);
      result.mainPuzzle = singletonWrappedPuzzle;
      result.innerPuzzle = innerPuzzleWithFunctions;
      
      // Add both inner and singleton-wrapped puzzles to allPuzzles
      allPuzzles.push(innerPuzzleWithFunctions);
    } else {
      // Build the final puzzle with functions included
      const finalPuzzleTree = this.buildPuzzleWithDefinitions(innerPuzzle);
      
      // Create a new PuzzleBuilder from the tree
      const finalPuzzle = new PuzzleBuilder()
        .withMod(finalPuzzleTree);
      
      result.mainPuzzle = finalPuzzle;
    }
    
    return result;
  }
  
  private applyLayer(puzzle: PuzzleBuilder, layer: LayerDeclaration): PuzzleBuilder {
    switch (layer.layerType) {
      case 'singleton': {
        const launcherId = this.evaluateExpression(layer.params.launcherId) || this.generateLauncherId();
        return withSingletonLayer(puzzle, String(launcherId));
      }
      
      case 'state': {
        const initialState = this.evaluateExpression(layer.params.initialState) || {};
        return withStateLayer(puzzle, { 
          initialState: initialState as Record<string, unknown> 
        });
      }
      
      case 'ownership': {
        const owner = this.evaluateExpression(layer.params.owner) || '0x' + '0'.repeat(64);
        const transferProgram = this.evaluateExpression(layer.params.transferProgram);
        const p = new PuzzleBuilder();
        const transferPuzzle = transferProgram ? p.payToConditions().build() : undefined;
        return withOwnershipLayer(puzzle, {
          owner: String(owner),
          transferProgram: transferPuzzle
        });
      }
      
      case 'royalty': {
        const address = this.evaluateExpression(layer.params.address) || '0x' + '0'.repeat(64);
        const percentage = this.evaluateExpression(layer.params.percentage) || 0;
        return withRoyaltyLayer(puzzle, {
          royaltyAddress: String(address),
          royaltyPercentage: Number(percentage)
        });
      }
      
      case 'metadata': {
        const metadata = this.evaluateExpression(layer.params.metadata) || {};
        return withMetadataLayer(puzzle, {
          metadata: metadata as Record<string, unknown>
        });
      }
      
      case 'notification': {
        const notificationId = this.evaluateExpression(layer.params.notificationId) || this.coin.name;
        return withNotificationLayer(puzzle, {
          notificationId: String(notificationId)
        });
      }
      
      case 'transfer': {
        const p = new PuzzleBuilder();
        const transferPuzzle = p.payToConditions().build();
        return withTransferProgramLayer(puzzle, transferPuzzle);
      }
      
      case 'actionlayer': {
        // Action layer parameters: merkleRoot, state, finalizer
        const merkleRoot = this.evaluateExpression(layer.params.merkleRoot) || '0x' + '0'.repeat(64);
        const state = this.evaluateExpression(layer.params.state) || {};
        const finalizerType = this.evaluateExpression(layer.params.finalizerType) || 'default';
        const hint = this.evaluateExpression(layer.params.hint) || this.coin.name;
        
        // Create appropriate finalizer based on type
        const finalizer = finalizerType === 'reserve' 
          ? {
              type: 'reserve' as const,
              reserveFullPuzzleHash: String(this.evaluateExpression(layer.params.reserveFullPuzzleHash) || '0x' + '0'.repeat(64)),
              reserveInnerPuzzleHash: String(this.evaluateExpression(layer.params.reserveInnerPuzzleHash) || '0x' + '0'.repeat(64)),
              reserveAmountProgram: new PuzzleBuilder().returnConditions().build(),
              hint: String(hint)
            }
          : {
              type: 'default' as const,
              hint: String(hint)
            };
        
        return withActionLayer({
          merkleRoot: String(merkleRoot),
          state: state as Record<string, unknown>,
          finalizer
        });
      }
      
      default:
        throw new Error(`Unknown layer type: ${layer.layerType}`);
    }
  }
  
  private static generateStatementStatic(builder: PuzzleBuilder, stmt: Statement, storageValues?: Map<string, unknown>, _paramMap?: Map<string, number>, localVariables?: Map<string, PuzzleExpression | string | number>, functionDefinitions?: Map<string, FunctionDeclaration>): void {
    switch (stmt.type) {
      case 'RequireStatement': {
        const req = stmt as RequireStatement;
        const condition = CodeGenerator.generateExpressionStatic(req.condition, storageValues, _paramMap, localVariables, functionDefinitions);
        const condExpr = CodeGenerator.toPuzzleExpressionStatic(condition);
        builder.require(condExpr, req.message);
        break;
      }
      
      case 'SendStatement': {
        const send = stmt as SendStatement;
        const recipient = CodeGenerator.generateExpressionStatic(send.recipient, storageValues, _paramMap, localVariables, functionDefinitions);
        const amount = CodeGenerator.generateExpressionStatic(send.amount, storageValues, _paramMap, localVariables, functionDefinitions);
        const memo = send.memo ? CodeGenerator.generateExpressionStatic(send.memo, storageValues, _paramMap, localVariables, functionDefinitions) : undefined;
        
        // Create coin with proper types and optional memo
        if (typeof recipient === 'string') {
          const amountExpr = typeof amount === 'number' ? amount : CodeGenerator.toPuzzleExpressionStatic(amount);
          if (memo && typeof memo === 'string') {
            builder.createCoin(recipient, amountExpr, memo);
          } else {
            builder.createCoin(recipient, amountExpr);
          }
        } else {
          const recipientStr = CodeGenerator.expressionToStringStatic(send.recipient);
          const amountStr = CodeGenerator.expressionToStringStatic(send.amount);
          const memoStr = send.memo ? CodeGenerator.expressionToStringStatic(send.memo) : '';
          builder.comment(`Send ${amountStr} to ${recipientStr}${memoStr ? ` with memo: ${memoStr}` : ''}`);
        }
        break;
      }
      
      case 'EmitStatement': {
        const emit = stmt as EmitStatement;
        // Create announcement with event name and optional data
        if (emit.arguments.length > 0) {
          // If arguments provided, create a structured announcement
          // For now, just use the first argument as the announcement data
          const arg = CodeGenerator.generateExpressionStatic(emit.arguments[0], storageValues);
          if (typeof arg === 'string') {
            builder.createAnnouncement(arg);
          } else if (typeof arg === 'number') {
            builder.createAnnouncement(arg.toString());
          } else {
            builder.createAnnouncement(emit.eventName);
          }
        } else {
          // No arguments, just emit the event name
          builder.createAnnouncement(emit.eventName);
        }
        break;
      }
      
      case 'ExceptionStatement': {
        const exceptionStmt = stmt as ExceptionStatement;
        // Generate (x) to cause an exception
        if (exceptionStmt.message) {
          builder.comment(`Exception: ${exceptionStmt.message}`);
        }
        builder.fail(exceptionStmt.message);
        break;
      }
      
      case 'IfStatement': {
        const ifStmt = stmt as IfStatement;
        const condition = CodeGenerator.generateExpressionStatic(ifStmt.condition, storageValues);
        const condExpr = CodeGenerator.toPuzzleExpressionStatic(condition);
        
        builder.if(condExpr)
          .then(b => {
            for (const s of ifStmt.thenBody) {
              CodeGenerator.generateStatementStatic(b, s, storageValues);
            }
          })
          .else(b => {
            if (ifStmt.elseBody) {
              for (const s of ifStmt.elseBody) {
                CodeGenerator.generateStatementStatic(b, s, storageValues);
              }
            } else {
              // Empty else block to complete control flow
              b.returnValue('()');
            }
          });
        break;
      }
      
      case 'AssignmentStatement': {
        const assignment = stmt as AssignmentStatement;
        
        // Special handling for returnConditions as a standalone statement
        if (assignment.target.type === 'Identifier' && (assignment.target as Identifier).name === 'returnConditions') {
          builder.returnConditions();
          break;
        }
        
        // For now, store the value in localVariables if available
        if (assignment.target.type === 'Identifier' && localVariables) {
          const targetName = (assignment.target as Identifier).name;
          const value = CodeGenerator.generateExpressionStatic(assignment.value, storageValues, _paramMap, localVariables);
          localVariables.set(targetName, value);
        }
        
        // Assignments don't generate conditions directly
        // They're handled by state management layers
        break;
      }
      
      case 'ExpressionStatement': {
        // Handle expression statements
        const exprStmt = stmt as ExpressionStatement;
        const expr = exprStmt.expression;
        
        // Check if this is a standalone identifier that should be treated as a return
        if (expr.type === 'Identifier') {
          const id = expr as Identifier;
          // If it's a parameter name (like 'conditions'), return it
          builder.returnValue(id.name);
          return;
        }
        
        // For other expressions, evaluate them but don't add to output
        CodeGenerator.generateExpressionStatic(expr, storageValues);
        break;
      }
      
      case 'ReturnStatement': {
        const returnStmt = stmt as ReturnStatement;
        if (returnStmt.value) {
          const value = CodeGenerator.generateExpressionStatic(returnStmt.value, storageValues);
          const valueExpr = CodeGenerator.toPuzzleExpressionStatic(value);
          builder.returnValue(valueExpr);
        } else {
          // Return nil/empty if no value specified
          builder.returnValue(expr(NIL));
        }
        break;
      }
    }
  }
  
  private static generateExpressionStatic(expr: Expression, storageValues?: Map<string, unknown>, paramMap?: Map<string, number>, localVariables?: Map<string, PuzzleExpression | string | number>, functionDefinitions?: Map<string, FunctionDeclaration>): PuzzleExpression | string | number {
    switch (expr.type) {
      case 'Identifier': {
        const id = expr as Identifier;
        
        // Check local variables first
        if (localVariables && localVariables.has(id.name)) {
          return localVariables.get(id.name)!;
        }
        
        // Check if this identifier is a parameter with a known position
        if (paramMap && paramMap.has(id.name)) {
          const paramIndex = paramMap.get(id.name)!;
          return variable(paramIndex.toString());
        }
        
        // Special identifiers
        if (id.name === 'msg') {
          return variable('msg');
        }
        if (id.name === 'this') {
          return variable('self');
        }
        if (id.name === 'block') {
          return variable('block');
        }
        if (id.name === 'state') {
          // State is passed as a parameter in stateful actions
          return variable('current_state');
        }
        
        // Check if this is a storage constant that should be substituted
        if (storageValues && storageValues.has(id.name)) {
          const value = storageValues.get(id.name);
          if (typeof value === 'string' || typeof value === 'number') {
            return value;
          }
        }
        
        // For all other identifiers, use variable()
        return variable(id.name);
      }
      
      case 'Literal': {
        const lit = expr as Literal;
        if (typeof lit.value === 'string' && lit.value.startsWith('0x')) {
          return lit.value;
        }
        if (typeof lit.value === 'number') {
          return lit.value;
        }
        if (typeof lit.value === 'boolean') {
          return variable(lit.value ? '1' : '0');
        }
        return String(lit.value);
      }
      
      case 'BinaryExpression': {
        const bin = expr as BinaryExpression;
        const left = CodeGenerator.generateExpressionStatic(bin.left, storageValues);
        const right = CodeGenerator.generateExpressionStatic(bin.right, storageValues);
        
        // Convert to PuzzleExpression if needed
        const leftExpr = CodeGenerator.toPuzzleExpressionStatic(left);
        const rightExpr = CodeGenerator.toPuzzleExpressionStatic(right);
        
        switch (bin.operator) {
          case '+': return leftExpr.add(rightExpr);
          case '-': return leftExpr.subtract(rightExpr);
          case '*': return leftExpr.multiply(rightExpr);
          case '/': return leftExpr.divide(rightExpr);
          case '%': return leftExpr.divide(rightExpr); // ChiaLisp doesn't have modulo
          case '>': return leftExpr.greaterThan(rightExpr);
          case '<': return rightExpr.greaterThan(leftExpr);
          case '>=': return leftExpr.greaterThan(rightExpr).or(leftExpr.equals(rightExpr));
          case '<=': return rightExpr.greaterThan(leftExpr).not();
          case '==': return leftExpr.equals(rightExpr);
          case '!=': return leftExpr.equals(rightExpr).not();
          case '&&': return leftExpr.and(rightExpr);
          case '||': return leftExpr.or(rightExpr);
          default: return leftExpr;
        }
      }
      
      case 'UnaryExpression': {
        const unary = expr as UnaryExpression;
        const operand = CodeGenerator.generateExpressionStatic(unary.operand, storageValues);
        const operandExpr = CodeGenerator.toPuzzleExpressionStatic(operand);
        
        switch (unary.operator) {
          case '!': return operandExpr.not();
          case '-': return variable('0').subtract(operandExpr);
          default: return operandExpr;
        }
      }
      
      case 'MemberExpression': {
        const member = expr as MemberExpression;
        const objId = member.object as Identifier;
        
        // Handle special cases like msg.sender, msg.value
        if (objId.type === 'Identifier' && objId.name === 'msg') {
          const propId = member.property as Identifier;
          if (propId.type === 'Identifier') {
            if (propId.name === 'value') {
              return variable('@'); // Amount
            } else if (propId.name === 'sender') {
              return variable('sender');
            }
          }
        }
        
        // Handle state.field access in stateful actions
        if (objId.type === 'Identifier' && objId.name === 'state') {
          const propId = member.property as Identifier;
          if (propId.type === 'Identifier') {
            // Access state field from current_state parameter
            // This would need proper tree traversal in real implementation
            return variable(`state_${propId.name}`);
          }
        }
        
        return CodeGenerator.generateExpressionStatic(member.object, storageValues);
      }
      
      case 'CallExpression': {
        // Handle function calls
        const call = expr as CallExpression;
        const callee = call.callee as Identifier;
        
        if (callee.type === 'Identifier') {
          // Built-in functions
          switch (callee.name) {
            case 'sha256':
              if (call.arguments.length > 0) {
                const arg = CodeGenerator.generateExpressionStatic(call.arguments[0], storageValues);
                return CodeGenerator.toPuzzleExpressionStatic(arg).sha256();
              }
              break;
            case 'pubkey':
              if (call.arguments.length > 0) {
                const arg = CodeGenerator.generateExpressionStatic(call.arguments[0], storageValues);
                return CodeGenerator.toPuzzleExpressionStatic(arg);
              }
              break;
            default:
              // User-defined function calls
              // Look up the function in the current context
              if (functionDefinitions && functionDefinitions.has(callee.name)) {
                // Build a function call expression
                const argExprs = call.arguments.map(arg => 
                  CodeGenerator.generateExpressionStatic(arg, storageValues, paramMap, localVariables, functionDefinitions)
                );
                
                // Generate the function call: (function_name arg1 arg2 ...)
                const argTrees = argExprs.map(e => {
                  if (typeof e === 'object' && 'tree' in e) {
                    return e.tree;
                  } else if (typeof e === 'number') {
                    return int(e);
                  } else if (typeof e === 'string') {
                    return e.startsWith('0x') ? sym(e) : sym(e);
                  }
                  return sym('()');
                });
                
                // Create the function call node as a PuzzleExpression
                return new PuzzleExpression(list([sym(callee.name), ...argTrees]));
              }
              
              // Fallback for unknown functions
              return variable(`${callee.name}_result`);
          }
        }
        
        return variable('0');
      }
      
      default:
        return variable('0');
    }
  }

  
  private static toPuzzleExpressionStatic(value: PuzzleExpression | string | number): PuzzleExpression {
    if (typeof value === 'object' && 'tree' in value) {
      return value;
    }
    if (typeof value === 'string') {
      return variable(value);
    }
    if (typeof value === 'number') {
      return variable(value.toString());
    }
    return variable('0');
  }

  private static expressionToStringStatic(expr: Expression): string {
    switch (expr.type) {
      case 'Identifier':
        return (expr as Identifier).name;
      case 'Literal':
        return String((expr as Literal).value);
      case 'BinaryExpression': {
        const bin = expr as BinaryExpression;
        return `${CodeGenerator.expressionToStringStatic(bin.left)} ${bin.operator} ${CodeGenerator.expressionToStringStatic(bin.right)}`;
      }
      case 'UnaryExpression': {
        const unary = expr as UnaryExpression;
        return `${unary.operator}${CodeGenerator.expressionToStringStatic(unary.operand)}`;
      }
      case 'MemberExpression': {
        const mem = expr as MemberExpression;
        const obj = CodeGenerator.expressionToStringStatic(mem.object);
        const prop = CodeGenerator.expressionToStringStatic(mem.property);
        return mem.computed ? `${obj}[${prop}]` : `${obj}.${prop}`;
      }
      case 'CallExpression': {
        const call = expr as CallExpression;
        const callee = CodeGenerator.expressionToStringStatic(call.callee);
        const args = call.arguments.map(a => CodeGenerator.expressionToStringStatic(a)).join(', ');
        return `${callee}(${args})`;
      }
      default:
        return '<expression>';
    }
  }
  
  private evaluateLiteral(expr: Expression): unknown {
    if (expr.type === 'Literal') {
      const lit = expr as Literal;
      
      // Check if this is an address literal (string starting with xch1 or txch1)
      if (typeof lit.value === 'string' && 
          (lit.value.startsWith('xch1') || lit.value.startsWith('txch1'))) {
        // Convert address to hex
        return addressToHex(lit.value);
      }
      
      return lit.value;
    } else if (expr.type === 'UnaryExpression') {
      const unary = expr as UnaryExpression;
      // Handle negative numbers
      if (unary.operator === '-' && unary.operand.type === 'Literal') {
        const operandValue = (unary.operand as Literal).value;
        if (typeof operandValue === 'number') {
          return -operandValue;
        }
      }
    }
    return null;
  }
  
  private evaluateExpression(expr: Expression | undefined): unknown {
    if (!expr) return null;
    
    switch (expr.type) {
      case 'Literal':
        return (expr as Literal).value;
      case 'Identifier':
        // Would lookup in context
        return (expr as Identifier).name;
      default:
        return null;
    }
  }
  
  private getDefaultValue(dataType: string): unknown {
    switch (dataType) {
      case 'uint256':
        return 0;
      case 'address':
        // Default address is all zeros
        return '0x' + '0'.repeat(64);
      case 'bytes32':
        return '0x' + '0'.repeat(64);
      case 'bool':
        return false;
      case 'string':
        return '';
      default:
        if (dataType.startsWith('mapping')) {
          return {};
        }
        return null;
    }
  }
  
  private generateLauncherId(): string {
    const hash = createHash('sha256');
    hash.update(this.coin.name);
    hash.update(Date.now().toString());
    return '0x' + hash.digest('hex');
  }
  
  private generateFunction(builder: PuzzleBuilder, func: FunctionDeclaration): void {
    // Store function for later use when generating defun statements
    if (!this.functionDefinitions) {
      this.functionDefinitions = new Map();
    }
    this.functionDefinitions.set(func.name, func);
    
    // The actual defun generation will happen when we build the puzzle
    // For now, just add a comment placeholder
    builder.comment(`Function: ${func.name}${func.isInline ? ' (inline)' : ''}`);
  }
  
  private generateFunctionNode(func: FunctionDeclaration): TreeNode {
    // Generate defun or defun-inline based on function type
    const defunType = func.isInline ? 'defun-inline' : 'defun';
    
    // Build parameter list
    const params = func.parameters.map(p => sym(p.name));
    const paramList = params.length > 0 
      ? list(params)
      : NIL;
    
    // Create a temporary builder for the function body
    const bodyBuilder = new PuzzleBuilder().noMod();
    
    // Track local variables for the function scope
    const functionLocalVars = new Map<string, PuzzleExpression | string | number>();
    
    // Generate function body
    let hasReturn = false;
    for (const stmt of func.body) {
      if (stmt.type === 'ReturnStatement') {
        hasReturn = true;
        const returnStmt = stmt as ReturnStatement;
        if (returnStmt.value) {
          const value = CodeGenerator.generateExpressionStatic(
            returnStmt.value, 
            this.storageValues, 
            undefined,
            functionLocalVars
          );
          bodyBuilder.returnValue(value);
        } else {
          bodyBuilder.returnValue('()');
        }
        break; // Stop after return
      } else {
        CodeGenerator.generateStatementStatic(
          bodyBuilder, 
          stmt, 
          this.storageValues,
          undefined,
          functionLocalVars
        );
      }
    }
    
    // If no explicit return, return nil
    if (!hasReturn) {
      bodyBuilder.returnValue('()');
    }
    
    // Build the defun statement
    const functionBody = bodyBuilder.build();
    return list([
      sym(defunType),
      sym(func.name),
      paramList,
      functionBody
    ]);
  }
  
  private generateConstantNode(name: string, value: unknown): TreeNode {
    // Generate defconstant statement
    // (defconstant NAME value)
    
    let valueNode: TreeNode;
    if (typeof value === 'number') {
      valueNode = int(value);
    } else if (typeof value === 'string') {
      if (value.startsWith('0x')) {
        // For hex values, use the value directly without quotes
        valueNode = int(parseInt(value.substring(2), 16));
      } else {
        // For other strings, use as symbol
        valueNode = sym(value);
      }
    } else {
      // Default to nil
      valueNode = NIL;
    }
    
    return list([
      sym('defconstant'),
      sym(name),
      valueNode
    ]);
  }
  
  private calculateActionMerkleRoot(): string {
    // Generate each action as a separate puzzle
    const actionHashes: string[] = [];
    
    for (const action of this.coin.actions) {
      // Skip non-stateful actions
      if (!action.decorators?.some(d => d.name === 'stateful')) {
        continue;
      }
      
      // Generate individual action puzzle
      const actionPuzzle = this.generateActionPuzzle(action);
      
      // Calculate puzzle hash
      const puzzleTree = actionPuzzle.build();
      const hash = sha256tree(puzzleTree);
      const hashHex = '0x' + Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
      
      actionHashes.push(hashHex);
    }
    
    // Build merkle tree from action hashes
    if (actionHashes.length === 0) {
      return '0x' + '00'.repeat(32);
    }
    
    // Simple merkle tree (for now, just hash all together)
    // In production, build proper binary merkle tree
    const combined = actionHashes.join('');
    const rootHash = createHash('sha256').update(combined).digest('hex');
    return '0x' + rootHash;
  }
  
  private generateActionPuzzle(action: ActionDeclaration): PuzzleBuilder {
    const actionPuzzle = new PuzzleBuilder();
    
    // For @inner_puzzle actions, create a simple mod that validates conditions
    if (action.decorators?.some(d => d.name === 'inner_puzzle')) {
      // Check if we need condition codes library
      let needsConditionCodes = false;
      for (const stmt of action.body) {
        if (stmt.type === 'SendStatement' || stmt.type === 'EmitStatement') {
          needsConditionCodes = true;
          break;
        }
      }
      
      if (needsConditionCodes) {
        actionPuzzle.includeConditionCodes();
      }
      
      // Use parameter names for the mod definition
      const paramNames = action.parameters.map(p => p.name);
      if (paramNames.length > 0) {
        actionPuzzle.withSolutionParams(...paramNames);
      }
      
      // Simple validation logic for inner puzzles
      for (const stmt of action.body) {
        if (stmt.type === 'RequireStatement') {
          const req = stmt as RequireStatement;
          // For now, generate simple condition checks
          if (req.condition.type === 'BinaryExpression') {
            const bin = req.condition as BinaryExpression;
            if (bin.left.type === 'Identifier' && bin.right.type === 'Literal' && bin.operator === '>') {
              // Handle simple "amount > 0" checks
              const leftId = bin.left as Identifier;
              const rightLit = bin.right as Literal;
              // Use parameter name directly
              actionPuzzle.if(variable(leftId.name).greaterThan(rightLit.value as number))
                .then((b: PuzzleBuilder) => { b.returnValue('()'); })  // Do nothing if true
                .else(b => b.fail("Requirement failed"));
            }
          }
                  } else if (stmt.type === 'SendStatement') {
            const send = stmt as SendStatement;
            // Generate CREATE_COIN condition using parameter names
            if (send.recipient.type === 'Identifier' && send.amount.type === 'Identifier') {
              const recipientName = (send.recipient as Identifier).name;
              const amountName = (send.amount as Identifier).name;
              // Pass recipient as hex address (will be variable name that gets resolved)
              actionPuzzle.createCoin(
                recipientName,
                variable(amountName)
              );
            }
          } else if (stmt.type === 'EmitStatement') {
            // Generate announcement for emit statement
            actionPuzzle.createAnnouncement('0x' + '00'.repeat(16));
          }
      }
      
      // Return empty conditions list if no explicit return
      if (action.body.length === 0 || 
          !action.body.some(s => s.type === 'ExpressionStatement')) {
        actionPuzzle.returnValue('()');
            }
      
      return actionPuzzle;
    }
    
    // Original implementation for stateful actions
    // Action receives current state and parameters
    const allParams = ['current_state', ...action.parameters.map(p => p.name)];
    actionPuzzle.withSolutionParams(...allParams);
    
    actionPuzzle.comment(`Action: ${action.name}`);
    
    // Generate action body
    for (const stmt of action.body) {
      CodeGenerator.generateStatementStatic(actionPuzzle, stmt, this.storageValues);
    }
    
    // Check if this is a stateful action
    const isStateful = action.decorators?.some(d => d.name === 'stateful') || false;
    
    if (isStateful) {
    // Return new state and conditions
    actionPuzzle.comment('Return (new_state . conditions)');
    actionPuzzle.returnValue('(new_state . conditions)');
    } else {
      // For non-stateful actions, just return conditions
      if (action.body.length === 0) {
        actionPuzzle.returnConditions();
      }
    }
    
    return actionPuzzle;
  }

  private buildPuzzleWithDefinitions(builder: PuzzleBuilder): TreeNode {
    // Get the base puzzle tree
    const basePuzzle = builder.build();
    
    // If no functions or constants, return the base puzzle
    if (this._functionNodes.length === 0 && this._constantNodes.length === 0) {
      return basePuzzle;
    }
    
    // We need to inject definitions into the mod structure
    // The structure is: (mod params includes constants functions body)
    
    // Check if basePuzzle is a List type
    if (basePuzzle.type === 'list') {
      const listPuzzle = basePuzzle as List;
      
      // Check if first item is MOD
      if (listPuzzle.items.length > 0 && 
          listPuzzle.items[0].type === 'atom' &&
          (listPuzzle.items[0] as Atom).value === 'mod') {
        
        // Find where includes end and body begins
        let includeEndIndex = 2;
        for (let i = 2; i < listPuzzle.items.length; i++) {
          const item = listPuzzle.items[i];
          if (!(item.type === 'list' && 
                (item as List).items.length >= 2 &&
                (item as List).items[0].type === 'atom' &&
                ((item as List).items[0] as Atom).value === 'include')) {
            includeEndIndex = i;
            break;
          }
        }
        
        // Rebuild with constants and functions inserted
        const newItems = [
          ...listPuzzle.items.slice(0, includeEndIndex), // mod, params, includes
          ...this._constantNodes, // constant definitions (defconstant)
          ...this._functionNodes, // function definitions (defun/defun-inline)
          ...listPuzzle.items.slice(includeEndIndex) // body
        ];
        
        return list(newItems);
      }
    }
    
    // If not a mod structure, just return the base
    return basePuzzle;
  }
}

/**
 * Main CoinScript compiler function
 */
export function compileCoinScript(source: string): CoinScriptCompilationResult {
  // Tokenize
  const tokenizer = new Tokenizer(source);
  const tokens = tokenizer.tokenize();
  
  // Parse
  const parser = new Parser(tokens);
  const ast = parser.parse();
  
  // Generate
  const generator = new CodeGenerator(ast);
  return generator.generate();
}

/**
 * Parse CoinScript from file
 */
export function parseCoinScriptFile(filename: string): CoinScriptCompilationResult {
  const source = fs.readFileSync(filename, 'utf8');
  return compileCoinScript(source);
}

/**
 * Backward compatibility functions that return just the main puzzle
 */
export function compileCoinScriptToPuzzle(source: string): PuzzleBuilder {
  return compileCoinScript(source).mainPuzzle;
}

export function parseCoinScriptFileToPuzzle(filename: string): PuzzleBuilder {
  return parseCoinScriptFile(filename).mainPuzzle;
}

/**
 * Convert a bech32 Chia address to a 32-byte hex string
 * @param address The bech32 address (e.g., xch1...)
 * @returns The 32-byte hex string with 0x prefix
 */
function addressToHex(address: string): string {
  try {
    // Use the library to convert address to puzzle hash
    const puzzleHash = addressToPuzzleHash(address);
    // The library returns a Buffer, convert to hex string with 0x prefix
    return '0x' + puzzleHash.toString('hex');
  } catch (error) {
    throw new Error(`Invalid Chia address: ${address}. ${error instanceof Error ? error.message : String(error)}`);
  }
} 

export interface CoinScriptCompilationOptions {
  /** Output format */
  format?: 'chialisp' | 'clvm' | 'hex' | 'modhash';
  /** Whether to compile to CLVM */
  compiled?: boolean;
  /** Whether to curry all inner puzzles into a single puzzle */
  single_puzzle?: boolean;
  /** Whether to indent the output (for chialisp format) */
  indent?: boolean;
}

/**
 * Compile CoinScript with options for different output formats
 */
export function compileCoinScriptWithOptions(source: string, options?: CoinScriptCompilationOptions): string | string[] {
  const result = compileCoinScript(source);
  
  // Default format is chialisp
  const format = options?.format || 'chialisp';
  
  if (options?.single_puzzle && result.allPuzzles && result.allPuzzles.length > 1) {
    // Single puzzle mode - curry all inner puzzles into the main puzzle
    const mainPuzzle = result.allPuzzles[result.allPuzzles.length - 1];
    const innerPuzzles = result.allPuzzles.slice(0, -1);
    
    return mainPuzzle.serialize({
      format,
      compiled: options?.compiled,
      indent: options?.indent,
      single_puzzle: true,
      innerPuzzles
    });
  }
  
  // For single coin without inner puzzles, return just the main puzzle serialized
  if (!result.allPuzzles || result.allPuzzles.length <= 1) {
    return result.mainPuzzle.serialize({
      format,
      compiled: options?.compiled,
      indent: options?.indent
    });
  }
  
  // Multiple puzzle mode - return array of serialized puzzles
  return result.allPuzzles.map(puzzle => {
    try {
      return puzzle.serialize({
        format,
        compiled: options?.compiled,
        indent: options?.indent
      });
    } catch (error) {
      // If compilation fails for a puzzle, return error message
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  });
} 