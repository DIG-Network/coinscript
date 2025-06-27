/**
 * Core utilities for the puzzle framework
 */

import { TreeNode } from './types';
import { serialize } from './serializer';
import * as crypto from 'crypto';

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
  // Simplified implementation - in production this would use proper sha256tree
  const hash = crypto.createHash('sha256');
  
  // For now, just hash the serialized form
  // TODO: Implement proper sha256tree algorithm
  const serialized = serializeToBytes(puzzle);
  hash.update(serialized);
  
  return '0x' + hash.digest('hex');
} 