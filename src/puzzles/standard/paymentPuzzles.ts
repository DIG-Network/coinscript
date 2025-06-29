/**
 * Standard Payment Puzzles
 * 
 * Basic payment and authentication patterns
 */

import { PuzzleBuilder, puzzle } from '../../builder/PuzzleBuilder';

/**
 * Pay to conditions - executes conditions from solution
 * This is the simplest puzzle that just runs whatever conditions are passed
 */
export function payToConditions(): PuzzleBuilder {
  return puzzle()
    .noMod()
    .payToConditions();
}

/**
 * Pay to public key - requires signature from specified key
 * @param pubkey - Public key that must sign to spend
 */
export function payToPublicKey(pubkey: string | Uint8Array): PuzzleBuilder {
  return puzzle()
    .withCurriedParams({ PUBKEY: pubkey })
    .withSolutionParams('conditions')
    .requireSignature(pubkey)
    .returnConditions();
}

/**
 * Pay to delegated puzzle - runs a puzzle provided in the solution
 * The spender provides both the puzzle and its solution
 */
export function payToDelegatedPuzzle(): PuzzleBuilder {
  return puzzle()
    .withSolutionParams('delegated_puzzle', 'delegated_solution')
    .delegatedPuzzle();
}

/**
 * Pay to conditions with signature
 * Combines signature requirement with arbitrary conditions
 * @param pubkey - Public key that must sign
 */
export function payToConditionsWithSig(pubkey: string | Uint8Array): PuzzleBuilder {
  return puzzle()
    .withCurriedParams({ PUBKEY: pubkey })
    .withSolutionParams('conditions')
    .requireSignature(pubkey)
    .returnConditions();
}

/**
 * Create a multi-signature puzzle
 * @param pubkeys - Array of public keys
 * @param threshold - Number of signatures required
 */
export function multiSig(pubkeys: (string | Uint8Array)[], threshold: number): PuzzleBuilder {
  const builder = puzzle()
    .withCurriedParams({ THRESHOLD: threshold })
    .withSolutionParams('conditions', 'signatures');
  
  // Add public keys as curried params
  pubkeys.forEach((pubkey, index) => {
    builder.withCurriedParams({ [`PUBKEY_${index}`]: pubkey });
  });
  
  // In real implementation, this would verify threshold signatures
  // For now, just require all signatures
  pubkeys.forEach(pubkey => {
    builder.requireSignature(pubkey);
  });
  
  return builder.returnConditions();
} 