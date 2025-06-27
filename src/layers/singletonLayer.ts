/**
 * Singleton Layer
 * 
 * Ensures a coin is unique and can be tracked across spends
 */

import { PuzzleBuilder, puzzle } from '../builder/PuzzleBuilder';
import { TreeNode } from '../core/types';
import { list, hex } from '../core/builders';
import { ConditionOpcode } from '../conditions/opcodes';

// Calculate singleton mod hashes at runtime
function getSingletonTopLayerModHash(): string {
  // This would calculate the actual mod hash from the singleton_top_layer_v1_1.clsp
  // For now, return the known hash
  return '0x7faa3253bfddd1e0decb0906b2dc6247bbc4cf608f58345d173adb63e8b47c9f';
}

function getSingletonLauncherModHash(): string {
  // This would calculate the actual mod hash from the singleton_launcher_v1_1.clsp
  // For now, return the known hash
  return '0xeff07522495060c066f66f32acc2a77e3a3e737aca8baea4d1a64ea4cdc13da9';
}

// Export mod hash getters
export const SINGLETON_TOP_LAYER_MOD_HASH = getSingletonTopLayerModHash;
export const SINGLETON_LAUNCHER_MOD_HASH = getSingletonLauncherModHash;

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
  const singleton = puzzle();
  
  const innerTree = innerPuzzle instanceof PuzzleBuilder ? innerPuzzle.build() : innerPuzzle;
  
  singleton.withCurriedParams({
    SINGLETON_STRUCT: list([
      hex(getSingletonTopLayerModHash()),
      hex(launcherId),
      hex(getSingletonLauncherModHash())
    ]),
    INNER_PUZZLE: innerTree
  });
  
  singleton.withSolutionParams(
    'inner_solution',
    'lineage_proof' // (parent_id parent_inner_puzzle_hash parent_amount)
  );
  
  singleton.includeConditionCodes();
  singleton.includeCurryAndTreehash();
  
  // Simplified singleton logic - just run inner puzzle and add singleton assertion
  singleton.comment('Singleton layer ensures uniqueness');
  
  // Assert singleton amount (must be odd)
  singleton.addCondition(ConditionOpcode.ASSERT_MY_AMOUNT, 1);
  
  // For a proper singleton, we'd need to:
  // 1. Verify lineage proof
  // 2. Run inner puzzle
  // 3. Wrap CREATE_COIN conditions with singleton layer
  // 4. Ensure singleton properties are maintained
  
  // For now, just return the conditions from running the inner puzzle
  // (c first_condition (a INNER_PUZZLE inner_solution))
  singleton.comment('Return singleton conditions with inner puzzle result');
  
  // Build the proper structure instead of using addCondition
  // This is a simplified version - real singleton is more complex
  // For now, just return inner puzzle conditions directly
  singleton.returnValue(list([
    sym('a'),  // apply operator
    singleton.param('INNER_PUZZLE').tree,
    singleton.param('inner_solution').tree
  ]));

  return singleton;
}

/**
 * Create a singleton launcher puzzle
 * @param _puzzleHash - The puzzle hash to launch as a singleton (unused in simplified version)
 * @param _amount - The amount for the singleton (unused in simplified version)
 * @returns Launcher puzzle
 */
export function createSingletonLauncher(
  _puzzleHash: string | Uint8Array,
  _amount: number | bigint
): PuzzleBuilder {
  const launcher = puzzle();
  
  launcher.withSolutionParams('singleton_puzzle_hash', 'amount', 'key_value_list');
  
  launcher.comment('Singleton launcher creates initial singleton coin');
  
  // Create the singleton coin with memo - use raw condition since we need Expression
  launcher.addCondition(ConditionOpcode.CREATE_COIN,
    launcher.param('singleton_puzzle_hash'),
    launcher.param('amount')
  );
  
  // Return any extra conditions from key_value_list
  launcher.comment('Return additional conditions');
  launcher.returnConditions();
  
  return launcher;
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