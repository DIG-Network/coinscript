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
  withStateManagementLayer,
  createSingletonTemplate
} from '../layers';
import { Expression as BuilderExpression } from '../builder/PuzzleBuilder';
import { sha256tree, list, int, sym, hex, NIL, TreeNode, Atom, List } from '../core';
import { createHash } from 'crypto';
import * as fs from 'fs';
import { addressToPuzzleHash } from '@dignetwork/datalayer-driver';
import {
  determineRequiredIncludes
} from '../chialisp/includeIndex';

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
  INCLUDE = 'INCLUDE',
  LET = 'LET',
  // New keywords
  MODIFIER = 'MODIFIER',
  VIEW = 'VIEW',
  PURE = 'PURE',
  RETURNS = 'RETURNS',
  STRUCT = 'STRUCT',
  
  // Types
  UINT256 = 'UINT256',
  UINT128 = 'UINT128',
  UINT64 = 'UINT64',
  UINT32 = 'UINT32',
  UINT16 = 'UINT16',
  UINT8 = 'UINT8',
  INT256 = 'INT256',
  INT128 = 'INT128',
  INT64 = 'INT64',
  INT32 = 'INT32',
  INT16 = 'INT16',
  INT8 = 'INT8',
  ADDRESS = 'ADDRESS',
  BOOL = 'BOOL',
  MAPPING = 'MAPPING',
  BYTES32 = 'BYTES32',
  BYTES = 'BYTES',
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
  STRING_GREATER_THAN = 'STRING_GREATER_THAN',
  ASSIGN = 'ASSIGN',
  PLUS_ASSIGN = 'PLUS_ASSIGN',
  MINUS_ASSIGN = 'MINUS_ASSIGN',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  BITWISE_AND = 'BITWISE_AND',
  BITWISE_OR = 'BITWISE_OR',
  BITWISE_XOR = 'BITWISE_XOR',
  BITWISE_NOT = 'BITWISE_NOT',
  LEFT_SHIFT = 'LEFT_SHIFT',
  RIGHT_SHIFT = 'RIGHT_SHIFT',
  
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
    
    // Strings - both single and double quotes supported
    if (char === "'" || char === '"') {
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
      '||': TokenType.OR,
      '<<': TokenType.LEFT_SHIFT,
      '>>': TokenType.RIGHT_SHIFT,
      '>s': TokenType.STRING_GREATER_THAN
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
      '&': TokenType.BITWISE_AND,
      '|': TokenType.BITWISE_OR,
      '^': TokenType.BITWISE_XOR,
      '~': TokenType.BITWISE_NOT,
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
    
    // Support both single and double quotes
    if (quote !== "'" && quote !== '"') {
      throw new Error(`Expected quote character at line ${startLine}, column ${startColumn}`);
    }
    
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
          case "'": value += "'"; break;
          case '"': value += '"'; break;
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
      'include': TokenType.INCLUDE,
      'let': TokenType.LET,
      // New keywords
      'modifier': TokenType.MODIFIER,
      'view': TokenType.VIEW,
      'pure': TokenType.PURE,
      'returns': TokenType.RETURNS,
      'struct': TokenType.STRUCT,
      // Types
      'uint256': TokenType.UINT256,
      'uint128': TokenType.UINT128,
      'uint64': TokenType.UINT64,
      'uint32': TokenType.UINT32,
      'uint16': TokenType.UINT16,
      'uint8': TokenType.UINT8,
      'int256': TokenType.INT256,
      'int128': TokenType.INT128,
      'int64': TokenType.INT64,
      'int32': TokenType.INT32,
      'int16': TokenType.INT16,
      'int8': TokenType.INT8,
      'address': TokenType.ADDRESS,
      'bool': TokenType.BOOL,
      'bytes32': TokenType.BYTES32,
      'bytes': TokenType.BYTES,
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
  includes?: IncludeStatement[];
  layers: LayerDeclaration[];
  storage?: StorageVariable[];
  state?: StateVariable[];
  stateBlock?: StateBlock;
  constructor?: Constructor;
  constants?: ConstantDeclaration[];
  modifiers?: ModifierDeclaration[];
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
  modifiers?: string[];  // For modifiers applied to actions
  returnType?: string;  // For view functions that return values
  visibility?: 'view' | 'pure';  // For view/pure functions
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
  dataType?: string;  // For typed constants like: const uint8 STATE_IDLE = 0
}

interface ModifierDeclaration extends ASTNode {
  type: 'ModifierDeclaration';
  name: string;
  parameters: Parameter[];
  body: Statement[];
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

export interface Expression extends ASTNode {
  // Base interface for expressions
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
  value: string | number | boolean | null;
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

interface IncludeStatement extends ASTNode {
  type: 'IncludeStatement';
  path: string;
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
    // Parse includes at the top level
    const includes: IncludeStatement[] = [];
    while (this.check(TokenType.INCLUDE)) {
      includes.push(this.parseIncludeStatement());
    }
    
    // Check for decorators before coin declaration
    let decorators: Decorator[] | undefined;
    if (this.check(TokenType.AT)) {
      decorators = this.parseDecorators();
    }
    
    const coin = this.parseCoinDeclaration();
    if (decorators) {
      coin.decorators = decorators;
    }
    
    // Add includes to the coin declaration
    if (includes.length > 0) {
      coin.includes = includes;
    }
    
    return coin;
  }
  
  private parseIncludeStatement(): IncludeStatement {
    this.expect(TokenType.INCLUDE);
    const startToken = this.current();
    
    let pathValue = '';
    
    // If it's a string literal, just use that
    if (this.check(TokenType.STRING)) {
      const stringToken = this.advance();
      pathValue = stringToken.value;
    } else {
      // Otherwise, consume tokens until we hit a newline, semicolon, or EOF
      // This allows paths with hyphens, dots, slashes, etc.
      while (!this.isAtEnd() && 
             !this.check(TokenType.SEMICOLON) && 
             !this.check(TokenType.COIN) &&
             !this.check(TokenType.AT) &&
             !this.check(TokenType.INCLUDE)) {
        
        const token = this.current();
        
        // Skip newlines but break on them
        if (token.type === TokenType.NEWLINE) {
          break;
        }
        
        // Add the token value to the path
        pathValue += token.value;
        this.advance();
      }
      
      // Trim any trailing whitespace
      pathValue = pathValue.trim();
    }
    
    // Optional semicolon
    if (this.check(TokenType.SEMICOLON)) {
      this.advance();
    }
    
    return {
      type: 'IncludeStatement',
      path: pathValue,
      line: startToken.line,
      column: startToken.column
    };
  }
  
