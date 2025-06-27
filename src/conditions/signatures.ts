/**
 * Signature conditions
 * 
 * Conditions related to signature verification
 */

import { TreeNode } from '../core/types';
import { list, int, hex } from '../core/builders';
import { ConditionOpcode } from './opcodes';

/**
 * Type aliases
 */
export type PublicKey = Uint8Array | string;
export type Message = Uint8Array | string;

/**
 * Convert public key to tree node
 */
function toPubkeyNode(value: PublicKey): TreeNode {
  if (typeof value === 'string') {
    return hex(value);
  }
  return hex(Array.from(value).map(b => b.toString(16).padStart(2, '0')).join(''));
}

/**
 * Convert message to tree node
 */
function toMessageNode(value: Message): TreeNode {
  if (typeof value === 'string') {
    // If it's a hex string, use it as hex
    if (value.startsWith('0x') || /^[0-9a-fA-F]+$/.test(value)) {
      return hex(value);
    }
    // Otherwise treat as UTF-8 string
    const encoder = new TextEncoder();
    const bytes = encoder.encode(value);
    return hex(Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(''));
  }
  return hex(Array.from(value).map(b => b.toString(16).padStart(2, '0')).join(''));
}

/**
 * AGG_SIG_UNSAFE - Require signature (unsafe - no coin ID prepended)
 * (49 pubkey message)
 */
export function aggSigUnsafe(publicKey: PublicKey, message: Message): TreeNode {
  return list([
    int(ConditionOpcode.AGG_SIG_UNSAFE),
    toPubkeyNode(publicKey),
    toMessageNode(message)
  ]);
}

/**
 * AGG_SIG_ME - Require signature with coin ID prepended to message
 * (50 pubkey message)
 */
export function aggSigMe(publicKey: PublicKey, message: Message): TreeNode {
  return list([
    int(ConditionOpcode.AGG_SIG_ME),
    toPubkeyNode(publicKey),
    toMessageNode(message)
  ]);
}

/**
 * Helper to create multiple signature conditions
 */
export function multiSig(signatures: Array<{ publicKey: PublicKey; message: Message; safe?: boolean }>): TreeNode[] {
  return signatures.map(({ publicKey, message, safe = true }) => 
    safe ? aggSigMe(publicKey, message) : aggSigUnsafe(publicKey, message)
  );
}

/**
 * Helper for standard wallet signature
 */
export function walletSignature(publicKey: PublicKey): TreeNode {
  // Standard pattern: sign the delegated puzzle/conditions tree hash
  return aggSigMe(publicKey, 'sha256tree1(@)');
}

/**
 * Helper for announcement signature
 */
export function announcementSignature(publicKey: PublicKey, announcementId: string): TreeNode {
  return aggSigMe(publicKey, announcementId);
}

/**
 * Helper for message signing (not coin-specific)
 */
export function messageSignature(publicKey: PublicKey, message: string): TreeNode {
  return aggSigUnsafe(publicKey, message);
}

/**
 * Helper for threshold signatures (m-of-n)
 * Note: This creates conditions, actual threshold logic needs BLS aggregation
 */
export function thresholdSignatures(
  publicKeys: PublicKey[],
  message: Message,
  requiredCount: number
): TreeNode[] {
  // In practice, you'd aggregate signatures off-chain
  // This just shows the pattern
  return publicKeys.slice(0, requiredCount).map(pk => aggSigMe(pk, message));
}

/**
 * Helper for delegated signing (sign a delegated puzzle hash)
 */
export function delegatedSignature(publicKey: PublicKey, delegatedPuzzleHash: string): TreeNode {
  return aggSigMe(publicKey, delegatedPuzzleHash);
} 