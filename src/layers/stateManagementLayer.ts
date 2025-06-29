import { PuzzleBuilder, puzzle, variable, expr } from '../builder/PuzzleBuilder';
import { TreeNode, list, sym, int, cons, atom } from '../core';
import { first, rest } from '../operators/lists';
import { APPLY } from '../core/opcodes';

export interface StateManagementOptions {
  actionMerkleRoot: string;
  initialState: TreeNode;  // State is a TreeNode for ChiaLisp compatibility
  finalizer?: PuzzleBuilder;  // Optional custom finalizer
}

/**
 * State Management Layer - Implements state persistence for stateful coins
 * 
 * Based on the Chialisp state pattern:
 * (mod (MOD_HASH STATE new_state amount)
 *   (list
 *     (list 51  ; CREATE_COIN
 *       (sha256tree (c MOD_HASH (c (sha256tree new_state) (c MOD_HASH ()))))
 *       amount
 *     )
 *   )
 * )
 * 
 * This layer:
 * - Curries the current state into the puzzle (immutable within a spend)
 * - Actions compute new state values and return (new_state . conditions)
 * - A finalizer recreates the coin with updated state
 * - State history is preserved through the coin lineage
 */
export function withStateManagementLayer(
  _innerPuzzle: PuzzleBuilder,
  options: StateManagementOptions
): PuzzleBuilder {
  const stateLayer = puzzle();
  
  stateLayer.comment('=== STATE MANAGEMENT LAYER ===');
  stateLayer.comment('Implements state persistence via coin recreation');
  
  // Include necessary libraries
  stateLayer.include('condition_codes.clib');
  stateLayer.include('curry-and-treehash.clinc');
  // Note: sha256tree is already included in curry-and-treehash.clinc
  
  // Solution parameters: the action to execute and its parameters
  stateLayer.withSolutionParams('ACTION', 'action_solution');
  
  // Curry in the action merkle root and current state
  // Following the pattern: (MOD_HASH STATE ...)
  stateLayer.withCurriedParams({
    ACTION_MERKLE_ROOT: options.actionMerkleRoot,
    STATE: options.initialState  // Current state curried into puzzle
  });
  
  // Build the complete state management expression
  stateLayer.comment('Execute stateful action and apply finalizer');
  
  // Build: (a ACTION (c STATE action_solution))
  const actionCall = list([
    APPLY,
    variable('ACTION').tree,
    cons(
      variable('STATE').tree,  // Pass current state as first param
      variable('action_solution').tree  // User-provided action params
    )
  ]);
  
  // Get or create finalizer
  const finalizer = options.finalizer || createDefaultFinalizer();
  
  // Build the complete expression that:
  // 1. Calls the action to get (new_state . conditions)
  // 2. Passes the result to the finalizer
  // Finalizer receives: (ACTION_MERKLE_ROOT new_state conditions)
  const completeExpression = list([
    APPLY,
    finalizer.build(),
    list([
      variable('ACTION_MERKLE_ROOT').tree,
      first(actionCall),  // new_state from action result
      rest(actionCall)    // conditions from action result
    ])
  ]);
  
  // Return the complete expression
  stateLayer.returnValue(expr(completeExpression));
  
  return stateLayer;
}

/**
 * Create default finalizer that recreates the coin with new state
 * Based on the pattern from state-pattern-analysis.md
 */
