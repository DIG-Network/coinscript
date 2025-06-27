/**
 * Cryptographic operators
 * 
 * Pure functional operators for cryptographic operations
 */

import { TreeNode } from '../core/types';
import { list } from '../core/builders';
import { SHA256, SHA256TREE, SHA256TREE1, IF, GTS, EQ, KECCAK256, COINID, SECP256K1_VERIFY, SECP256R1_VERIFY } from '../core/opcodes';

/**
 * SHA256 hash of concatenated atoms
 * (sha256 a b ...) -> hash
 */
export function sha256(...values: TreeNode[]): TreeNode {
  return list([SHA256, ...values]);
}

/**
 * SHA256 tree hash (Merkle tree)
 * (sha256tree value) -> tree hash
 */
export function sha256tree(value: TreeNode): TreeNode {
  return list([SHA256TREE, value]);
}

/**
 * SHA256 tree hash with 1 prepended (for atoms)
 * (sha256tree1 value) -> tree hash
 */
export function sha256tree1(value: TreeNode): TreeNode {
  return list([SHA256TREE1, value]);
}

/**
 * Keccak256 hash
 * (keccak256 a b ...) -> hash
 */
export function keccak256(...values: TreeNode[]): TreeNode {
  return list([KECCAK256, ...values]);
}

/**
 * Calculate coin ID
 * (coinid parent_id puzzle_hash amount) -> coin_id
 */
export function coinid(parentId: TreeNode, puzzleHash: TreeNode, amount: TreeNode): TreeNode {
  return list([COINID, parentId, puzzleHash, amount]);
}

/**
 * SECP256K1 signature verification
 * (secp256k1_verify pubkey message_hash signature) -> 0 or raise
 */
export function secp256k1Verify(pubkey: TreeNode, msgHash: TreeNode, signature: TreeNode): TreeNode {
  return list([SECP256K1_VERIFY, pubkey, msgHash, signature]);
}

/**
 * SECP256R1 signature verification
 * (secp256r1_verify pubkey message_hash signature) -> 0 or raise
 */
export function secp256r1Verify(pubkey: TreeNode, msgHash: TreeNode, signature: TreeNode): TreeNode {
  return list([SECP256R1_VERIFY, pubkey, msgHash, signature]);
}

/**
 * Create puzzle hash from puzzle
 * (puzzle-hash puzzle) -> hash
 */
export function puzzleHash(puzzle: TreeNode): TreeNode {
  return sha256tree(puzzle);
}

/**
 * Create coin announcement ID
 * (coin-announcement-id coin_id announcement) -> id
 */
export function coinAnnouncementId(coinId: TreeNode, announcement: TreeNode): TreeNode {
  return sha256(coinId, announcement);
}

/**
 * Create puzzle announcement ID
 * (puzzle-announcement-id puzzle_hash announcement) -> id
 */
export function puzzleAnnouncementId(puzzleHash: TreeNode, announcement: TreeNode): TreeNode {
  return sha256(puzzleHash, announcement);
}

/**
 * Hash a list of values with separator
 * (hash-with-sep sep v1 v2 ...) -> hash
 */
export function hashWithSeparator(separator: TreeNode, ...values: TreeNode[]): TreeNode {
  if (values.length === 0) {
    return sha256();
  }
  
  const parts: TreeNode[] = [];
  values.forEach((v, i) => {
    if (i > 0) {
      parts.push(separator);
    }
    parts.push(v);
  });
  
  return sha256(...parts);
}

/**
 * Create a Merkle proof verification
 * (verify-merkle-proof leaf proof root) -> true or false
 */
export function verifyMerkleProof(leaf: TreeNode, proof: TreeNode[], root: TreeNode): TreeNode {
  let current = sha256tree1(leaf);
  
  for (const sibling of proof) {
    // Combine with sibling based on ordering
    current = list([
      IF,
      list([GTS, current, sibling]),
      sha256tree(list([sibling, current])),
      sha256tree(list([current, sibling]))
    ]);
  }
  
  return list([EQ, current, root]);
} 