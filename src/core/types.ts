/**
 * Core Types
 * 
 * Fundamental types for representing ChiaLisp as a tree structure
 * that can be easily inspected, manipulated, and converted.
 */

/**
 * Core tree node types
 */
export type TreeNode = Atom | List | Cons;

/**
 * Atom node - represents a single value
 */
export interface Atom {
  type: 'atom';
  value: AtomValue;
}

/**
 * List node - represents a proper list (nil-terminated)
 */
export interface List {
  type: 'list';
  items: TreeNode[];
}

/**
 * Cons pair node - represents an improper list
 */
export interface Cons {
  type: 'cons';
  first: TreeNode;
  rest: TreeNode;
}

/**
 * Valid atom value types
 */
export type AtomValue = number | bigint | Uint8Array | string | boolean | null;

/**
 * Type guards
 */
export function isAtom(node: TreeNode): node is Atom {
  return node.type === 'atom';
}

export function isList(node: TreeNode): node is List {
  return node.type === 'list';
}

export function isCons(node: TreeNode): node is Cons {
  return node.type === 'cons';
}

/**
 * Check if atom represents nil
 */
export function isNil(node: TreeNode): boolean {
  return isAtom(node) && node.value === null;
}

/**
 * Options for various operations
 */
export interface SerializeOptions {
  // Use keywords like 'q' instead of 1
  useKeywords?: boolean;
  // Use opcode constants from opcodes.clib (e.g., QUOTE instead of q, IF instead of i)
  useOpcodeConstants?: boolean;
  // Output hex strings with 0x prefix
  hexPrefix?: boolean;
  // Indent nested structures
  indent?: boolean;
  // Indentation string (default: '  ')
  indentString?: string;
  // Comments associated with nodes
  comments?: Map<TreeNode, string>;
  // Block comments to add before the body
  blockComments?: string[];
}

export interface ParseOptions {
  // Treat unquoted strings as symbols (default: true)
  symbolsByDefault?: boolean;
}

/**
 * Error types
 */
export class TreeError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'TreeError';
  }
}

export class ParseError extends TreeError {
  constructor(message: string, public source?: string, public position?: number) {
    super(message, 'PARSE_ERROR');
    this.name = 'ParseError';
  }
}

export class SerializeError extends TreeError {
  constructor(message: string) {
    super(message, 'SERIALIZE_ERROR');
    this.name = 'SerializeError';
  }
}

export class ConversionError extends TreeError {
  constructor(message: string) {
    super(message, 'CONVERSION_ERROR');
    this.name = 'ConversionError';
  }
} 