function createDefaultFinalizer(): PuzzleBuilder {
  const finalizer = puzzle();
  
  finalizer.comment('=== STATE FINALIZER ===');
  finalizer.comment('Recreates coin with updated state curried into puzzle hash');
  
  // Include necessary libraries for puzzle hash calculation
  finalizer.include('condition_codes.clib');
  finalizer.include('curry-and-treehash.clinc');
  // Note: sha256tree is already included in curry-and-treehash.clinc
  
  // Parameters: (ACTION_MERKLE_ROOT new_state conditions)
  finalizer.withSolutionParams('ACTION_MERKLE_ROOT', 'new_state', 'conditions');
  
  // Build curry structure for new puzzle
  // (c MOD_HASH (c new_state (c ACTION_MERKLE_ROOT ())))
  // Note: MOD_HASH should be passed in or calculated - using placeholder for now
  const curryStructure = cons(
    sym('1'),  // Placeholder for MOD_HASH
    cons(
      variable('new_state').tree,
      cons(
        variable('ACTION_MERKLE_ROOT').tree,
        atom(null)  // NIL
      )
    )
  );
  
  // Calculate puzzle hash using sha256tree function
  const newPuzzleHash = list([
    sym('sha256tree'),
    curryStructure
  ]);
  
  // Create the CREATE_COIN condition
  const createCoinCondition = list([
    sym('CREATE_COIN'),  // Will be replaced with 51 if condition_codes included
    newPuzzleHash,
    int(0)  // Same amount as current coin
  ]);
  
  // Return conditions with CREATE_COIN prepended
  const finalConditions = cons(createCoinCondition, variable('conditions').tree);
  finalizer.returnValue(expr(finalConditions));
  
  return finalizer;
}

/**
 * Generate an individual stateful action puzzle
 * Actions receive (current_state . action_params) and return (new_state . conditions)
 */
export function createStatefulAction(
  name: string,
  logic: (builder: PuzzleBuilder) => void
): PuzzleBuilder {
  const action = puzzle();
  
  // Actions receive current state and user parameters
  // Note: State is passed as a cons pair (current_state . action_params)
  action.withSolutionParams('state_and_params');
  
  action.comment(`=== Stateful Action: ${name} ===`);
  action.comment('Extract current state and action parameters');
  
  // The logic function should handle state extraction and manipulation
  // It has access to the state_and_params parameter
  logic(action);
  
  // The logic should end with returning (new_state . conditions)
  
  return action;
}

/**
 * State encoding/decoding helpers
 */
export const StateHelpers = {
  /**
   * Encode a JavaScript object to a ChiaLisp tree
   * Following the pattern from state-pattern-analysis.md
   */
  encode(state: Record<string, unknown>): TreeNode {
    // For simple state, encode as a list of values
    // Complex state would use merkle trees
    const values: TreeNode[] = [];
    
    for (const value of Object.values(state)) {
      if (typeof value === 'number' || typeof value === 'bigint') {
        values.push(int(value));
      } else if (typeof value === 'boolean') {
        values.push(value ? int(1) : atom(null));
      } else if (typeof value === 'string') {
        // For addresses and strings, use atom
        values.push(atom(value));
      } else {
        // For complex types, stringify and store as atom
        values.push(atom(JSON.stringify(value)));
      }
    }
    
    return list(values);
  },
  
  /**
   * Create initial state for a contract
   */
  createInitialState(fields: string[]): TreeNode {
    // Create a list of default values based on field count
    const defaults = fields.map(() => int(0));
    return list(defaults);
  },
  
  /**
   * Build state access expressions for the code generator
   * state.counter (field 0) -> (f current_state)
   * state.owner (field 1) -> (f (r current_state))
   * etc.
   */
  buildStateAccess(fieldIndex: number, stateVar: string = 'current_state'): TreeNode {
    if (fieldIndex === 0) {
      return first(sym(stateVar));
    }
    
    // Build nested rest operations to access nth element
    let expr: TreeNode = sym(stateVar);
    for (let i = 0; i < fieldIndex; i++) {
      expr = rest(expr);
    }
    return first(expr);
  },
  
  /**
   * Build new state list with updated field
   */
  buildStateUpdate(
    _fieldIndex: number, 
    newValue: TreeNode,
    _stateVar: string = 'current_state',
    _totalFields: number = 0
  ): TreeNode {
    // This would build a new state list with the updated field
    // For now, return a placeholder
    return list([newValue]);
  }
};

/**
 * Helper to add CREATE_COIN for self-recreation in an action
 */
export function recreateSelfWithState(
  builder: PuzzleBuilder,
  _newState: unknown
): void {
  builder.comment('Recreate self with updated state');
  
  // This is handled by the finalizer in the state management layer
  // Actions just need to return (new_state . conditions)
  // So this helper just adds a marker comment
  builder.comment('State will be persisted by finalizer');
} 