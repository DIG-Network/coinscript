/**
 * CoinScript Tokenizer
 * 
 * Tokenizes CoinScript source code into tokens
 */

export enum TokenType {
  // Keywords
  COIN = 'COIN',
  STORAGE = 'STORAGE',
  STATE = 'STATE',
  CONSTRUCTOR = 'CONSTRUCTOR',
  ACTION = 'ACTION',
  EVENT = 'EVENT',
  REQUIRE = 'REQUIRE',
  IF = 'IF',
  ELSE = 'ELSE',
  SEND = 'SEND',
  EMIT = 'EMIT',
  LAYER = 'LAYER',
  WITH = 'WITH',
  SINGLETON = 'SINGLETON',
  OWNERSHIP = 'OWNERSHIP',
  ROYALTY = 'ROYALTY',
  METADATA = 'METADATA',
  NOTIFICATION = 'NOTIFICATION',
  TRANSFERLAYER = 'TRANSFERLAYER',
  ACTIONLAYER = 'ACTIONLAYER',
  
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
  
  // Special
  EOF = 'EOF',
  NEWLINE = 'NEWLINE',
  COMMENT = 'COMMENT'
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

/**
 * Tokenizer for CoinScript
 */
export class Tokenizer {
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
    
    // Numbers
    if (/\d/.test(char)) {
      return this.readNumber();
    }
    
    // Hex literals
    if (char === '0' && (this.peek() === 'x' || this.peek() === 'X')) {
      return this.readHex();
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
      ':': TokenType.COLON
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
      'layer': TokenType.LAYER,
      'with': TokenType.WITH,
      'singleton': TokenType.SINGLETON,
      'state': TokenType.STATE,
      'ownership': TokenType.OWNERSHIP,
      'royalty': TokenType.ROYALTY,
      'metadata': TokenType.METADATA,
      'notification': TokenType.NOTIFICATION,
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