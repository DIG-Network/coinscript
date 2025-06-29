/**
 * Parser
 * 
 * Parses ChiaLisp string representation into tree nodes.
 */

import {
  TreeNode,
  ParseOptions,
  ParseError
} from './types';
import { 
  list,
  cons,
  nil,
  int, 
  hex, 
  sym, 
  str 
} from './builders';

/**
 * Parse ChiaLisp source into a tree
 */
export function parse(source: string, options: ParseOptions = {}): TreeNode {
  const { symbolsByDefault = true } = options;
  
  let position = 0;
  
  // Skip whitespace and comments
  function skipWhitespace(): void {
    while (position < source.length) {
      const ch = source[position];
      if (/\s/.test(ch)) {
        position++;
      } else if (ch === ';') {
        // Skip comment until end of line
        while (position < source.length && source[position] !== '\n') {
          position++;
        }
      } else {
        break;
      }
    }
  }
  
  // Peek at current character
  function peek(): string {
    return source[position] || '';
  }
  
  // Consume and return current character
  function consume(): string {
    return source[position++] || '';
  }
  
  // Parse error with position
  function error(message: string): never {
    throw new ParseError(message, source, position);
  }
  
  // Parse a single expression
  function parseExpression(): TreeNode {
    skipWhitespace();
    
    const ch = peek();
    
    if (ch === '(') {
      return parseList();
    } else if (ch === '"') {
      return parseString();
    } else if (ch === '') {
      error('Unexpected end of input');
    } else {
      return parseAtom();
    }
  }
  
  // Parse a list or cons pair
  function parseList(): TreeNode {
    consume(); // '('
    skipWhitespace();
    
    if (peek() === ')') {
      consume(); // ')'
      return nil;
    }
    
    const items: TreeNode[] = [];
    let improper = false;
    let lastItem: TreeNode | null = null;
    
    // eslint-disable-next-line no-constant-condition
    while (true) {
      skipWhitespace();
      
      const nextChar = peek();
      if (nextChar === ')') {
        consume(); // ')'
        break;
      }
      
      if (nextChar === '.') {
        consume(); // '.'
        skipWhitespace();
        
        if (items.length === 0) {
          error('Unexpected dot at start of list');
        }
        
        // Parse the rest element
        lastItem = parseExpression();
        improper = true;
        
        skipWhitespace();
        if (peek() !== ')') {
          error('Expected closing parenthesis after dot notation');
        }
        consume(); // ')'
        break;
      }
      
      items.push(parseExpression());
    }
    
    // Build the result
    if (improper && lastItem) {
      // Build improper list
      let result = lastItem;
      for (let i = items.length - 1; i >= 0; i--) {
        result = cons(items[i], result);
      }
      return result;
    } else {
      // Proper list
      return list(items);
    }
  }
  
  // Parse a quoted string
  function parseString(): TreeNode {
    consume(); // '"'
    
    let value = '';
    while (position < source.length) {
      const ch = source[position];
      
      if (ch === '"') {
        position++;
        break;
      }
      
      if (ch === '\\') {
        position++;
        const next = source[position];
        switch (next) {
          case 'n': value += '\n'; break;
          case 'r': value += '\r'; break;
          case 't': value += '\t'; break;
          case '\\': value += '\\'; break;
          case '"': value += '"'; break;
          default: value += next;
        }
        position++;
      } else {
        value += ch;
        position++;
      }
    }
    
    // In ChiaLisp, quoted strings are often symbols
    return symbolsByDefault ? sym(value) : str(value);
  }
  
  // Parse an atom
  function parseAtom(): TreeNode {
    let value = '';
    
    while (position < source.length) {
      const ch = source[position];
      if (/[\s();]/.test(ch)) {
        break;
      }
      value += ch;
      position++;
    }
    
    if (value === '') {
      error('Empty atom');
    }
    
    // Check for special atoms
    if (value === '()') {
      return nil;
    }
    
    // Check for hex
    if (value.startsWith('0x')) {
      return hex(value);
    }
    
    // Check for number
    if (/^-?\d+$/.test(value)) {
      const num = parseInt(value, 10);
      return int(num);
    }
    
    // Check for bigint
    if (/^-?\d+n$/.test(value)) {
      const bigintValue = BigInt(value.slice(0, -1));
      return int(bigintValue);
    }
    
    // Default: symbol
    return sym(value);
  }
  
  // Parse the expression and ensure we consumed all input
  const result = parseExpression();
  skipWhitespace();
  
  if (position < source.length) {
    error('Unexpected input after expression');
  }
  
  return result;
}

/**
 * Try to parse ChiaLisp, return null on error
 */
export function tryParse(source: string, options?: ParseOptions): TreeNode | null {
  try {
    return parse(source, options);
  } catch (e) {
    if (e instanceof ParseError) {
      return null;
    }
    throw e;
  }
} 