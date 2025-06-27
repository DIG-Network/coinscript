/**
 * BLS12-381 operators
 * 
 * Pure functional operators for BLS cryptographic operations
 */

import { TreeNode } from '../core/types';
import { list, sym } from '../core/builders';
import { PUBKEY_FOR_EXP, G1_ADD, G1_SUBTRACT, G1_MULTIPLY, G1_NEGATE, BLS_VERIFY, SHA256, ALL, NIL, MULTISIG_PUBKEY } from '../core/opcodes';

/**
 * Map exponent to G1 point (secret key to public key)
 * (pubkey_for_exp exponent) -> public_key
 */
export function pubkeyForExp(exponent: TreeNode): TreeNode {
  return list([PUBKEY_FOR_EXP, exponent]);
}

/**
 * Add G1 points (public keys)
 * (g1_add p1 p2 ...) -> sum
 */
export function g1Add(...points: TreeNode[]): TreeNode {
  return list([G1_ADD, ...points]);
}

/**
 * Subtract G1 points
 * (g1_subtract base p1 p2 ...) -> base - p1 - p2 - ...
 */
export function g1Subtract(base: TreeNode, ...points: TreeNode[]): TreeNode {
  return list([G1_SUBTRACT, base, ...points]);
}

/**
 * Multiply G1 point by scalar
 * (g1_multiply point scalar) -> point * scalar
 */
export function g1Multiply(point: TreeNode, scalar: TreeNode): TreeNode {
  return list([G1_MULTIPLY, point, scalar]);
}

/**
 * Negate G1 point
 * (g1_negate point) -> -point
 */
export function g1Negate(point: TreeNode): TreeNode {
  return list([G1_NEGATE, point]);
}

/**
 * BLS signature verification
 * (bls_verify signature pubkey message) -> 0 or raise
 */
export function blsVerify(signature: TreeNode, pubkey: TreeNode, message: TreeNode): TreeNode {
  return list([BLS_VERIFY, signature, pubkey, message]);
}

/**
 * Aggregate public keys
 * (aggregate-pubkeys keys) -> aggregated key
 */
export function aggregatePubkeys(keys: TreeNode[]): TreeNode {
  if (keys.length === 0) {
    return NIL; // nil/zero point
  }
  if (keys.length === 1) {
    return keys[0];
  }
  return g1Add(...keys);
}

/**
 * Create synthetic public key (for p2_delegated_puzzle_or_hidden_puzzle)
 * (synthetic-pubkey original-pubkey hidden-puzzle-hash) -> synthetic key
 */
export function syntheticPubkey(originalPubkey: TreeNode, hiddenPuzzleHash: TreeNode): TreeNode {
  return g1Add(
    originalPubkey,
    pubkeyForExp(list([SHA256, originalPubkey, hiddenPuzzleHash]))
  );
}

/**
 * Calculate synthetic offset
 * (synthetic-offset original-pubkey hidden-puzzle-hash) -> offset
 */
export function syntheticOffset(originalPubkey: TreeNode, hiddenPuzzleHash: TreeNode): TreeNode {
  return pubkeyForExp(list([SHA256, originalPubkey, hiddenPuzzleHash]));
}

/**
 * Multi-signature combination
 * (multisig-combine pubkeys m) -> combined pubkey for m-of-n
 */
export function multisigCombine(pubkeys: TreeNode[], m: number): TreeNode {
  // In practice, this would be more complex with threshold signatures
  // This is a simplified version
  return list([
    MULTISIG_PUBKEY,
    list(pubkeys),
    sym(m.toString())
  ]);
}

/**
 * Verify aggregate signature
 * (verify-aggregate-sig pairs signature) -> true or raise
 * pairs: ((pubkey1 . message1) (pubkey2 . message2) ...)
 */
export function verifyAggregateSig(pairs: Array<[TreeNode, TreeNode]>, signature: TreeNode): TreeNode {
  const checks = pairs.map(([pubkey, message]) => 
    blsVerify(signature, pubkey, message)
  );
  
  return list([ALL, ...checks]);
} 