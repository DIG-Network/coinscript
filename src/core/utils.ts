/**
 * Core utilities for the puzzle framework
 */

import { TreeNode, SerializeOptions } from './types';
import { serialize } from './serializer';
import * as crypto from 'crypto';
import { treeToProgram } from './converters';
import { sha256tree as calculateSha256tree } from './index';

/**
 * Serialize a tree node to bytes
 * @param node - The tree node to serialize
 * @returns Serialized bytes
 */
export function serializeToBytes(node: TreeNode): Uint8Array {
  const hexString = serialize(node);
  // Remove 0x prefix if present
  const cleanHex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
  // Convert hex string to Uint8Array
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Calculate the mod hash of a puzzle (tree hash)
 * @param puzzle - The puzzle tree node
 * @returns The mod hash as a hex string
 */
export function calculateModHash(puzzle: TreeNode): string {
  // Use our sha256tree function
  try {
    const hash = calculateSha256tree(puzzle);
    return '0x' + Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    // Fallback to simple hash if tree hash fails
    const hash = crypto.createHash('sha256');
    const serialized = serializeToBytes(puzzle);
    hash.update(serialized);
    return '0x' + hash.digest('hex');
  }
}

/**
 * Convert a TreeNode to its puzzle reveal format (compiled hex without 0x prefix)
 * @param node - The tree node to convert
 * @returns The puzzle reveal hex string
 */
export function toPuzzleReveal(node: TreeNode): string {
  try {
    // Convert to Program and compile
    const program = treeToProgram(node);
    const compiled = program.compile();
    // The compile returns an object with value property that has serializeHex method
    if (compiled && typeof compiled === 'object' && 'value' in compiled) {
      const hex = (compiled.value as { serializeHex: () => string }).serializeHex();
      return hex.startsWith('0x') ? hex.slice(2) : hex;
    }
    throw new Error('Unable to compile');
  } catch (error) {
    // If compilation fails, try serialization in hex format
    const serialized = serialize(node);
    return serialized.startsWith('0x') ? serialized.slice(2) : serialized;
  }
}

/**
 * Get the mod hash from a TreeNode
 * @param node - The tree node
 * @returns The mod hash hex string
 */
export function toModHash(node: TreeNode): string {
  return calculateModHash(node);
}

/**
 * Convert a TreeNode to ChiaLisp source
 * @param node - The tree node
 * @returns The ChiaLisp source string
 */
export function toChiaLisp(node: TreeNode): string {
  return serialize(node, { format: 'chialisp' } as SerializeOptions);
}

/**
 * Extend TreeNode with utility methods
 * This allows calling methods on TreeNode objects
 */
export function extendTreeNode(node: TreeNode): TreeNode & {
  toModHash(): string;
  toPuzzleReveal(): string;
  toChiaLisp(): string;
} {
  return Object.assign(node, {
    toModHash: () => toModHash(node),
    toPuzzleReveal: () => toPuzzleReveal(node),
    toChiaLisp: () => toChiaLisp(node)
  });
} 