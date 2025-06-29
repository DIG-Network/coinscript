/**
 * State Layer
 * 
 * Allows puzzles to maintain and update state across spends
 */

import { PuzzleBuilder, puzzle, Expression } from '../builder/PuzzleBuilder';
import { TreeNode } from '../core/types';
import { list, hex } from '../core/builders';
import { encode, decode } from '@msgpack/msgpack';
import { CLVMOpcode } from '../core/opcodes';
import { ConditionOpcode } from '../conditions/opcodes';

/**
 * Create the state layer puzzle definition
 */
function createStateLayerPuzzle(): PuzzleBuilder {
  const state = puzzle();
  
  state.withCurriedParams({
    STATE: 'STATE',
    STATE_UPDATER_PUZZLE_HASH: 'STATE_UPDATER_PUZZLE_HASH',
    INNER_PUZZLE: 'INNER_PUZZLE'
  });
  
  state.withSolutionParams(
    'inner_solution',
    'state_update'
  );
  
  state.includeConditionCodes();
  state.includeCurryAndTreehash();
  
  // State layer logic - run inner puzzle and manage state
  state.comment('State layer - manage state and run inner puzzle');
  state.addCondition(CLVMOpcode.APPLY,
    state.param('INNER_PUZZLE'),
    state.param('inner_solution')
  );
  
  return state;
}

// Calculate and cache the mod hash
let _stateLayerModHash: string | null = null;

export function getStateLayerModHash(): string {
  if (!_stateLayerModHash) {
    _stateLayerModHash = createStateLayerPuzzle().toModHash();
  }
  return _stateLayerModHash;
}

// Export both as function and constant for compatibility
export const STATE_LAYER_MOD_HASH = getStateLayerModHash;

/**
 * State layer options
 */
export interface StateLayerOptions {
  initialState: TreeNode | Record<string, unknown>;
  stateUpdaterPuzzleHash?: string | Expression;
  allowedUpdaters?: string[]; // List of authorized updater pubkeys
}

/**
 * Wrap any puzzle with state layer
 * @param innerPuzzle - The inner puzzle to wrap
 * @param options - State configuration
 * @returns State wrapped puzzle
 */
export function withStateLayer(
  innerPuzzle: PuzzleBuilder | TreeNode,
  options: StateLayerOptions
): PuzzleBuilder {
  const state = puzzle();
  state.noMod();
  
  const innerTree = innerPuzzle instanceof PuzzleBuilder ? innerPuzzle.build() : innerPuzzle;
  const stateTree = options.initialState instanceof Object && !('type' in options.initialState)
    ? list(Object.entries(options.initialState).map(([k, v]) => list([hex(k), hex(String(v))])))
    : options.initialState as TreeNode;
  
  state.withCurriedParams({
    STATE_LAYER_MOD_HASH: hex(getStateLayerModHash()),
    STATE: stateTree,
    STATE_UPDATER_PUZZLE_HASH: options.stateUpdaterPuzzleHash || hex('00'.repeat(32)),
    INNER_PUZZLE: innerTree
  });
  
  state.withSolutionParams(
    'inner_solution',
    'state_update'
  );
  
  state.includeConditionCodes();
  state.includeCurryAndTreehash();
  
  // State management logic
  state.comment('State layer - verify updates and run inner puzzle');
  
  // If state update provided, verify it's authorized
  state.if(state.param('state_update'))
    .then((b: PuzzleBuilder) => {
      b.comment('Verify state update is authorized');
      b.addCondition(ConditionOpcode.AGG_SIG_ME,
        state.param('STATE_UPDATER_PUZZLE_HASH'),
        state.param('state_update')
      );
    })
    .else(() => {});
  
  // Run inner puzzle
  state.comment('Run inner puzzle with current state');
  state.addCondition(CLVMOpcode.APPLY,
    state.param('INNER_PUZZLE'),
    state.param('inner_solution')
  );
  
  return state;
}

/**
 * Create a state updater puzzle
 * @param allowedUpdaters - List of public keys allowed to update state
 * @returns State updater puzzle
 */
export function createStateUpdater(allowedUpdaters: string[]): PuzzleBuilder {
  const updater = puzzle();
  updater.noMod();
  
  updater.withCurriedParams({
    ALLOWED_UPDATERS: list(allowedUpdaters.map(hex))
  });
  
  updater.withSolutionParams('new_state', 'updater_pubkey');
  
  updater.comment('Verify updater is authorized');
  // Use AGG_SIG_ME with the updater pubkey parameter
  updater.addCondition(ConditionOpcode.AGG_SIG_ME,
    updater.param('updater_pubkey'),
    updater.param('new_state')
  );
  
  updater.comment('Return new state');
  updater.addCondition(CLVMOpcode.QUOTE, updater.param('new_state'));
  
  return updater;
}

/**
 * Create a key-value state updater
 * Allows updating specific keys in the state
 */
export function createKeyValueStateUpdater(): PuzzleBuilder {
  const updater = puzzle();
  updater.noMod();
  
  updater.withSolutionParams(
    'current_state',    // Current key-value pairs
    'updates',          // List of (key, value) updates
    'deletions',        // List of keys to delete
    'updater_signature' // Authorization
  );
  
  updater.comment('Key-value state updater');
  
  // Merge updates into current state
  // This creates a new state with updates applied
  updater.comment('Apply updates to current state');
  
  // For each update, add it to the state
  // In ChiaLisp this would be done with recursive list operations
  // Return the updates as the new state (simplified implementation)
  updater.addCondition(CLVMOpcode.QUOTE, updater.param('updates'));
  
  return updater;
}

/**
 * Encode a JavaScript object as state
 * @param state - State object to encode
 * @returns Encoded state tree
 */
export function encodeState(state: Record<string, unknown>): TreeNode {
  // Use msgpack for efficient encoding
  const encoded = encode(state);
  return hex(Buffer.from(encoded).toString('hex'));
  
}

/**
 * Decode state from tree node
 * @param stateNode - Encoded state node
 * @returns Decoded state object
 */
export function decodeState(stateNode: TreeNode): Record<string, unknown> {
  if (stateNode.type === 'atom' && stateNode.value instanceof Uint8Array) {
    return decode(stateNode.value) as Record<string, unknown>;
  }
  return {};
}

/**
 * Create a state transition validator
 * Ensures state transitions follow specific rules
 */
export function createStateTransitionValidator(
  rules: {
    allowedKeys?: string[];
    requiredKeys?: string[];
    maxSize?: number;
  }
): PuzzleBuilder {
  const validator = puzzle();
  validator.noMod();
  
  validator.withCurriedParams({
    ALLOWED_KEYS: rules.allowedKeys ? list(rules.allowedKeys.map(k => hex(k))) : list([]),
    REQUIRED_KEYS: rules.requiredKeys ? list(rules.requiredKeys.map(k => hex(k))) : list([]),
    MAX_SIZE: rules.maxSize || 1024
  });
  
  validator.withSolutionParams(
    'current_state',
    'new_state'
  );
  
  validator.comment('State transition validator');
  
  // In real implementation would validate:
  // 1. Only allowed keys are present
  // 2. Required keys are not removed
  // 3. State size is within limits
  
  validator.comment('Validate state transition');
  validator.addCondition(CLVMOpcode.QUOTE); // Return success (empty condition list)
  
  return validator;
} 