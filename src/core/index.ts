/**
 * Core exports
 * 
 * Re-exports all core functionality for convenience
 */

export * from './types';
export * from './builders';
export * from './parser';
export * from './serializer';
export * from './converters';
export * from './opcodes';
export * from './curry';
export * from './clspFormatter';

// Hash utilities
import { TreeNode, isAtom, isList, Atom } from './types';
import { createHash } from 'crypto';

/**
 * Calculate SHA256 hash of data
 */
export function sha256(data: Uint8Array | string): Uint8Array {
  const hash = createHash('sha256');
  if (typeof data === 'string') {
    // Convert hex string to buffer
    const cleanHex = data.startsWith('0x') ? data.slice(2) : data;
    hash.update(Buffer.from(cleanHex, 'hex'));
  } else {
    hash.update(data);
  }
  return new Uint8Array(hash.digest());
}

/**
 * Calculate the SHA256 tree hash of a TreeNode (ChiaLisp sha256tree1)
 */
export function sha256tree(node: TreeNode): Uint8Array {
  if (isAtom(node)) {
    // For atoms, hash: 0x01 + atom_bytes
    const atomBytes = atomToBytes(node);
    const data = new Uint8Array(1 + atomBytes.length);
    data[0] = 0x01;
    data.set(atomBytes, 1);
    return sha256(data);
  } else if (isList(node)) {
    if (node.items.length === 0) {
      // Empty list (nil) is hashed as 0x01
      return sha256(new Uint8Array([0x01]));
    }
    // For lists, convert to cons pairs and hash
    let result = sha256(new Uint8Array([0x01])); // nil
    for (let i = node.items.length - 1; i >= 0; i--) {
      const itemHash = sha256tree(node.items[i]);
      const pairData = new Uint8Array(1 + itemHash.length + result.length);
      pairData[0] = 0x02; // cons pair prefix
      pairData.set(itemHash, 1);
      pairData.set(result, 1 + itemHash.length);
      result = sha256(pairData);
    }
    return result;
  } else {
    // Cons pair: hash: 0x02 + hash(first) + hash(rest)
    const firstHash = sha256tree(node.first);
    const restHash = sha256tree(node.rest);
    const data = new Uint8Array(1 + firstHash.length + restHash.length);
    data[0] = 0x02;
    data.set(firstHash, 1);
    data.set(restHash, 1 + firstHash.length);
    return sha256(data);
  }
}

/**
 * Convert atom to bytes for hashing
 */
function atomToBytes(atom: Atom): Uint8Array {
  const value = atom.value;
  
  if (value === null) {
    return new Uint8Array(0); // nil is empty bytes
  }
  
  if (typeof value === 'number' || typeof value === 'bigint') {
    // Convert number to minimal byte representation
    if (value === 0 || value === 0n) {
      return new Uint8Array(0); // 0 is represented as empty bytes
    }
    
    const bigIntValue = BigInt(value);
    const isNegative = bigIntValue < 0n;
    const absValue = isNegative ? -bigIntValue : bigIntValue;
    
    // Convert to hex and then to bytes
    let hex = absValue.toString(16);
    if (hex.length % 2 !== 0) hex = '0' + hex;
    
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    
    // Handle two's complement for negative numbers
    if (isNegative) {
      // Invert all bits
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = ~bytes[i] & 0xff;
      }
      // Add 1
      let carry = 1;
      for (let i = bytes.length - 1; i >= 0 && carry > 0; i--) {
        const sum = bytes[i] + carry;
        bytes[i] = sum & 0xff;
        carry = sum >> 8;
      }
      // If we still have carry, we need to prepend 0xff
      if (carry > 0 || (bytes[0] & 0x80) === 0) {
        const newBytes = new Uint8Array(bytes.length + 1);
        newBytes[0] = 0xff;
        newBytes.set(bytes, 1);
        return newBytes;
      }
    } else {
      // For positive numbers, ensure high bit is not set (would indicate negative)
      if (bytes[0] & 0x80) {
        const newBytes = new Uint8Array(bytes.length + 1);
        newBytes[0] = 0x00;
        newBytes.set(bytes, 1);
        return newBytes;
      }
    }
    
    return bytes;
  }
  
  if (typeof value === 'string') {
    // Assume hex string
    const cleanHex = value.startsWith('0x') ? value.slice(2) : value;
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
    }
    return bytes;
  }
  
  if (value instanceof Uint8Array) {
    return value;
  }
  
  if (typeof value === 'boolean') {
    return value ? new Uint8Array([0x01]) : new Uint8Array(0);
  }
  
  throw new Error(`Cannot convert atom value to bytes: ${String(value)}`);
}

/**
 * Substitute variable references with actual values
 * @param node The node to substitute in
 * @param substitutions Map of variable names to their replacement values
 * @returns The node with substitutions applied
 */
export function substitute(node: TreeNode, substitutions: Map<string, TreeNode>): TreeNode {
  if (isAtom(node)) {
    // If it's a symbol (string atom) that needs substitution, replace it
    if (typeof node.value === 'string' && substitutions.has(node.value)) {
      return substitutions.get(node.value)!;
    }
    // Otherwise return as-is
    return node;
  }
  
  // For lists, recursively substitute in all items
  if (isList(node)) {
    let changed = false;
    const newItems = node.items.map(item => {
      const substituted = substitute(item, substitutions);
      if (substituted !== item) changed = true;
      return substituted;
    });
    
    // Only create a new list if something changed
    if (!changed) return node;
    
    return {
      type: 'list',
      items: newItems
    };
  }
  
  // For cons pairs, recursively substitute in both first and rest
  const first = substitute(node.first, substitutions);
  const rest = substitute(node.rest, substitutions);
  
  // Only create a new pair if something changed
  if (first === node.first && rest === node.rest) {
    return node;
  }
  
  return {
    type: 'cons',
    first,
    rest
  };
} 