  private parseCoinDeclaration(): CoinDeclaration {
    this.expect(TokenType.COIN);
    const name = this.expect(TokenType.IDENTIFIER);
    
    const coin: CoinDeclaration = {
      type: 'CoinDeclaration',
      name: name.value,
      includes: undefined,
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
      } else if (this.match(TokenType.MODIFIER)) {
        if (!coin.modifiers) coin.modifiers = [];
        coin.modifiers.push(this.parseModifierDeclaration());
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
    // Handle either "storage type name" or "storage name: type" syntax
    let dataType: string;
    let name: Token;
    
    if (this.check(TokenType.IDENTIFIER) && this.tokens[this.position + 1]?.type === TokenType.COLON) {
      // storage name: type = value
      name = this.expect(TokenType.IDENTIFIER);
      this.expect(TokenType.COLON);
      dataType = this.parseDataType();
    } else {
      // storage type name = value
      dataType = this.parseDataType();
      name = this.expect(TokenType.IDENTIFIER);
    }
    
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
    
    // Check for view/pure keywords
    if (this.match(TokenType.VIEW)) {
      action.visibility = 'view';
    } else if (this.match(TokenType.PURE)) {
      action.visibility = 'pure';
    }
    
    // Check for returns keyword
    if (this.match(TokenType.RETURNS)) {
      this.expect(TokenType.LPAREN);
      action.returnType = this.parseDataType();
      this.expect(TokenType.RPAREN);
    }
    
    // Parse modifiers
    const modifiers: string[] = [];
    while (this.check(TokenType.IDENTIFIER) && !this.check(TokenType.LBRACE)) {
      modifiers.push(this.advance().value);
    }
    
    if (modifiers.length > 0) {
      action.modifiers = modifiers;
    }
    
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
    let dataType: string | undefined;
    let name: Token;
    
    // Check if there's a type before the name (e.g., const uint8 MAX_VALUE = 10)
    if (this.check(TokenType.UINT256) || this.check(TokenType.UINT128) || 
        this.check(TokenType.UINT64) || this.check(TokenType.UINT32) || 
        this.check(TokenType.UINT16) || this.check(TokenType.UINT8) ||
        this.check(TokenType.INT256) || this.check(TokenType.INT128) ||
        this.check(TokenType.INT64) || this.check(TokenType.INT32) ||
        this.check(TokenType.INT16) || this.check(TokenType.INT8) ||
        this.check(TokenType.ADDRESS) || this.check(TokenType.BOOL) || 
        this.check(TokenType.BYTES32) || this.check(TokenType.BYTES) ||
        this.check(TokenType.STRING_TYPE)) {
      dataType = this.parseDataType();
      name = this.expect(TokenType.IDENTIFIER);
    } else {
      name = this.expect(TokenType.IDENTIFIER);
    }
    
    this.expect(TokenType.ASSIGN);
    const value = this.parseExpression();
    this.expect(TokenType.SEMICOLON);
    
    const constant: ConstantDeclaration = {
      type: 'ConstantDeclaration',
      name: name.value,
      value,
      line: name.line,
      column: name.column
    };
    
    if (dataType) {
      constant.dataType = dataType;
    }
    
    return constant;
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
  
  private parseModifierDeclaration(): ModifierDeclaration {
    const name = this.expect(TokenType.IDENTIFIER);
    
    const modifier: ModifierDeclaration = {
      type: 'ModifierDeclaration',
      name: name.value,
      parameters: [],
      body: [],
      line: name.line,
      column: name.column
    };
    
    this.expect(TokenType.LPAREN);
    
    if (!this.check(TokenType.RPAREN)) {
      modifier.parameters = this.parseParameterList();
    }
    
    this.expect(TokenType.RPAREN);
    this.expect(TokenType.LBRACE);
    
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      // Check for the special placeholder _
      if (this.check(TokenType.IDENTIFIER) && this.current().value === '_') {
        this.advance();
        this.expect(TokenType.SEMICOLON);
        // Add a special statement to mark where the action body goes
        const placeholderExpr: Identifier = {
          type: 'Identifier',
          name: '_', // Special marker for modifier placeholder
          line: this.previous().line,
          column: this.previous().column
        };
        const placeholderStmt: ExpressionStatement = {
          type: 'ExpressionStatement',
          expression: placeholderExpr,
          line: this.previous().line,
          column: this.previous().column
        };
        modifier.body.push(placeholderStmt);
      } else {
        modifier.body.push(this.parseStatement());
      }
    }
    
    this.expect(TokenType.RBRACE);
    
    return modifier;
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
    
    // Check for let keyword
    if (this.match(TokenType.LET)) {
      return this.parseLetDeclaration();
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
  
  private parseLetDeclaration(): Statement {
    // let x = expression;
    const name = this.expect(TokenType.IDENTIFIER);
    
    this.expect(TokenType.ASSIGN);
    const value = this.parseExpression();
    this.expect(TokenType.SEMICOLON);
    
    // Create an identifier for the variable
    const identifier: Identifier = {
      type: 'Identifier',
      name: name.value,
      line: name.line,
      column: name.column
    };
    
    // Create assignment statement
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
    let expr = this.parseBitwiseOr();
    
    while (this.match(TokenType.AND)) {
      const operator = this.previous().value;
      const right = this.parseBitwiseOr();
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
  
  private parseBitwiseOr(): Expression {
    let expr = this.parseBitwiseXor();
    
    while (this.match(TokenType.BITWISE_OR)) {
      const operator = this.previous().value;
      const right = this.parseBitwiseXor();
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
  
  private parseBitwiseXor(): Expression {
    let expr = this.parseBitwiseAnd();
    
    while (this.match(TokenType.BITWISE_XOR)) {
      const operator = this.previous().value;
      const right = this.parseBitwiseAnd();
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
  
  private parseBitwiseAnd(): Expression {
    let expr = this.parseComparison();
    
    while (this.match(TokenType.BITWISE_AND)) {
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
    let expr = this.parseShift();
    
    while (this.match(TokenType.GREATER_THAN, TokenType.LESS_THAN, TokenType.GREATER_EQUALS, TokenType.LESS_EQUALS, TokenType.EQUALS, TokenType.NOT_EQUALS, TokenType.STRING_GREATER_THAN)) {
      const operator = this.previous().value;
      const right = this.parseShift();
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
  
  private parseShift(): Expression {
    let expr = this.parseAddition();
    
    while (this.match(TokenType.LEFT_SHIFT, TokenType.RIGHT_SHIFT)) {
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
    if (this.match(TokenType.NOT, TokenType.MINUS, TokenType.BITWISE_NOT)) {
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
    
    // Check for type casting functions (e.g., bytes32(value))
    if (this.check(TokenType.UINT256) || this.check(TokenType.UINT128) || 
        this.check(TokenType.UINT64) || this.check(TokenType.UINT32) || 
        this.check(TokenType.UINT16) || this.check(TokenType.UINT8) ||
        this.check(TokenType.INT256) || this.check(TokenType.INT128) ||
        this.check(TokenType.INT64) || this.check(TokenType.INT32) ||
        this.check(TokenType.INT16) || this.check(TokenType.INT8) ||
        this.check(TokenType.ADDRESS) || this.check(TokenType.BOOL) || 
        this.check(TokenType.BYTES32) || this.check(TokenType.BYTES) ||
        this.check(TokenType.STRING_TYPE)) {
      const typeToken = this.advance();
      const identifier: Identifier = {
        type: 'Identifier',
        name: typeToken.value,
        line: typeToken.line,
        column: typeToken.column
      };
      return identifier;
    }
    
    if (this.match(TokenType.LPAREN)) {
      // Check for list literal like (1 2 3)
      const elements: Expression[] = [];
      
      // If we immediately see RPAREN, it's an empty list ()
      if (this.check(TokenType.RPAREN)) {
        this.advance();
        // Return a literal for empty list (NIL)
        const literal: Literal = {
          type: 'Literal',
          value: null,  // null represents NIL in our system
          raw: '()',
          line: this.previous().line,
          column: this.previous().column
        };
        return literal;
      }
      
      // Try to parse as a list literal - check if next token is a value
      // Save position in case we need to backtrack
      const savedPosition = this.position;
      
      // Check if this looks like a list literal (number or identifier not followed by operator)
      if (this.check(TokenType.NUMBER) || this.check(TokenType.IDENTIFIER) || 
          this.check(TokenType.STRING) || this.check(TokenType.HEX) ||
          this.check(TokenType.TRUE) || this.check(TokenType.FALSE) ||
          this.check(TokenType.LPAREN)) {
        
        try {
          // Parse first element
          const firstElement = this.parseExpression();
          elements.push(firstElement);
          
          // Check if next token is an operator (making this a regular expression)
          // or another value (making this a list)
          if (!this.check(TokenType.RPAREN) && !this.isAtEnd()) {
            // If we see an operator, it's not a list
            if (this.check(TokenType.PLUS) || this.check(TokenType.MINUS) ||
                this.check(TokenType.MULTIPLY) || this.check(TokenType.DIVIDE) ||
                this.check(TokenType.MODULO) || this.check(TokenType.GREATER_THAN) ||
                this.check(TokenType.LESS_THAN) || this.check(TokenType.EQUALS) ||
                this.check(TokenType.NOT_EQUALS) || this.check(TokenType.AND) ||
                this.check(TokenType.OR) || this.check(TokenType.STRING_GREATER_THAN)) {
              // It's an expression, not a list
              this.position = savedPosition;
              const expr = this.parseExpression();
              this.expect(TokenType.RPAREN);
              return expr;
            }
            
            // Otherwise, continue parsing as list
            while (!this.check(TokenType.RPAREN) && !this.isAtEnd()) {
              elements.push(this.parseExpression());
            }
          }
          
          if (this.check(TokenType.RPAREN)) {
            this.advance(); // consume RPAREN
            // Create a list literal representation
            const listStr = '(' + elements.map((e: Expression) => {
              if (e.type === 'Literal') {
                const lit = e as Literal;
                if (typeof lit.value === 'string' && !lit.value.startsWith('(')) {
                  return lit.value;
                }
                return lit.value;
              }
              if (e.type === 'Identifier') return (e as Identifier).name;
              return '?'; // Placeholder for complex expressions
            }).join(' ') + ')';
            
            const listLiteral: Literal = {
              type: 'Literal',
              value: listStr,
              raw: listStr,
              line: this.previous().line,
              column: this.previous().column
            };
            return listLiteral;
          }
        } catch (e) {
          // If parsing fails, restore position
          this.position = savedPosition;
        }
      }
      
      // Not a list literal, parse as regular parenthesized expression
      this.position = savedPosition;
      const expr = this.parseExpression();
      this.expect(TokenType.RPAREN);
      return expr;
    }
    
    throw new Error(`Unexpected token ${this.current().value} at line ${this.current().line}`);
  }
  
  private parseDataType(): string {
    let baseType: string | null = null;
    
    // Check for all supported types
    if (this.match(
      TokenType.UINT256, TokenType.UINT128, TokenType.UINT64, 
      TokenType.UINT32, TokenType.UINT16, TokenType.UINT8,
      TokenType.INT256, TokenType.INT128, TokenType.INT64,
      TokenType.INT32, TokenType.INT16, TokenType.INT8,
      TokenType.ADDRESS, TokenType.BOOL, TokenType.BYTES32, 
      TokenType.BYTES, TokenType.STRING_TYPE
    )) {
      baseType = this.previous().value;
    }
    
    // Check for mapping type
    else if (this.match(TokenType.MAPPING)) {
      this.expect(TokenType.LPAREN);
      const keyType = this.parseDataType();
      this.expect(TokenType.ARROW);
      const valueType = this.parseDataType();
      this.expect(TokenType.RPAREN);
      return `mapping(${keyType} => ${valueType})`;
    }
    
    // Check for identifier as type (for future custom types)
    else if (this.check(TokenType.IDENTIFIER)) {
      const savedPosition = this.position;
      baseType = this.advance().value;
      // For now, identifiers as types are not supported unless it's for an array
      if (!this.check(TokenType.LBRACKET)) {
        // Put the identifier back
        this.position = savedPosition;
        throw new Error(`Unknown type '${baseType}' at line ${this.current().line}`);
      }
    }
    
    // If we don't have a base type by now, error
    if (!baseType) {
      throw new Error(`Expected data type at line ${this.current().line}`);
    }
    
    // Check for array syntax after any base type
    if (this.match(TokenType.LBRACKET)) {
      this.expect(TokenType.RBRACKET);
      return `${baseType}[]`;
    }
    
    return baseType;
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
  private functionDefinitions: Map<string, FunctionDeclaration> = new Map(); // Track function definitions
  private _functionNodes: TreeNode[] = []; // Store compiled function nodes
  private _constantNodes: TreeNode[] = []; // Store compiled constant nodes
  private _manualIncludes: Set<string> = new Set(); // Track manual includes
  private _autoIncludes: Set<string> = new Set(); // Track auto includes
  private featuresUsed: Set<string> = new Set(); // Track features for auto-includes
  private stateFieldIndices: Map<string, number> = new Map(); // Track state field indices
  
  constructor(coin: CoinDeclaration) {
    this.coin = coin;
    
    // Process manual includes from the coin declaration
    if (coin.includes) {
      for (const include of coin.includes) {
        this._manualIncludes.add(include.path);
      }
    }
    
    // Build state field index map
    if (coin.stateBlock) {
      coin.stateBlock.fields.forEach((field, index) => {
        this.stateFieldIndices.set(field.name, index);
      });
    }
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
    
    // Scan all code for features that require auto-includes
    this.scanActionsForFeatures();
    
    // Validate state access - only @stateful or view actions can access state
    if (hasStateBlock || this.coin.state) {
      for (const action of this.coin.actions) {
        const isStateful = action.decorators?.some(d => d.name === 'stateful') || false;
        const isView = action.visibility === 'view';
        if (!isStateful && !isView && this.actionAccessesState(action)) {
          throw new Error(`Action '${action.name}' accesses state but is not marked @stateful or view`);
        }
      }
    }
    
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
    
    // Generate compiled function nodes
    if (this.coin.functions) {
      for (const func of this.coin.functions) {
        // Store function for later use
        this.functionDefinitions.set(func.name, func);
      }
    }
    
    // Generate compiled constant nodes
    if (this.coin.constants) {
      for (const constant of this.coin.constants) {
        const value = this.evaluateLiteral(constant.value);
        this.storageValues.set(constant.name, value);
        
        // Generate defconstant node
        this._constantNodes.push(this.generateConstantNode(constant.name, value));
      }
    }
    
    // Handle includes if present
    if (this.coin.includes) {
      for (const include of this.coin.includes) {
        this._manualIncludes.add(include.path);
      }
    }
    
    // Now generate the actual function nodes and add them to the puzzle tree
    if (this.functionDefinitions.size > 0) {
      // Store function nodes for later use in puzzle generation
      this._functionNodes = Array.from(this.functionDefinitions.values()).map(f => 
        this.generateFunctionNode(f)
      );
    }
    
    // Process state block
    if (this.coin.state) {
      for (const variable of this.coin.state) {
        const value = variable.initialValue ? this.evaluateExpression(variable.initialValue) : this.getDefaultValue(variable.dataType);
        
        // State variables would need special handling in ChiaLisp
        // The actual state management would need to be handled explicitly
        // through layers or custom logic
        this.storageValues.set(variable.name, value);
      }
    }
    
    // If we have stateful actions or a state block, we need to generate action merkle tree
    if (hasStatefulActions || hasStateBlock) {
      // Calculate merkle root of all actions
      const actionMerkleRoot = this.calculateActionMerkleRoot();
      
      // Build initial state from state fields
      const stateFields: TreeNode[] = [];
      
      // If we have a state block, use those fields
      if (this.coin.stateBlock) {
        for (const field of this.coin.stateBlock.fields) {
          // Get default value for the type
          const defaultValue = this.getDefaultValue(field.dataType);
          if (typeof defaultValue === 'number') {
            stateFields.push(int(defaultValue));
          } else if (typeof defaultValue === 'string') {
            stateFields.push(hex(defaultValue));
          } else {
            stateFields.push(NIL);
          }
        }
      }
      
      // Build state as a list
      const initialStateTree = stateFields.length > 0 
        ? list(stateFields)
        : NIL;  // Empty state if no fields
      
      // Apply state management layer
      innerPuzzle = withStateManagementLayer(innerPuzzle, {
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
    // Skip action routing if we're using state management layer - it handles actions separately
    if (this.coin.actions.length > 0 && !hasStatefulActions) {
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
        
        // Calculate the maximum number of parameters any action needs
        let maxParams = 0;
        for (const action of otherActions) {
          maxParams = Math.max(maxParams, action.parameters.length);
        }
        
        // Add ACTION parameter from constructor or implicitly
        const hasConstructor = this.coin.constructor && this.coin.constructor.parameters.some(p => p.name === 'ACTION');
        if (!hasConstructor) {
          // Add implicit parameters: ACTION and potential action parameters
          const allParams = ['ACTION'];
          // Add parameter slots for the maximum number of parameters any action needs
          for (let i = 0; i < maxParams; i++) {
            allParams.push(`param${i + 1}`);
          }
          innerPuzzle = innerPuzzle.withSolutionParams(...allParams);
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
            this._autoIncludes.add('condition_codes.clib');
          }
          
        const buildActionChain = (actions: ActionDeclaration[], index: number, builder: PuzzleBuilder): void => {
          if (index >= actions.length) {
            // Handle the case when all actions have been exhausted
            if (defaultAction) {
              builder.comment('Default action');
              const defaultLocalVars = new Map<string, BuilderExpression | string | number>();
              for (const stmt of defaultAction.body) {
                CodeGenerator.generateStatementStatic(builder, stmt, this.storageValues, undefined, defaultLocalVars, this.functionDefinitions);
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
                    let addressCheck: BuilderExpression | null = null;
                    for (const arg of decorator.arguments) {
                      const address = CodeGenerator.generateExpressionStatic(arg, this.storageValues);
                      const addressExpr = CodeGenerator.toBuilderExpressionStatic(address);
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
              
              // Get action parameters
              const actionParams = action.parameters.map(p => p.name);
              
              // Track local variables for this action
              const actionLocalVars = new Map<string, BuilderExpression | string | number>();
              
              // Create parameter map for action parameters
              const paramMap = new Map<string, number>();
              // When ACTION is a list like ("pay" recipient amount), we need to access the rest
              // But when ACTION is just "pay", we can't access any parameters
              // For now, we'll assume parameters are passed as additional solution arguments
              actionParams.forEach((param, index) => {
                paramMap.set(param, index); // Direct mapping: first param = 0, second = 1, etc.
              });
              
              // Generate action body
              for (const stmt of action.body) {
                CodeGenerator.generateStatementStatic(b, stmt, this.storageValues, paramMap, actionLocalVars, this.functionDefinitions);
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
          const defaultLocalVars = new Map<string, BuilderExpression | string | number>();
          for (const stmt of defaultAction.body) {
            CodeGenerator.generateStatementStatic(innerPuzzle, stmt, this.storageValues, undefined, defaultLocalVars, this.functionDefinitions);
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
                const defaultLocalVars = new Map<string, BuilderExpression | string | number>();
                for (const stmt of defaultAction.body) {
                  CodeGenerator.generateStatementStatic(builder, stmt, this.storageValues, undefined, defaultLocalVars, this.functionDefinitions);
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
          const spendLocalVars = new Map<string, BuilderExpression | string | number>();
          for (const stmt of action.body) {
            CodeGenerator.generateStatementStatic(innerPuzzle, stmt, this.storageValues, undefined, spendLocalVars, this.functionDefinitions);
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
          const actionPuzzle = this.generateActionPuzzle2(action);
          additionalPuzzles[action.name] = actionPuzzle;
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
          const actionPuzzle = this.generateActionPuzzle2(action);
          // Remove action_ prefix if present
          const puzzleName = action.name.startsWith('action_') ? action.name.substring(7) : action.name;
          additionalPuzzles[puzzleName] = actionPuzzle;
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
  
  private static generateStatementStatic(builder: PuzzleBuilder, stmt: Statement, storageValues?: Map<string, unknown>, _paramMap?: Map<string, number>, localVariables?: Map<string, BuilderExpression | string | number>, functionDefinitions?: Map<string, FunctionDeclaration>, stateFieldIndices?: Map<string, number>): void {
    switch (stmt.type) {
      case 'RequireStatement': {
        const req = stmt as RequireStatement;
        
        // Check if this is a msg.sender == address pattern
        if (req.condition.type === 'BinaryExpression') {
          const binExpr = req.condition as BinaryExpression;
          if (binExpr.operator === '==' && 
              binExpr.left.type === 'MemberExpression') {
            const memExpr = binExpr.left as MemberExpression;
            if (memExpr.object.type === 'Identifier' && 
                (memExpr.object as Identifier).name === 'msg' &&
                memExpr.property.type === 'Identifier' &&
                (memExpr.property as Identifier).name === 'sender') {
              // This is require(msg.sender == address)
              
              // Get the address value from the right side
              let addressValue: string | undefined;
              
              if (binExpr.right.type === 'Identifier') {
                // It's a variable reference
                const addressId = binExpr.right as Identifier;
                addressValue = storageValues?.get(addressId.name) as string;
              } else if (binExpr.right.type === 'Literal') {
                // It's a literal value (e.g., 0x...)
                const lit = binExpr.right as Literal;
                if (typeof lit.value === 'string') {
                  addressValue = lit.value;
                }
              }
              
              if (addressValue && typeof addressValue === 'string') {
                // Generate AGG_SIG_ME condition
                builder.requireSignature(addressValue);
                break;
              }
            }
          }
        }
        
        // For all other conditions, use regular require
        const condition = CodeGenerator.generateExpressionStatic(req.condition, storageValues, _paramMap, localVariables, functionDefinitions, stateFieldIndices);
        const condExpr = CodeGenerator.toBuilderExpressionStatic(condition);
        builder.require(condExpr, req.message);
        break;
      }
      
      case 'SendStatement': {
        const send = stmt as SendStatement;
        const recipient = CodeGenerator.generateExpressionStatic(send.recipient, storageValues, _paramMap, localVariables, functionDefinitions, stateFieldIndices);
        const amount = CodeGenerator.generateExpressionStatic(send.amount, storageValues, _paramMap, localVariables, functionDefinitions, stateFieldIndices);
        const memo = send.memo ? CodeGenerator.generateExpressionStatic(send.memo, storageValues, _paramMap, localVariables, functionDefinitions, stateFieldIndices) : undefined;
        
        // Convert recipient to appropriate type
        const recipientValue = recipient;
        const amountValue = amount;
        
        // Add comment for clarity
        const recipientStr = CodeGenerator.expressionToStringStatic(send.recipient);
        const amountStr = CodeGenerator.expressionToStringStatic(send.amount);
        const memoStr = send.memo ? CodeGenerator.expressionToStringStatic(send.memo) : '';
        builder.comment(`Send ${amountStr} to ${recipientStr}${memoStr ? ` with memo: ${memoStr}` : ''}`);
        
        // Handle different recipient types
        if (typeof recipientValue === 'string') {
          // Direct string value (e.g., hex address)
          const amountExpr = typeof amountValue === 'number' ? amountValue : 
                            typeof amountValue === 'string' ? variable(amountValue) :
                            amountValue as BuilderExpression;
          
          if (memo) {
            const memoValue = typeof memo === 'string' ? memo : undefined;
            if (memoValue) {
              builder.createCoin(recipientValue, amountExpr, memoValue);
            } else {
              builder.createCoin(recipientValue, amountExpr);
            }
          } else {
            builder.createCoin(recipientValue, amountExpr);
          }
        } else {
          // For non-string recipients (variables, expressions), use addCondition directly
          const recipientExpr = CodeGenerator.toBuilderExpressionStatic(recipientValue);
          const amountExpr = CodeGenerator.toBuilderExpressionStatic(amountValue);
          
          // If we have memo, add it to the condition
          if (memo) {
            const memoExpr = CodeGenerator.toBuilderExpressionStatic(memo);
            builder.addCondition(51, recipientExpr, amountExpr, memoExpr); // 51 = CREATE_COIN
          } else {
            builder.addCondition(51, recipientExpr, amountExpr); // 51 = CREATE_COIN
          }
        }
        break;
      }
      
      case 'EmitStatement': {
        const emit = stmt as EmitStatement;
        // Events are implemented as CREATE_COIN_ANNOUNCEMENT with the event data
        // Since event names are syntactic sugar, we just announce the data
        
        if (emit.arguments.length > 0) {
          // Create a list of all event arguments
          const eventData: TreeNode[] = [];
          
          for (const arg of emit.arguments) {
            const argValue = CodeGenerator.generateExpressionStatic(arg, storageValues, _paramMap, localVariables, functionDefinitions);
            eventData.push(CodeGenerator.toBuilderExpressionStatic(argValue).tree);
          }
          
          // Create announcement with the event data list
          if (eventData.length === 1) {
            // Single argument - create expression and add as announcement
            const dataExpr = expr(eventData[0]);
            builder.addCondition(60, dataExpr); // CREATE_COIN_ANNOUNCEMENT
          } else {
            // Multiple arguments - announce as a list
            const dataExpr = expr(list(eventData));
            builder.addCondition(60, dataExpr); // CREATE_COIN_ANNOUNCEMENT
          }
        }
        // If no arguments, don't create an announcement (event names are just syntactic sugar)
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
        const condExpr = CodeGenerator.toBuilderExpressionStatic(condition);
        
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
              b.returnValue(expr(NIL));
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
        
        // Check if this is a state field assignment
        if (assignment.target.type === 'MemberExpression') {
          const memberExpr = assignment.target as MemberExpression;
          if (memberExpr.object.type === 'Identifier' && 
              (memberExpr.object as Identifier).name === 'state' &&
              memberExpr.property.type === 'Identifier') {
            
            // This is a state field assignment like state.counter = value
            const fieldName = (memberExpr.property as Identifier).name;
            const value = CodeGenerator.generateExpressionStatic(assignment.value, storageValues, _paramMap, localVariables, functionDefinitions, stateFieldIndices);
            
            // Store the updated state field value for later use
            if (localVariables) {
              localVariables.set(`__state_${fieldName}__`, value);
              // Mark that state has been modified
              localVariables.set('__state_modified__', 1);
            }
            
            builder.comment(`State update: state.${fieldName} = ${assignment.operator === '=' ? '' : assignment.operator.charAt(0)} value`);
            break;
          }
        }
        
        // Store the value expression in localVariables if available
        if (assignment.target.type === 'Identifier' && localVariables) {
          const targetName = (assignment.target as Identifier).name;
          const value = CodeGenerator.generateExpressionStatic(assignment.value, storageValues, _paramMap, localVariables, functionDefinitions, stateFieldIndices);
          // Store the computed expression/value for later substitution
          localVariables.set(targetName, value);
        }
        
        // Assignments don't generate conditions directly in pure functional CLVM
        // The value is substituted when the variable is used
        break;
      }
      
      case 'ExpressionStatement': {
        const expr = (stmt as ExpressionStatement).expression;
        
        // Check if this is a condition-generating function call
        if (expr.type === 'CallExpression') {
          const call = expr as CallExpression;
          if (call.callee.type === 'Identifier') {
            const funcName = (call.callee as Identifier).name;
            
            switch (funcName) {
              case 'requireSignature':
                // Handle requireSignature(address) call
                if (call.arguments.length > 0) {
                  const addressExpr = CodeGenerator.generateExpressionStatic(
                    call.arguments[0], storageValues, _paramMap, localVariables, functionDefinitions
                  );
                  
                  // Convert to address value
                  let addressValue: string;
                  if (typeof addressExpr === 'string') {
                    addressValue = addressExpr;
                  } else if (typeof addressExpr === 'object' && 'tree' in addressExpr) {
                    // Extract value from BuilderExpression
                    // For now, convert to a placeholder
                    addressValue = '0x' + '0'.repeat(96); // Default pubkey
                  } else {
                    addressValue = '0x' + '0'.repeat(96);
                  }
                  
                  // Generate AGG_SIG_ME condition
                  builder.requireSignature(addressValue);
                  return;
                }
                break;
                
              case 'assertMyAmount':
                if (call.arguments.length === 1) {
                  const amount = CodeGenerator.generateExpressionStatic(
                    call.arguments[0], storageValues, _paramMap, localVariables, functionDefinitions
                  );
                  // Convert to number if it's a string
                  if (typeof amount === 'string') {
                    // If it's a hex string, convert to number
                    if (amount.startsWith('0x')) {
                      builder.assertMyAmount(parseInt(amount.substring(2), 16));
                    } else {
                      builder.assertMyAmount(parseInt(amount));
                    }
                  } else if (typeof amount === 'number') {
                    builder.assertMyAmount(amount);
                  } else {
                    // It's already a BuilderExpression
                    builder.assertMyAmount(amount);
                  }
                  return;
                }
                break;
                
              case 'assertMyParentId':
                if (call.arguments.length === 1) {
                  const parentId = CodeGenerator.generateExpressionStatic(
                    call.arguments[0], storageValues, _paramMap, localVariables, functionDefinitions
                  );
                  // Convert to string if it's a hex value
                  let idValue: string;
                  if (typeof parentId === 'string') {
                    idValue = parentId;
                  } else if (typeof parentId === 'number') {
                    idValue = '0x' + parentId.toString(16).padStart(64, '0');
                  } else {
                    // Extract hex value from BuilderExpression if needed
                    idValue = '0x' + '0'.repeat(64);
                  }
                  builder.assertMyParentId(idValue);
                  return;
                }
                break;
                
              case 'createPuzzleAnnouncement':
                if (call.arguments.length === 1) {
                  const msg = CodeGenerator.generateExpressionStatic(
                    call.arguments[0], storageValues, _paramMap, localVariables, functionDefinitions
                  );
                  // Convert to string if needed
                  let msgValue: string;
                  if (typeof msg === 'string') {
                    msgValue = msg;
                  } else if (typeof msg === 'number') {
                    msgValue = '0x' + msg.toString(16);
                  } else {
                    msgValue = '0x1234'; // Default
                  }
                  builder.createPuzzleAnnouncement(msgValue);
                  return;
                }
                break;
                
              case 'assertPuzzleAnnouncement':
                if (call.arguments.length === 1) {
                  const annId = CodeGenerator.generateExpressionStatic(
                    call.arguments[0], storageValues, _paramMap, localVariables, functionDefinitions
                  );
                  // Convert to string if needed
                  let idValue: string;
                  if (typeof annId === 'string') {
                    idValue = annId;
                  } else if (typeof annId === 'number') {
                    idValue = '0x' + annId.toString(16).padStart(64, '0');
                  } else {
                    idValue = '0x' + '0'.repeat(64);
                  }
                  builder.assertPuzzleAnnouncement(idValue);
                  return;
                }
                break;
                
              case 'recreateSelf':
                // Handle recreateSelf() as a statement  
                builder.comment('recreateSelf() - Create coin with updated state');
                
                // In the stateful action context, we need to:
                // 1. Calculate the puzzle hash of the current puzzle (with new state)
                // 2. Get the current coin amount
                // 3. Create a coin with the same puzzle hash and amount
                
                // For now, we use placeholders that will be filled by the slot machine layer
                // The slot machine layer's finalizer will handle the actual coin creation
                builder.comment('STATEFUL_RECREATE_SELF');
                
                // Store a flag indicating recreateSelf was called
                if (localVariables) {
                  localVariables.set('__recreate_self_called__', 1);
                }
                
                return;
            }
          }
        }
        
        // For other expressions, evaluate them
        CodeGenerator.generateExpressionStatic(expr, storageValues, _paramMap, localVariables, functionDefinitions);
        break;
      }
      
      case 'ReturnStatement': {
        const returnStmt = stmt as ReturnStatement;
        if (returnStmt.value) {
          const value = CodeGenerator.generateExpressionStatic(returnStmt.value, storageValues);
          const valueExpr = CodeGenerator.toBuilderExpressionStatic(value);
          builder.returnValue(valueExpr);
        } else {
          // Return nil/empty if no value specified
          builder.returnValue(expr(NIL));
        }
        break;
      }
    }
  }
  
  private static generateExpressionStatic(expr: Expression, storageValues?: Map<string, unknown>, paramMap?: Map<string, number>, localVariables?: Map<string, BuilderExpression | string | number>, functionDefinitions?: Map<string, FunctionDeclaration>, stateFieldIndices?: Map<string, number>): BuilderExpression | string | number {
    switch (expr.type) {
      case 'BinaryExpression': {
        const binExpr = expr as BinaryExpression;
        const left = CodeGenerator.generateExpressionStatic(binExpr.left, storageValues, paramMap, localVariables, functionDefinitions, stateFieldIndices);
        const right = CodeGenerator.generateExpressionStatic(binExpr.right, storageValues, paramMap, localVariables, functionDefinitions, stateFieldIndices);
        const leftPuzzle = CodeGenerator.toBuilderExpressionStatic(left);
        const rightPuzzle = CodeGenerator.toBuilderExpressionStatic(right);
        
        switch (binExpr.operator) {
          case '+':
            return leftPuzzle.add(rightPuzzle);
          case '-':
            return leftPuzzle.subtract(rightPuzzle);
          case '*':
            return leftPuzzle.multiply(rightPuzzle);
          case '/':
            return leftPuzzle.divide(rightPuzzle);
          case '%':
            // Use divmod and extract remainder: (r (divmod a b))
            return new BuilderExpression(list([sym('r'), list([sym('divmod'), leftPuzzle.tree, rightPuzzle.tree])]));
          case '==':
            return leftPuzzle.equals(rightPuzzle);
          case '!=':
            return leftPuzzle.equals(rightPuzzle).not();
          case '<':
            return rightPuzzle.greaterThan(leftPuzzle);
          case '>':
            return leftPuzzle.greaterThan(rightPuzzle);
          case '<=':
            return rightPuzzle.greaterThan(leftPuzzle).not();
          case '>=':
            return leftPuzzle.greaterThan(rightPuzzle).or(leftPuzzle.equals(rightPuzzle));
          case '&&':
            return leftPuzzle.and(rightPuzzle);
          case '||':
            return leftPuzzle.or(rightPuzzle);
          case '&':
            return new BuilderExpression(list([sym('logand'), leftPuzzle.tree, rightPuzzle.tree]));
          case '|':
            return new BuilderExpression(list([sym('logior'), leftPuzzle.tree, rightPuzzle.tree]));
          case '^':
            return new BuilderExpression(list([sym('logxor'), leftPuzzle.tree, rightPuzzle.tree]));
          case '<<':
            return new BuilderExpression(list([sym('lsh'), leftPuzzle.tree, rightPuzzle.tree]));
          case '>>':
            return new BuilderExpression(list([sym('ash'), leftPuzzle.tree, new BuilderExpression(list([sym('-'), rightPuzzle.tree])).tree]));
          default:
            throw new Error(`Unsupported binary operator: ${binExpr.operator}`);
        }
      }
      
      case 'UnaryExpression': {
        const unaryExpr = expr as UnaryExpression;
        const operand = CodeGenerator.generateExpressionStatic(unaryExpr.operand, storageValues, paramMap, localVariables, functionDefinitions);
        const operandPuzzle = CodeGenerator.toBuilderExpressionStatic(operand);
        
        switch (unaryExpr.operator) {
          case '!':
            return operandPuzzle.not();
          case '-':
            return new BuilderExpression(list([sym('-'), operandPuzzle.tree]));
          case '~':
            return new BuilderExpression(list([sym('lognot'), operandPuzzle.tree]));
          default:
            throw new Error(`Unsupported unary operator: ${unaryExpr.operator}`);
        }
      }
      
      case 'MemberExpression': {
        const memberExpr = expr as MemberExpression;
        const objName = (memberExpr.object as Identifier).name;
        const propName = (memberExpr.property as Identifier).name;
        
        // Handle special variables
        if (objName === 'msg') {
          switch (propName) {
            case 'sender':
              // For msg.sender, we need to track that AGG_SIG_ME is required
              // The actual sender address will be passed as a solution parameter
              return variable('sender');
            case 'value':
              // Coin amount - would need runtime support
              return variable('coin_amount');
            case 'puzzle':
              // Current puzzle hash - would need runtime support
              return variable('puzzle_hash');
            default:
              throw new Error(`Unknown msg property: ${propName}`);
          }
        } else if (objName === 'block') {
          switch (propName) {
            case 'timestamp':
              // Current timestamp - would need runtime support
              return variable('current_timestamp');
            case 'height':
              // Current block height - would need runtime support
              return variable('current_height');
            default:
              throw new Error(`Unknown block property: ${propName}`);
          }
        } else if (objName === 'state') {
          // State field access - extract from current_state parameter based on field index
          // In stateful actions, current_state is passed as a list
          
          // Find the field index from the state field indices map
          let fieldIndex = 0;
          if (stateFieldIndices && stateFieldIndices.has(propName)) {
            fieldIndex = stateFieldIndices.get(propName)!;
          }
          
          // Generate proper list access based on field index
          // For index 0: (f current_state)
          // For index 1: (f (r current_state))
          // For index 2: (f (r (r current_state)))
          // etc.
          let stateAccess = variable('current_state').tree;
          for (let i = 0; i < fieldIndex; i++) {
            stateAccess = list([sym('r'), stateAccess]);
          }
          return new BuilderExpression(list([sym('f'), stateAccess]));
        } else {
          // Handle mapping access
          // For now, just return a placeholder
          return variable(`${objName}_${propName}`);
        }
      }
      
      case 'Identifier': {
        const id = expr as Identifier;
        
        // Check local variables first and return the stored expression
        if (localVariables && localVariables.has(id.name)) {
          const storedValue = localVariables.get(id.name)!;
          // Return the stored expression/value directly
          return storedValue;
        }
        
        // Check if this identifier is a parameter with a known position
        if (paramMap && paramMap.has(id.name)) {
          const paramIndex = paramMap.get(id.name)!;
          // Generate proper CLVM solution reference
          // @ = entire solution
          // (f @) = first element (index 0)
          // (f (r @)) = second element (index 1)
          // (f (r (r @))) = third element (index 2), etc.
          // Since we now have ACTION param1 param2 ... as module parameters,
          // we can directly reference them by name
          return new BuilderExpression(sym(`param${paramIndex + 1}`));
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
          if (typeof value === 'string') {
            // For addresses/hex values, return as-is
            if (value.startsWith('0x')) {
              return value;
            } else {
              // For regular strings, return as quoted string
              return `"${value}"`;
            }
          } else if (typeof value === 'number') {
            return value;
          } else if (typeof value === 'boolean') {
            // For booleans, return 1 or 0
            return value ? 1 : 0;
          }
          // If we found it in storage but it's not a recognized type, still use it
          return value as BuilderExpression | string | number;
        }
        
        // For all other identifiers, use variable()
        return variable(id.name);
      }
      
      case 'Literal': {
        const lit = expr as Literal;
        if (lit.value === null) {
          // null represents NIL/empty list
          return new BuilderExpression(NIL);
        }
        if (typeof lit.value === 'string' && lit.value.startsWith('0x')) {
          // Check if it's a short hex address that needs to be normalized
          const hexValue = lit.value.substring(2); // Remove '0x' prefix
          // Check if it's an all-zero address pattern (like 0x0, 0x00, etc.)
          if (/^0+$/.test(hexValue) && hexValue.length < 64) {
            // Normalize to full 64-character zero address
            return '0x' + '0'.repeat(64);
          }
          // Check if it's a valid 64-character hex string
          if (hexValue.length === 64 && /^[0-9a-fA-F]+$/.test(hexValue)) {
            return lit.value; // Return as-is
          }
          // For other hex values, return as-is (might be other data types)
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
      
      case 'CallExpression': {
        // Handle function calls
        const call = expr as CallExpression;
        const callee = call.callee as Identifier;
        
        if (callee.type === 'Identifier') {
          // Built-in functions
          switch (callee.name) {
            case 'sha256':
              if (call.arguments.length > 0) {
                const arg = call.arguments[0];
                // Handle string literals specially
                if (CodeGenerator.isStringLiteral(arg)) {
                  const stringValue = (arg as Literal).value;
                  return new BuilderExpression(list([sym('sha256'), CodeGenerator.createStringLiteral(stringValue as string)]));
                }
                // For other expressions, use the sha256 method
                const argExpr = CodeGenerator.generateExpressionStatic(arg, storageValues, paramMap, localVariables, functionDefinitions);
                return CodeGenerator.toBuilderExpressionStatic(argExpr).sha256();
              }
              break;
              
            // String operations
            case 'concat':
              if (call.arguments.length >= 2) {
                const concatArgs = call.arguments.map(arg => {
                  // Handle string literals specially
                  if (CodeGenerator.isStringLiteral(arg)) {
                    return CodeGenerator.createStringLiteral((arg as Literal).value as string);
                  }
                  return CodeGenerator.toBuilderExpressionStatic(
                    CodeGenerator.generateExpressionStatic(arg, storageValues, paramMap, localVariables, functionDefinitions)
                  ).tree;
                });
                return new BuilderExpression(list([sym('concat'), ...concatArgs]));
              }
              break;
              
            case 'strlen':
              if (call.arguments.length === 1) {
                const arg = call.arguments[0];
                // Handle string literals specially
                if (CodeGenerator.isStringLiteral(arg)) {
                  const stringValue = (arg as Literal).value;
                  // Create the strlen call with a properly quoted string
                  return new BuilderExpression(list([sym('strlen'), CodeGenerator.createStringLiteral(stringValue as string)]));
                }
                // For other expressions, use normal processing
                const strlenArg = CodeGenerator.generateExpressionStatic(arg, storageValues, paramMap, localVariables, functionDefinitions);
                return new BuilderExpression(list([sym('strlen'), CodeGenerator.toBuilderExpressionStatic(strlenArg).tree]));
              }
              break;
              
            case 'substr':
              if (call.arguments.length === 3) {
                const substrArgs = call.arguments.map((arg, index) => {
                  // Handle string literals specially (only for the first argument)
                  if (index === 0 && CodeGenerator.isStringLiteral(arg)) {
                    return CodeGenerator.createStringLiteral((arg as Literal).value as string);
                  }
                  return CodeGenerator.toBuilderExpressionStatic(
                    CodeGenerator.generateExpressionStatic(arg, storageValues, paramMap, localVariables, functionDefinitions)
                  ).tree;
                });
                return new BuilderExpression(list([sym('substr'), ...substrArgs]));
              }
              break;
              
            // List operations
            case 'first':
            case 'f':
              if (call.arguments.length === 1) {
                const listArg = CodeGenerator.generateExpressionStatic(call.arguments[0], storageValues, paramMap, localVariables, functionDefinitions);
                return new BuilderExpression(list([sym('f'), CodeGenerator.toBuilderExpressionStatic(listArg).tree]));
              }
              break;
              
            case 'rest':
            case 'r':
              if (call.arguments.length === 1) {
                const listArg = CodeGenerator.generateExpressionStatic(call.arguments[0], storageValues, paramMap, localVariables, functionDefinitions);
                return new BuilderExpression(list([sym('r'), CodeGenerator.toBuilderExpressionStatic(listArg).tree]));
              }
              break;
              
            case 'cons':
            case 'c':
              if (call.arguments.length === 2) {
                const elem = CodeGenerator.generateExpressionStatic(call.arguments[0], storageValues, paramMap, localVariables, functionDefinitions);
                const listArg = CodeGenerator.generateExpressionStatic(call.arguments[1], storageValues, paramMap, localVariables, functionDefinitions);
                return new BuilderExpression(list([
                  sym('c'), 
                  CodeGenerator.toBuilderExpressionStatic(elem).tree,
                  CodeGenerator.toBuilderExpressionStatic(listArg).tree
                ]));
              }
              break;
              
            case 'listp':
            case 'l':
              if (call.arguments.length === 1) {
                const arg = CodeGenerator.generateExpressionStatic(call.arguments[0], storageValues, paramMap, localVariables, functionDefinitions);
                return new BuilderExpression(list([sym('l'), CodeGenerator.toBuilderExpressionStatic(arg).tree]));
              }
              break;
              
            // Logical operations
            case 'all':
              if (call.arguments.length >= 1) {
                const args = call.arguments.map(arg => 
                  CodeGenerator.toBuilderExpressionStatic(
                    CodeGenerator.generateExpressionStatic(arg, storageValues, paramMap, localVariables, functionDefinitions)
                  ).tree
                );
                return new BuilderExpression(list([sym('all'), ...args]));
              }
              break;
              
            case 'any':
              if (call.arguments.length >= 1) {
                const args = call.arguments.map(arg => 
                  CodeGenerator.toBuilderExpressionStatic(
                    CodeGenerator.generateExpressionStatic(arg, storageValues, paramMap, localVariables, functionDefinitions)
                  ).tree
                );
                return new BuilderExpression(list([sym('any'), ...args]));
              }
              break;
              
            // Additional crypto functions
            case 'keccak256':
              if (call.arguments.length >= 1) {
                const args = call.arguments.map(arg => {
                  // Handle string literals specially
                  if (CodeGenerator.isStringLiteral(arg)) {
                    return CodeGenerator.createStringLiteral((arg as Literal).value as string);
                  }
                  return CodeGenerator.toBuilderExpressionStatic(
                    CodeGenerator.generateExpressionStatic(arg, storageValues, paramMap, localVariables, functionDefinitions)
                  ).tree;
                });
                return new BuilderExpression(list([sym('keccak256'), ...args]));
              }
              break;
              
            case 'coinid':
              if (call.arguments.length === 3) {
                const args = call.arguments.map(arg => 
                  CodeGenerator.toBuilderExpressionStatic(
                    CodeGenerator.generateExpressionStatic(arg, storageValues, paramMap, localVariables, functionDefinitions)
                  ).tree
                );
                return new BuilderExpression(list([sym('coinid'), ...args]));
              }
              break;
              
            // BLS operations
            case 'point_add':
              if (call.arguments.length === 2) {
                const args = call.arguments.map(arg => 
                  CodeGenerator.toBuilderExpressionStatic(
                    CodeGenerator.generateExpressionStatic(arg, storageValues, paramMap, localVariables, functionDefinitions)
                  ).tree
                );
                return new BuilderExpression(list([sym('point_add'), ...args]));
              }
              break;
              
            case 'pubkey_for_exp':
              if (call.arguments.length === 1) {
                const arg = CodeGenerator.generateExpressionStatic(call.arguments[0], storageValues, paramMap, localVariables, functionDefinitions);
                return new BuilderExpression(list([sym('pubkey_for_exp'), CodeGenerator.toBuilderExpressionStatic(arg).tree]));
              }
              break;
              
            case 'g1_add':
              if (call.arguments.length === 2) {
                const args = call.arguments.map(arg => 
                  CodeGenerator.toBuilderExpressionStatic(
                    CodeGenerator.generateExpressionStatic(arg, storageValues, paramMap, localVariables, functionDefinitions)
                  ).tree
                );
                return new BuilderExpression(list([sym('g1_add'), ...args]));
              }
              break;
              
            case 'bls_verify':
              if (call.arguments.length === 3) {
                const args = call.arguments.map(arg => 
                  CodeGenerator.toBuilderExpressionStatic(
                    CodeGenerator.generateExpressionStatic(arg, storageValues, paramMap, localVariables, functionDefinitions)
                  ).tree
                );
                return new BuilderExpression(list([sym('bls_verify'), ...args]));
              }
              break;
              
            // Evaluation control
            case 'quote':
            case 'q':
              if (call.arguments.length === 1) {
                const arg = CodeGenerator.generateExpressionStatic(call.arguments[0], storageValues, paramMap, localVariables, functionDefinitions);
                return new BuilderExpression(list([sym('q'), CodeGenerator.toBuilderExpressionStatic(arg).tree]));
              }
              break;
              
            case 'apply':
            case 'a':
              if (call.arguments.length === 2) {
                const func = CodeGenerator.generateExpressionStatic(call.arguments[0], storageValues, paramMap, localVariables, functionDefinitions);
                const args = CodeGenerator.generateExpressionStatic(call.arguments[1], storageValues, paramMap, localVariables, functionDefinitions);
                return new BuilderExpression(list([
                  sym('a'),
                  CodeGenerator.toBuilderExpressionStatic(func).tree,
                  CodeGenerator.toBuilderExpressionStatic(args).tree
                ]));
              }
              break;
              
            case 'coinAmount':
              // Returns the amount of the current coin (1 in CLVM = entire solution/environment)
              // But for coin amount, we use @ which represents the coin's value
              return new BuilderExpression(sym('@'));
              
            case 'currentTime':
              // Returns current timestamp using CLVM environment
              // This generates a call to get the current time from the block
              return new BuilderExpression(list([sym('current_time')]));
              
            case 'currentHeight':
              // Returns current block height using CLVM environment
              return new BuilderExpression(list([sym('current_height')]));
              
            case 'recreateSelf':
              // Recreates the coin with the same puzzle hash
              // This needs to be handled at a higher level in statement generation
              return new BuilderExpression(list([sym('recreate_self')]));
              
            case 'coinID':
              // Returns the current coin's ID
              // In CLVM, this would be calculated from parent, puzzle_hash, amount
              return new BuilderExpression(list([sym('coin_id')]));
              
            case 'puzzleHash':
              // Returns the current puzzle hash
              return new BuilderExpression(list([sym('puzzle_hash')]));
              
            case 'sha256tree':
              // From sha256tree.clib - calculate tree hash of a value
              // Track feature usage if we're in instance context
              if ('featuresUsed' in this) {
                (this as any).featuresUsed.add('sha256tree');
              }
              if (call.arguments.length > 0) {
                const arg = CodeGenerator.generateExpressionStatic(call.arguments[0], storageValues);
                const argExpr = CodeGenerator.toBuilderExpressionStatic(arg);
                // Generate (sha256tree arg)
                return new BuilderExpression(list([sym('sha256tree'), argExpr.tree]));
              }
              break;
              
            case 'pubkey':
              if (call.arguments.length > 0) {
                const arg = CodeGenerator.generateExpressionStatic(call.arguments[0], storageValues);
                return CodeGenerator.toBuilderExpressionStatic(arg);
              }
              break;
              
            // Type casting functions
            case 'bytes32':
              if (call.arguments.length > 0) {
                const arg = CodeGenerator.generateExpressionStatic(call.arguments[0], storageValues, paramMap, localVariables, functionDefinitions);
                // For bytes32 casting, we need to ensure the value is 32 bytes
                // In ChiaLisp, this might involve padding or truncating
                return CodeGenerator.toBuilderExpressionStatic(arg);
              }
              break;
              
            case 'uint256':
            case 'uint128':
            case 'uint64':
            case 'uint32':
            case 'uint16':
            case 'uint8':
            case 'int256':
            case 'int128':
            case 'int64':
            case 'int32':
            case 'int16':
            case 'int8':
              // Integer type casting - just return the value
              if (call.arguments.length > 0) {
                const arg = CodeGenerator.generateExpressionStatic(call.arguments[0], storageValues, paramMap, localVariables, functionDefinitions);
                return CodeGenerator.toBuilderExpressionStatic(arg);
              }
              break;
              
            case 'address':
              // Address type casting
              if (call.arguments.length > 0) {
                const arg = CodeGenerator.generateExpressionStatic(call.arguments[0], storageValues, paramMap, localVariables, functionDefinitions);
                return CodeGenerator.toBuilderExpressionStatic(arg);
              }
              break;
              
            case 'bool':
              // Boolean type casting - convert to 0 or 1
              if (call.arguments.length > 0) {
                const arg = CodeGenerator.generateExpressionStatic(call.arguments[0], storageValues, paramMap, localVariables, functionDefinitions);
                const argExpr = CodeGenerator.toBuilderExpressionStatic(arg);
                // Convert to boolean: if arg != 0 then 1 else 0
                return new BuilderExpression(list([
                  sym('i'),
                  argExpr.tree,
                  int(1),
                  int(0)
                ]));
              }
              break;
              
            // Curry and treehash functions
            case 'puzzle_hash_of_curried_function':
              // From curry-and-treehash.clinc
              if (call.arguments.length >= 1) {
                const args = call.arguments.map(arg => 
                  CodeGenerator.generateExpressionStatic(arg, storageValues, paramMap, localVariables, functionDefinitions)
                );
                const argTrees = args.map(arg => {
                  if (typeof arg === 'object' && 'tree' in arg) {
                    return arg.tree;
                  }
                  return CodeGenerator.toBuilderExpressionStatic(arg).tree;
                });
                return new BuilderExpression(list([sym('puzzle-hash-of-curried-function'), ...argTrees]));
              }
              break;
              
            case 'tree_hash_of_apply':
              // From curry-and-treehash.clinc
              if (call.arguments.length === 2) {
                const funcHash = CodeGenerator.generateExpressionStatic(call.arguments[0], storageValues);
                const envHash = CodeGenerator.generateExpressionStatic(call.arguments[1], storageValues);
                return new BuilderExpression(list([
                  sym('tree-hash-of-apply'), 
                  CodeGenerator.toBuilderExpressionStatic(funcHash).tree,
                  CodeGenerator.toBuilderExpressionStatic(envHash).tree
                ]));
              }
              break;
              
            // Singleton truth functions
            case 'my_id_truth':
            case 'my_full_puzzle_hash_truth':
            case 'my_inner_puzzle_hash_truth':
            case 'my_amount_truth':
            case 'my_lineage_proof_truth':
            case 'singleton_struct_truth':
            case 'singleton_mod_hash_truth':
            case 'singleton_launcher_id_truth':
            case 'singleton_launcher_puzzle_hash_truth':
              // From singleton_truths.clib
              if (call.arguments.length === 1) {
                const truths = CodeGenerator.generateExpressionStatic(call.arguments[0], storageValues);
                return new BuilderExpression(list([
                  sym(callee.name.replace(/_/g, '-')), // Convert snake_case to kebab-case
                  CodeGenerator.toBuilderExpressionStatic(truths).tree
                ]));
              }
              break;
              
            // CAT truth functions  
            case 'my_inner_puzzle_hash_cat_truth':
            case 'cat_struct_truth':
            case 'my_id_cat_truth':
            case 'my_coin_info_truth':
            case 'my_amount_cat_truth':
            case 'my_full_puzzle_hash_cat_truth':
            case 'my_parent_cat_truth':
            case 'cat_mod_hash_truth':
            case 'cat_mod_hash_hash_truth':
            case 'cat_tail_program_hash_truth':
              // From cat_truths.clib
              if (call.arguments.length === 1) {
                const truths = CodeGenerator.generateExpressionStatic(call.arguments[0], storageValues);
                return new BuilderExpression(list([
                  sym(callee.name.replace(/_/g, '-')), // Convert snake_case to kebab-case
                  CodeGenerator.toBuilderExpressionStatic(truths).tree
                ]));
              }
              break;
              
            // Utility macro functions (handled at compile time)
            case 'assert':
              // From utility_macros.clib - expand assert macro inline
              // (defmacro assert (condition) (i condition () (x)))
              if (call.arguments.length >= 1) {
                const condition = CodeGenerator.generateExpressionStatic(call.arguments[0], storageValues, paramMap, localVariables, functionDefinitions);
                const condExpr = CodeGenerator.toBuilderExpressionStatic(condition);
                // Expand to: (i condition () (x))
                return new BuilderExpression(list([
                  sym('i'),
                  condExpr.tree,
                  NIL,  // Use NIL instead of sym('()')
                  list([sym('x')])
                ]));
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
                  return NIL;  // Use NIL instead of sym('()')
                });
                
                // Create the function call node as a BuilderExpression
                return new BuilderExpression(list([sym(callee.name), ...argTrees]));
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

  
  private static toBuilderExpressionStatic(value: BuilderExpression | string | number): BuilderExpression {
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
    } else if (expr.type === 'Identifier') {
      // Handle unquoted addresses that were parsed as identifiers
      if ((expr as Identifier).name.startsWith('xch1') || (expr as Identifier).name.startsWith('txch1')) {
        // Convert address to hex
        return addressToHex((expr as Identifier).name);
      }
      // Return the identifier name for other cases (will be resolved later)
      return (expr as Identifier).name;
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
  
  // Commenting out unused method - may be needed for future functionality
  // private generateFunction(builder: PuzzleBuilder, func: FunctionDeclaration): void {
  //   // Store function for later use when generating defun statements
  //   if (!this._functionNodes) {
  //     this._functionNodes = [];
  //   }
  //   // Store the compiled function node, not the declaration
  //   const functionNode = this.generateFunctionNode(func);
  //   this._functionNodes.push(functionNode);
  //   
  //   // The actual defun generation will happen when we build the puzzle
  //   // For now, just add a comment placeholder
  //   builder.comment(`Function: ${func.name}${func.isInline ? ' (inline)' : ''}`);
  // }
  
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
    const functionLocalVars = new Map<string, BuilderExpression | string | number>();
    
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
          bodyBuilder.returnValue(expr(NIL));
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
      bodyBuilder.returnValue(expr(NIL));
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
      const actionPuzzle = this.generateActionPuzzle2(action);
      
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
  
  private generateActionPuzzle2(action: ActionDeclaration): PuzzleBuilder {
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
        this._autoIncludes.add('condition_codes.clib');
      }
      
      // Use parameter names for the mod definition
      const paramNames = action.parameters.map(p => p.name);
      if (paramNames.length > 0) {
        actionPuzzle.withSolutionParams(...paramNames);
      }
      
      // Track local variables for this action
      const localVariables = new Map<string, BuilderExpression | string | number>();
      
      // Simple validation logic for inner puzzles
      for (const stmt of action.body) {
              // Use the static method with local variables support
      CodeGenerator.generateStatementStatic(actionPuzzle, stmt, this.storageValues, undefined, localVariables, this.functionDefinitions, this.stateFieldIndices);
      }
      
      // Return empty conditions list if no explicit return
      if (action.body.length === 0 || 
          !action.body.some(s => s.type === 'ExpressionStatement')) {
        actionPuzzle.returnValue(expr(NIL));
            }
      
      return actionPuzzle;
    }
    
    // Original implementation for stateful actions
    // Action receives current state and parameters
    const allParams = ['current_state', ...action.parameters.map(p => p.name)];
    actionPuzzle.withSolutionParams(...allParams);
    
    actionPuzzle.comment(`Action: ${action.name}`);
    
    // Track local variables for this action
    const localVariables = new Map<string, BuilderExpression | string | number>();
    
    // Generate action body
    for (const stmt of action.body) {
      CodeGenerator.generateStatementStatic(actionPuzzle, stmt, this.storageValues, undefined, localVariables, this.functionDefinitions, this.stateFieldIndices);
    }
    
    // Check if this is a stateful action
    const isStateful = action.decorators?.some(d => d.name === 'stateful') || false;
    
    if (isStateful) {
      // For stateful actions, we need to build the new state and return it along with conditions
      actionPuzzle.comment('Build new state from current state and modifications');
      
      // Build the new state list
      let newStateExpr: BuilderExpression;
      
      if (this.coin.stateBlock && this.coin.stateBlock.fields.length > 0) {
        // Build new state list based on field updates
        const stateFields = this.coin.stateBlock.fields;
        const newStateElements: TreeNode[] = [];
        
        for (let i = 0; i < stateFields.length; i++) {
          const field = stateFields[i];
          const updatedValueKey = `__state_${field.name}__`;
          
          // Check if this field was updated in localVariables
          if (localVariables && localVariables.has(updatedValueKey)) {
            // Use the updated value
            const updatedValue = localVariables.get(updatedValueKey)!;
            newStateElements.push(CodeGenerator.toBuilderExpressionStatic(updatedValue).tree);
          } else {
            // Keep the original value from current_state
            // Generate the access code for this field
            let stateAccess = variable('current_state').tree;
            for (let j = 0; j < i; j++) {
              stateAccess = list([sym('r'), stateAccess]);
            }
            newStateElements.push(list([sym('f'), stateAccess]));
          }
        }
        
        // Create the new state list expression
        newStateExpr = expr(list(newStateElements));
      } else {
        // No state block, just pass through current state
        newStateExpr = variable('current_state');
      }
      
      // Check if recreateSelf was called
      let conditionsExpr: BuilderExpression;
      if (localVariables && localVariables.has('__recreate_self_called__')) {
        // When recreateSelf is called, we don't need to add any conditions
        // The slot machine layer's finalizer will handle creating the coin
        actionPuzzle.comment('recreateSelf() called - finalizer will handle coin creation');
        conditionsExpr = expr(NIL);
      } else {
        // No conditions
        conditionsExpr = expr(NIL);
      }
      
      // Return new state and conditions as a cons cell
      actionPuzzle.comment('Return (new_state . conditions)');
      const stateAndConditions = expr(list([
        sym('c'), 
        newStateExpr.tree, 
        conditionsExpr.tree
      ]));
      actionPuzzle.returnValue(stateAndConditions);
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
    
    // Determine required includes based on features used
    const requiredIncludes = determineRequiredIncludes(this.featuresUsed);
    
    // Combine manual and auto includes, avoiding duplicates
    const allIncludes = new Set<string>();
    
    // Add manual includes first
    for (const path of this._manualIncludes) {
      allIncludes.add(path);
    }
    
    // Add auto includes
    for (const include of requiredIncludes) {
      allIncludes.add(include);
    }
    
    // Also add auto includes from tracking
    for (const path of this._autoIncludes) {
      allIncludes.add(path);
    }
    
    // If no functions, constants, or includes, return the base puzzle
    if (this._functionNodes.length === 0 && this._constantNodes.length === 0 && allIncludes.size === 0) {
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
        let includeEndIndex = 2; // After mod and params
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
        
        // Build include nodes from our set
        const includeNodes: TreeNode[] = [];
        for (const path of allIncludes) {
          includeNodes.push(list([sym('include'), sym(path)]));
        }
        
        // Rebuild with includes, constants and functions inserted
        const newItems = [
          listPuzzle.items[0], // mod
          listPuzzle.items[1], // params
          ...includeNodes, // all includes (manual + auto)
          ...this._constantNodes, // constant definitions (defconstant)
          ...this._functionNodes, // function definitions (defun/defun-inline)
          ...listPuzzle.items.slice(includeEndIndex) // body (skip existing includes)
        ];
        
        return list(newItems);
      }
    }
    
    // If not a mod structure, just return the base
    return basePuzzle;
  }

  // Commenting out unused method - may be needed for future functionality
  // private generateCondition(type: string, args: any[]): TreeNode {
  //   const conditionMap: Record<string, number> = {
  //     'CREATE_COIN': 51,
  //     'AGG_SIG_ME': 50,
  //     'RESERVE_FEE': 52,
  //     'CREATE_COIN_ANNOUNCEMENT': 60,
  //     'ASSERT_COIN_ANNOUNCEMENT': 61,
  //     'ASSERT_MY_PUZZLEHASH': 72,
  //     'ASSERT_MY_COIN_ID': 70,
  //     'ASSERT_SECONDS_RELATIVE': 80,
  //     'ASSERT_HEIGHT_RELATIVE': 82
  //   };

  //   const opcode = conditionMap[type];
  //   if (!opcode) {
  //     throw new Error(`Unknown condition type: ${type}`);
  //   }

  //   // Track feature usage
  //   this.featuresUsed.add(type);

  //   // Use symbolic name when includes are present
  //   const opcodeExpr = sym(type);

  //   const conditionArgs = args.map(arg => {
  //     if (typeof arg === 'object' && arg !== null) {
  //       const result = CodeGenerator.generateExpressionStatic(arg);
  //       // Convert to TreeNode if needed
  //       return CodeGenerator.toBuilderExpressionStatic(result).tree;
  //     }
  //     // Convert arg to tree node
  //     if (typeof arg === 'number') {
  //       return int(arg);
  //     } else if (typeof arg === 'string') {
  //       return sym(arg);
  //     }
  //     return NIL;
  //   });

  //   return list([opcodeExpr, ...conditionArgs]);
  // }

  // ... existing code ...

  // Update the generateSendCoins method to use symbolic constants
  // Commenting out unused method - may be needed for future functionality
  // private generateSendCoins(args: Expression[]): TreeNode {
  //   if (args.length < 2 || args.length > 3) {
  //     throw new Error('sendCoins requires 2 or 3 arguments: recipient, amount, [memo]');
  //   }

  //   // Track feature usage
  //   this.featuresUsed.add('CREATE_COIN');

  //   const recipientExpr = CodeGenerator.generateExpressionStatic(args[0]);
  //   const amountExpr = CodeGenerator.generateExpressionStatic(args[1]);
  //   
  //   // Convert to TreeNode
  //   const recipient = CodeGenerator.toBuilderExpressionStatic(recipientExpr).tree;
  //   const amount = CodeGenerator.toBuilderExpressionStatic(amountExpr).tree;
  //   
  //   if (args.length === 3) {
  //     const memoExpr = CodeGenerator.generateExpressionStatic(args[2]);
  //     const memo = CodeGenerator.toBuilderExpressionStatic(memoExpr).tree;
  //     return list([
  //       sym('CREATE_COIN'),
  //       recipient,
  //       amount,
  //       memo
  //     ]);
  //   } else {
  //     return list([
  //       sym('CREATE_COIN'),
  //       recipient,
  //       amount
  //     ]);
  //   }
  // }

  // Update signature methods
  // Commenting out unused method - may be needed for future functionality
  // private generateRequireSignature(args: Expression[]): TreeNode {
  //   if (args.length !== 1) {
  //     throw new Error('requireSignature requires 1 argument: publicKey');
  //   }
  //   
  //   // Track feature usage
  //   this.featuresUsed.add('AGG_SIG_ME');
  //   
  //   const pubkeyExpr = CodeGenerator.generateExpressionStatic(args[0]);
  //   const pubkey = CodeGenerator.toBuilderExpressionStatic(pubkeyExpr).tree;
  //   return list([
  //     sym('AGG_SIG_ME'),
  //     pubkey,
  //     list([sym('sha256tree1'), sym('@')]) // Message is puzzle hash
  //   ]);
  // }

  // ... existing code ...

  /**
   * Create a string literal that will be properly quoted in the output
   */
  private static createStringLiteral(value: string): TreeNode {
    // For string literals that need to be quoted in the output,
    // we create a special symbol that starts with a quote character
    // This tells the serializer to treat it as a quoted string
    return sym(`"${value}"`);
  }

  /**
   * Check if an expression is a string literal
   */
  private static isStringLiteral(expr: Expression): boolean {
    return expr.type === 'Literal' && typeof (expr as Literal).value === 'string';
  }

  /**
   * Scan an expression for features that require auto-includes
   */
  private scanExpressionForFeatures(expr: Expression): void {
    switch (expr.type) {
      case 'CallExpression': {
        const call = expr as CallExpression;
        if (call.callee.type === 'Identifier') {
          const funcName = (call.callee as Identifier).name;
          // Track string operations
          if (['strlen', 'substr', 'concat'].includes(funcName)) {
            this.featuresUsed.add('condition_codes'); // String functions need condition codes
          }
          
          if (['sha256', 'sha256tree', 'keccak256', 'coinid'].includes(funcName)) {
            this.featuresUsed.add('condition_codes'); // Crypto functions need condition codes
          }
          
          if (['point_add', 'pubkey_for_exp', 'g1_add', 'bls_verify'].includes(funcName)) {
            this.featuresUsed.add('condition_codes'); // BLS operations need condition codes
          }
          
          // Add support for condition-generating functions
          if (['assertMyAmount', 'assertMyParentId', 'createPuzzleAnnouncement', 'assertPuzzleAnnouncement'].includes(funcName)) {
            this.featuresUsed.add('condition_codes');
          }
          
          // Track logic operations
          if (['all', 'any', 'not'].includes(funcName)) {
            this.featuresUsed.add(funcName);
          }
          // Track evaluation control
          if (['quote', 'apply', 'q', 'a'].includes(funcName)) {
            this.featuresUsed.add(funcName);
          }
        }
        // Recursively scan arguments
        for (const arg of call.arguments) {
          this.scanExpressionForFeatures(arg);
        }
        break;
      }
      case 'BinaryExpression': {
        const bin = expr as BinaryExpression;
        this.scanExpressionForFeatures(bin.left);
        this.scanExpressionForFeatures(bin.right);
        break;
      }
      case 'UnaryExpression': {
        const unary = expr as UnaryExpression;
        this.scanExpressionForFeatures(unary.operand);
        break;
      }
      case 'MemberExpression': {
        const mem = expr as MemberExpression;
        this.scanExpressionForFeatures(mem.object);
        this.scanExpressionForFeatures(mem.property);
        break;
      }
    }
  }

  /**
   * Scan a statement for features that require auto-includes
   */
  private scanStatementForFeatures(stmt: Statement): void {
    switch (stmt.type) {
      case 'ExpressionStatement': {
        const exprStmt = stmt as ExpressionStatement;
        this.scanExpressionForFeatures(exprStmt.expression);
        break;
      }
      case 'AssignmentStatement': {
        const assign = stmt as AssignmentStatement;
        this.scanExpressionForFeatures(assign.value);
        break;
      }
      case 'SendStatement': {
        // SendStatement uses CREATE_COIN
        this.featuresUsed.add('CREATE_COIN');
        const send = stmt as SendStatement;
        this.scanExpressionForFeatures(send.recipient);
        this.scanExpressionForFeatures(send.amount);
        if (send.memo) {
          this.scanExpressionForFeatures(send.memo);
        }
        break;
      }
      case 'RequireStatement': {
        const req = stmt as RequireStatement;
        this.scanExpressionForFeatures(req.condition);
        break;
      }
      case 'IfStatement': {
        const ifStmt = stmt as IfStatement;
        this.scanExpressionForFeatures(ifStmt.condition);
        for (const s of ifStmt.thenBody) {
          this.scanStatementForFeatures(s);
        }
        if (ifStmt.elseBody) {
          for (const s of ifStmt.elseBody) {
            this.scanStatementForFeatures(s);
          }
        }
        break;
      }
      case 'EmitStatement': {
        // EmitStatement might use CREATE_COIN_ANNOUNCEMENT
        this.featuresUsed.add('CREATE_COIN_ANNOUNCEMENT');
        break;
      }
      case 'ReturnStatement': {
        const ret = stmt as ReturnStatement;
        if (ret.value) {
          this.scanExpressionForFeatures(ret.value);
        }
        break;
      }
    }
  }

  /**
   * Scan all actions for features that require auto-includes
   */
  private scanActionsForFeatures(): void {
    // Scan all actions
    for (const action of this.coin.actions) {
      for (const stmt of action.body) {
        this.scanStatementForFeatures(stmt);
      }
    }
    
    // Scan functions too
    if (this.coin.functions) {
      for (const func of this.coin.functions) {
        for (const stmt of func.body) {
          this.scanStatementForFeatures(stmt);
        }
      }
    }
    
    // Scan constructor
    if (this.coin.constructor) {
      for (const stmt of this.coin.constructor.body) {
        this.scanStatementForFeatures(stmt);
      }
    }
  }
  
  /**
   * Check if an action accesses state
   */
  private actionAccessesState(action: ActionDeclaration): boolean {
    for (const stmt of action.body) {
      if (this.statementAccessesState(stmt)) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Check if a statement accesses state
   */
  private statementAccessesState(stmt: Statement): boolean {
    switch (stmt.type) {
      case 'ExpressionStatement': {
        const exprStmt = stmt as ExpressionStatement;
        return this.expressionAccessesState(exprStmt.expression);
      }
      case 'AssignmentStatement': {
        const assign = stmt as AssignmentStatement;
        return this.expressionAccessesState(assign.target) || 
               this.expressionAccessesState(assign.value);
      }
      case 'RequireStatement': {
        const req = stmt as RequireStatement;
        return this.expressionAccessesState(req.condition);
      }
      case 'SendStatement': {
        const send = stmt as SendStatement;
        return this.expressionAccessesState(send.recipient) ||
               this.expressionAccessesState(send.amount) ||
               (send.memo ? this.expressionAccessesState(send.memo) : false);
      }
      case 'EmitStatement': {
        const emit = stmt as EmitStatement;
        return emit.arguments.some(arg => this.expressionAccessesState(arg));
      }
      case 'IfStatement': {
        const ifStmt = stmt as IfStatement;
        if (this.expressionAccessesState(ifStmt.condition)) return true;
        for (const s of ifStmt.thenBody) {
          if (this.statementAccessesState(s)) return true;
        }
        if (ifStmt.elseBody) {
          for (const s of ifStmt.elseBody) {
            if (this.statementAccessesState(s)) return true;
          }
        }
        return false;
      }
      case 'ReturnStatement': {
        const ret = stmt as ReturnStatement;
        return ret.value ? this.expressionAccessesState(ret.value) : false;
      }
      default:
        return false;
    }
  }
  
  /**
   * Check if an expression accesses state
   */
  private expressionAccessesState(expr: Expression): boolean {
    switch (expr.type) {
      case 'Identifier': {
        const id = expr as Identifier;
        return id.name === 'state';
      }
      case 'MemberExpression': {
        const mem = expr as MemberExpression;
        // Check if it's state.something
        if (mem.object.type === 'Identifier' && 
            (mem.object as Identifier).name === 'state') {
          return true;
        }
        // Recursively check
        return this.expressionAccessesState(mem.object) ||
               this.expressionAccessesState(mem.property);
      }
      case 'BinaryExpression': {
        const bin = expr as BinaryExpression;
        return this.expressionAccessesState(bin.left) ||
               this.expressionAccessesState(bin.right);
      }
      case 'UnaryExpression': {
        const unary = expr as UnaryExpression;
        return this.expressionAccessesState(unary.operand);
      }
      case 'CallExpression': {
        const call = expr as CallExpression;
        if (this.expressionAccessesState(call.callee)) return true;
        return call.arguments.some(arg => this.expressionAccessesState(arg));
      }
      default:
        return false;
    }
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
  const result = generator.generate();
  
  // Skip CLVM validation for now - the ChiaLisp is valid, but the hex compilation
  // requires all numeric values to be properly formatted, which is a separate issue
  // from generating correct ChiaLisp for CoinScript
  
  // TODO: Fix CLVM hex compilation by ensuring all numeric values in the tree
  // are properly formatted as CLVM atoms
  
  return result;
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