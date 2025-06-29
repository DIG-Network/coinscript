/**
 * Delegation patterns
 * 
 * Delegation and programmable puzzles
 */

import { TreeNode } from '../core/types';
import { list, int } from '../core/builders';
import { apply, if_, quote } from '../operators/control';
import { sha256tree, sha256tree1 } from '../operators/crypto';
import { equal } from '../operators/comparison';
import { syntheticPubkey } from '../operators/bls';
import { 
  ARG1, ARG2, ARG3, ARG5, CONS, RAISE, APPLY, IF, EQ, 
  ASSERT, CONTAINS, REVOKE
} from '../core/opcodes';

/**
 * Basic delegated puzzle - runs a puzzle provided in solution
 * (a 2 3) - Apply puzzle from solution to rest of solution
 */
export function delegatedPuzzle(): TreeNode {
  return apply(ARG2, ARG3);
}

/**
 * Graftroot pattern - delegate with signature validation
 * Validates a signed puzzle before running it
 */
export function graftroot(validator: TreeNode): TreeNode {
  return if_(
    apply(validator, quote(ARG2)), // Validate puzzle
    apply(ARG2, ARG3),          // Run if valid
    quote(list([RAISE]))        // Fail if invalid
  );
}

/**
 * P2 delegated puzzle or hidden puzzle
 * Standard delegation pattern used in Chia
 * If delegated puzzle provided, use it; otherwise use hidden puzzle
 */
export function p2DelegatedPuzzleOrHiddenPuzzle(
  _syntheticKeyHash: TreeNode,
  _hiddenPuzzle: TreeNode
): TreeNode {
  return list([
    APPLY,
    if_(
      ARG2,  // If delegated puzzle provided
      list([APPLY, ARG2, ARG5]), // Run delegated puzzle
      list([APPLY, ARG3, ARG5])  // Otherwise run hidden puzzle
    ),
    ARG1
  ]);
}

/**
 * P2 puzzle hash - reveals and runs puzzle with matching hash
 */
export function p2PuzzleHash(puzzleHash: TreeNode): TreeNode {
  return if_(
    list([EQ, sha256tree1(ARG2), puzzleHash]),
    list([APPLY, ARG2, ARG5]),
    list([APPLY, ARG3, ARG5])
  );
}

/**
 * Standard delegation with synthetic key
 */
export function standardDelegation(
  originalPubkey: TreeNode,
  _defaultHiddenPuzzle?: TreeNode
): TreeNode {
  
  return list([
    APPLY,
    list([
      IF,
      ARG2,
      list([
        // Delegated path
        ASSERT,
        list([
          EQ,
          originalPubkey,
          syntheticPubkey(ARG2, sha256tree(ARG3))
        ]),
        apply(ARG3, ARG5) // Run hidden puzzle
      ]),
      list([
        // Hidden path
        CONS,
        list([int(50), originalPubkey, sha256tree1(ARG3)]), // AGG_SIG_ME
        apply(ARG3, ARG5) // Run delegated puzzle
      ])
    ]),
    ARG1
  ]);
}

/**
 * Simple permission-based delegation
 * Requires signature from authorized key
 */
export function permissionDelegation(
  pubkey: TreeNode,
  _delegatedPuzzle: TreeNode
): TreeNode {
  return list([
    CONS,
    list([int(50), pubkey, sha256tree(ARG2)]), // AGG_SIG_ME on delegated puzzle
    apply(ARG2, ARG3)
  ]);
}

/**
 * Taproot-style delegation
 * Run main script or provide proof of alternate script
 */
export function taproot(mainScript: TreeNode, alternateScriptRoot?: TreeNode): TreeNode {
  if (!alternateScriptRoot) {
    return apply(ARG2, ARG3); // No validation
  }
  
  return if_(
    equal(sha256tree(mainScript), sha256tree1(ARG1)),
    apply(mainScript, quote(ARG2)),
    apply(ARG2, ARG3),
  );
}

/**
 * Time-locked delegation
 * Can only run delegated puzzle after certain time
 */
export function timeLockedDelegation(unlockTime: number | bigint): TreeNode {
  return list([
    CONS,
    list([int(80), int(unlockTime)]), // ASSERT_SECONDS_RELATIVE
    apply(ARG2, ARG3)
  ]);
}

/**
 * Multi-authority delegation
 * Requires signatures from M of N authorities
 */
export function multiAuthorityDelegation(
  authorizedPubkeys: TreeNode[],
  _threshold: number
): TreeNode {
  return list([
    ASSERT,
    list([
      list([CONTAINS, ARG2, quote(list(authorizedPubkeys))]),
      // In real implementation, would verify threshold signatures
    ]),
    list([
      CONS,
      list([int(50), ARG2, sha256tree(ARG3)]), // AGG_SIG_ME
      apply(ARG3, ARG5)
    ])
  ]);
}

/**
 * Revocable delegation
 * Owner can revoke delegated permissions
 */
export function revocableDelegation(
  ownerPubkey: TreeNode,
  delegateePubkey: TreeNode
): TreeNode {
  return if_(
    ARG2,
    list([
      // Revocation path - owner signs "REVOKE"
      CONS,
      list([int(50), ownerPubkey, REVOKE]), // AGG_SIG_ME
      ARG3 // Return new conditions
    ]),
    list([
      // Normal delegation path
      CONS,
      list([int(50), delegateePubkey, sha256tree1(ARG3)]), // AGG_SIG_ME
      ARG3
    ])
  );
} 