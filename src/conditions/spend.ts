/**
 * Spend conditions
 * 
 * Conditions related to coin creation and spending
 */

import { TreeNode } from '../core/types';
import { list, int, hex } from '../core/builders';
import { ConditionOpcode } from './opcodes';

/**
 * Type aliases for better documentation
 */
export type PuzzleHash = Uint8Array | string;
export type CoinId = Uint8Array | string;
export type Amount = number | bigint;

/**
 * Convert puzzle hash or coin ID to tree node
 */
function toHashNode(value: PuzzleHash | CoinId): TreeNode {
  if (typeof value === 'string') {
    return hex(value);
  }
  return hex(Array.from(value).map(b => b.toString(16).padStart(2, '0')).join(''));
}

/**
 * Convert amount to tree node
 */
function toAmountNode(value: Amount): TreeNode {
  return int(value);
}

/**
 * CREATE_COIN - Create a new coin
 * (51 puzzle_hash amount [hint])
 */
export function createCoin(puzzleHash: PuzzleHash, amount: Amount, hint?: PuzzleHash): TreeNode {
  const args = [toHashNode(puzzleHash), toAmountNode(amount)];
  if (hint !== undefined) {
    args.push(toHashNode(hint));
  }
  return list([int(ConditionOpcode.CREATE_COIN), ...args]);
}

/**
 * RESERVE_FEE - Reserve amount for fees
 * (52 amount)
 */
export function reserveFee(amount: Amount): TreeNode {
  return list([int(ConditionOpcode.RESERVE_FEE), toAmountNode(amount)]);
}

/**
 * ASSERT_MY_COIN_ID - Assert this coin's ID
 * (70 coin_id)
 */
export function assertMyCoinId(coinId: CoinId): TreeNode {
  return list([int(ConditionOpcode.ASSERT_MY_COIN_ID), toHashNode(coinId)]);
}

/**
 * ASSERT_MY_PARENT_ID - Assert this coin's parent ID
 * (71 parent_id)
 */
export function assertMyParentId(parentId: CoinId): TreeNode {
  return list([int(ConditionOpcode.ASSERT_MY_PARENT_ID), toHashNode(parentId)]);
}

/**
 * ASSERT_MY_PUZZLEHASH - Assert this coin's puzzle hash
 * (72 puzzle_hash)
 */
export function assertMyPuzzleHash(puzzleHash: PuzzleHash): TreeNode {
  return list([int(ConditionOpcode.ASSERT_MY_PUZZLEHASH), toHashNode(puzzleHash)]);
}

/**
 * ASSERT_MY_AMOUNT - Assert this coin's amount
 * (73 amount)
 */
export function assertMyAmount(amount: Amount): TreeNode {
  return list([int(ConditionOpcode.ASSERT_MY_AMOUNT), toAmountNode(amount)]);
}

/**
 * ASSERT_CONCURRENT_SPEND - Require another coin to be spent
 * (64 coin_id)
 */
export function assertConcurrentSpend(coinId: CoinId): TreeNode {
  return list([int(ConditionOpcode.ASSERT_CONCURRENT_SPEND), toHashNode(coinId)]);
}

/**
 * ASSERT_CONCURRENT_PUZZLE - Require coin with puzzle hash to be spent
 * (65 puzzle_hash)
 */
export function assertConcurrentPuzzle(puzzleHash: PuzzleHash): TreeNode {
  return list([int(ConditionOpcode.ASSERT_CONCURRENT_PUZZLE), toHashNode(puzzleHash)]);
}

/**
 * Helper to create multiple coin outputs
 */
export function createCoins(outputs: Array<{ puzzleHash: PuzzleHash; amount: Amount; hint?: PuzzleHash }>): TreeNode[] {
  return outputs.map(({ puzzleHash, amount, hint }) => createCoin(puzzleHash, amount, hint));
}

/**
 * Helper to create a coin with memos
 */
export function createCoinWithMemos(
  puzzleHash: PuzzleHash, 
  amount: Amount, 
  memos: string[]
): TreeNode {
  // Memos are typically encoded in the hint
  const memoHint = memos.length > 0 ? memos.join('') : undefined;
  return createCoin(puzzleHash, amount, memoHint);
} 