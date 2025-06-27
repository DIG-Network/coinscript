/**
 * Converters
 * 
 * Convert between tree nodes and clvm-lib Program objects.
 */

import { Program } from 'clvm-lib';
import {
  TreeNode,
  isAtom,
  isList,
  isCons,
  ConversionError
} from './types';
import { parse } from './parser';
import { serialize } from './serializer';

/**
 * Convert a tree node to a Program
 */
export function treeToProgram(node: TreeNode): Program {
  if (isAtom(node)) {
    const { value } = node;
    
    // Nil
    if (value === null) {
      return Program.nil;
    }
    
    // Number
    if (typeof value === 'number') {
      return Program.fromInt(value);
    }
    
    // BigInt
    if (typeof value === 'bigint') {
      return Program.fromBigInt(value);
    }
    
    // Boolean
    if (typeof value === 'boolean') {
      return Program.fromInt(value ? 1 : 0);
    }
    
    // Bytes
    if (value instanceof Uint8Array) {
      return Program.fromBytes(value);
    }
    
    // String (as bytes)
    if (typeof value === 'string') {
      const encoder = new TextEncoder();
      return Program.fromBytes(encoder.encode(value));
    }
    
    throw new ConversionError(`Cannot convert atom value to Program: ${String(value)}`);
  }
  
  if (isList(node)) {
    // Convert list items
    const items = node.items.map(treeToProgram);
    
    // Build list from right to left
    let result = Program.nil;
    for (let i = items.length - 1; i >= 0; i--) {
      result = Program.cons(items[i], result);
    }
    return result;
  }
  
  if (isCons(node)) {
    const first = treeToProgram(node.first);
    const rest = treeToProgram(node.rest);
    return Program.cons(first, rest);
  }
  
  throw new ConversionError(`Unknown node type: ${JSON.stringify(node)}`);
}

/**
 * Convert a Program to a tree node
 */
export function programToTree(program: Program): TreeNode {
  // Atom
  if (program.isAtom) {
    // Check for nil
    if (program.isNull) {
      return { type: 'atom', value: null };
    }
    
    // Get atom bytes
    const bytes = program.atom;
    if (!bytes) {
      throw new ConversionError('Program atom has no bytes');
    }
    
    // Try to interpret as different types
    // First, try as integer
    try {
      const intValue = program.toInt();
      // Check if it's a small integer that fits in JS number
      if (intValue >= Number.MIN_SAFE_INTEGER && intValue <= Number.MAX_SAFE_INTEGER) {
        return { type: 'atom', value: Number(intValue) };
      }
      // Otherwise use bigint
      return { type: 'atom', value: intValue };
    } catch {
      // Not an integer, treat as bytes
      return { type: 'atom', value: bytes };
    }
  }
  
  // Cons pair
  if (program.isCons) {
    const first = program.first;
    const rest = program.rest;
    
    if (!first || !rest) {
      throw new ConversionError('Program cons pair missing first or rest');
    }
    
    // Check if it's a proper list
    if (isProperList(program)) {
      const items: TreeNode[] = [];
      let current = program;
      
      while (current.isCons) {
        if (current.first) {
          items.push(programToTree(current.first));
        }
        if (current.rest) {
          current = current.rest;
        } else {
          break;
        }
      }
      
      return { type: 'list', items };
    }
    
    // Improper list (cons pair)
    return {
      type: 'cons',
      first: programToTree(first),
      rest: programToTree(rest)
    };
  }
  
  throw new ConversionError('Program is neither atom nor cons');
}

/**
 * Check if a Program represents a proper list
 */
function isProperList(program: Program): boolean {
  let current = program;
  
  while (current.isCons) {
    current = current.rest!;
  }
  
  return current.isNull;
}

/**
 * Convert ChiaLisp source to Program
 */
export function sourceToProgram(source: string): Program {
  const tree = parse(source);
  return treeToProgram(tree);
}

/**
 * Convert Program to ChiaLisp source
 */
export function programToSource(program: Program, indent = false): string {
  const tree = programToTree(program);
  return serialize(tree, { indent, useKeywords: true });
} 