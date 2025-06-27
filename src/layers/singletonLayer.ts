/**
 * Singleton Layer
 * 
 * Ensures a coin is unique and can be tracked across spends
 */

import { PuzzleBuilder, puzzle } from '../builder/PuzzleBuilder';
import { TreeNode } from '../core/types';
import { list, hex, atom } from '../core/builders';
import { curry } from '../core/curry';
import { 
  loadChialispPuzzle,
  createChialispPuzzle,
  STANDARD_MOD_HASHES 
} from '../chialisp/puzzleLibrary';

// Get actual mod hashes from standard puzzles
export const SINGLETON_TOP_LAYER_MOD_HASH = () => STANDARD_MOD_HASHES.SINGLETON_TOP_LAYER_V1_1;
export const SINGLETON_LAUNCHER_MOD_HASH = () => STANDARD_MOD_HASHES.SINGLETON_LAUNCHER;

/**
 * Wrap any puzzle with singleton layer
 * @param innerPuzzle - The inner puzzle to wrap
 * @param launcherId - The launcher coin ID that created this singleton
 * @returns Singleton wrapped puzzle
 */
export function withSingletonLayer(
  innerPuzzle: PuzzleBuilder | TreeNode,
  launcherId: string
): PuzzleBuilder {
  
  const innerTree = innerPuzzle instanceof PuzzleBuilder ? innerPuzzle.build() : innerPuzzle;
  
  // Load the actual singleton top layer puzzle
  const singletonPuzzle = loadChialispPuzzle('SINGLETON_TOP_LAYER_V1_1');
  
  // Create singleton structure as per Chia implementation
  // Structure: (MOD_HASH . (LAUNCHER_ID . LAUNCHER_PUZZLE_HASH))
  const singletonStruct = list([
    hex(SINGLETON_TOP_LAYER_MOD_HASH()),
    list([
      hex(launcherId),
      hex(SINGLETON_LAUNCHER_MOD_HASH())
    ])
  ]);
  
  // Create a properly curried puzzle using the curry function
  // This maintains the structure (a (q . puzzle) (c (q . param1) (c (q . param2) 1)))
  const curriedPuzzle = curry(
    singletonPuzzle.ast,
    singletonStruct,
    innerTree
  );
  
  // Create a new PuzzleBuilder with the curried puzzle
  const result = puzzle();
  result.withMod(curriedPuzzle);
  
  // Set solution parameters matching the actual singleton puzzle
  result.withSolutionParams(
    'lineage_proof',     // (parent_info parent_inner_puzzle_hash parent_amount)
    'my_amount',         // Current coin amount (must be odd)
    'inner_solution'     // Solution for the inner puzzle
  );
  
  result.comment('Singleton layer (using standard singleton_top_layer_v1_1.clsp)');
  
  return result;
}

/**
 * Create a singleton launcher puzzle
 * @param singletonPuzzleHash - The puzzle hash of the singleton to launch
 * @param amount - The amount for the singleton (must be odd)
 * @returns Launcher puzzle that creates the initial singleton
 */
export function createSingletonLauncher(
  _singletonPuzzleHash: string | Uint8Array,
  _amount: number | bigint
): PuzzleBuilder {
  // Use createChialispPuzzle to get a PuzzleBuilder with the launcher puzzle
  const launcher = createChialispPuzzle('SINGLETON_LAUNCHER');
  
  // The singleton launcher expects these solution parameters:
  launcher.withSolutionParams(
    'singleton_puzzle_hash',  // The puzzle hash of the singleton we're launching
    'amount',                 // Amount for the singleton (must be odd)
    'key_value_list'         // Additional conditions as key-value pairs
  );
  
  launcher.comment('Singleton launcher (using standard singleton_launcher.clsp)');
  
  return launcher;
}

/**
 * Helper to create singleton structure
 * @param launcherId - The launcher coin ID
 * @returns The singleton struct for currying
 */
export function createSingletonStruct(launcherId: string): TreeNode {
  return list([
    hex(SINGLETON_TOP_LAYER_MOD_HASH()),
    list([
      hex(launcherId),
      hex(SINGLETON_LAUNCHER_MOD_HASH())
    ])
  ]);
}

/**
 * Helper to calculate singleton puzzle hash
 * @param innerPuzzleHash - The inner puzzle hash
 * @param launcherId - The launcher coin ID
 * @returns The singleton puzzle hash
 */
export function calculateSingletonPuzzleHash(
  innerPuzzleHash: string | Uint8Array,
  launcherId: string | Uint8Array
): string {
  // This would calculate the actual puzzle hash
  // In production, this would use sha256tree to calculate the actual hash
  const innerHashStr = typeof innerPuzzleHash === 'string' ? innerPuzzleHash : '0x' + Buffer.from(innerPuzzleHash).toString('hex');
  const launcherIdStr = typeof launcherId === 'string' ? launcherId : '0x' + Buffer.from(launcherId).toString('hex');
  
  // For now, return a deterministic placeholder based on inputs
  return `0x${innerHashStr.slice(2, 10)}${launcherIdStr.slice(2, 10)}${'0'.repeat(48)}`;
}

/**
 * Create a singleton template puzzle (uncurried)
 * This shows the structure with SINGLETON_STRUCT and INNER_PUZZLE as parameters
 * @returns Singleton template puzzle
 */
export function createSingletonTemplate(): PuzzleBuilder {
  // Load the actual singleton top layer puzzle
  const singletonPuzzle = loadChialispPuzzle('SINGLETON_TOP_LAYER_V1_1');
  
  // Create a new PuzzleBuilder with the template
  const result = puzzle();
  result.withMod(singletonPuzzle.ast);
  
  // Add curried parameters that will be shown as placeholders
  result.withCurriedParams({
    'SINGLETON_STRUCT': 'SINGLETON_STRUCT',
    'INNER_PUZZLE': 'INNER_PUZZLE'
  });
  
  // Set solution parameters matching the actual singleton puzzle
  result.withSolutionParams(
    'lineage_proof',     // (parent_info parent_inner_puzzle_hash parent_amount)
    'my_amount',         // Current coin amount (must be odd)
    'inner_solution'     // Solution for the inner puzzle
  );
  
  result.comment('Singleton template (uncurried)');
  
  return result;
}

/**
 * Create a lineage proof for eve (first) spend
 * @param parentCoinInfo - The parent coin info (launcher coin)
 * @param amount - The amount from the launcher
 * @returns Eve lineage proof
 */
export function createEveLineageProof(
  parentCoinInfo: string | Uint8Array,
  amount: number | bigint
): TreeNode {
  // Eve proof format: (parent_coin_info amount)
  return list([
    typeof parentCoinInfo === 'string' ? hex(parentCoinInfo) : atom(parentCoinInfo),
    atom(amount)
  ]);
}

/**
 * Create a lineage proof for non-eve spends
 * @param parentCoinInfo - The parent coin info
 * @param parentInnerPuzzleHash - The parent's inner puzzle hash
 * @param parentAmount - The parent's amount
 * @returns Standard lineage proof
 */
export function createLineageProof(
  parentCoinInfo: string | Uint8Array,
  parentInnerPuzzleHash: string | Uint8Array,
  parentAmount: number | bigint
): TreeNode {
  // Standard proof format: (parent_coin_info parent_inner_puzzle_hash parent_amount)
  return list([
    typeof parentCoinInfo === 'string' ? hex(parentCoinInfo) : atom(parentCoinInfo),
    typeof parentInnerPuzzleHash === 'string' ? hex(parentInnerPuzzleHash) : atom(parentInnerPuzzleHash),
    atom(parentAmount)
  ]);
} 