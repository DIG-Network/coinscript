/**
 * Tree builders
 * 
 * Functions to create tree nodes in a convenient way.
 */

import { TreeNode, Atom, List, Cons, AtomValue } from './types';

/**
 * Create an atom node
 */
export function atom(value: AtomValue): Atom {
  return { type: 'atom', value };
}

/**
 * Create a list node
 */
export function list(items: TreeNode[]): List {
  return { type: 'list', items };
}

/**
 * Create a cons pair node
 */
export function cons(first: TreeNode, rest: TreeNode): Cons {
  return { type: 'cons', first, rest };
}

/**
 * Nil atom (empty list)
 */
export const nil = atom(null);

/**
 * Create atom from integer
 */
export function int(value: number | bigint): Atom {
  return atom(value);
}

/**
 * Create atom from hex string
 */
export function hex(value: string): Atom {
  // Remove 0x prefix if present
  const cleanHex = value.startsWith('0x') ? value.slice(2) : value;
  // Convert to Uint8Array
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
  }
  return atom(bytes);
}

/**
 * Create atom from bytes
 */
export function bytes(value: Uint8Array): Atom {
  return atom(value);
}

/**
 * Create atom from string (as symbol)
 */
export function sym(value: string): Atom {
  return atom(value);
}

/**
 * Create quoted string atom (stores as bytes)
 */
export function str(value: string): Atom {
  const encoder = new TextEncoder();
  return atom(encoder.encode(value));
}

/**
 * Build a list from cons pairs
 */
export function buildList(...items: TreeNode[]): TreeNode {
  if (items.length === 0) return nil;
  if (items.length === 1) return cons(items[0], nil);
  return cons(items[0], buildList(...items.slice(1)));
} 