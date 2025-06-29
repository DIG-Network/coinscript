/**
 * Action Layer
 * 
 * Provides a composable action system for puzzles
 */

import { PuzzleBuilder, puzzle } from '../builder/PuzzleBuilder';
import { TreeNode } from '../core/types';
import { list, hex, int } from '../core/builders';
import { MerkleTree } from 'merkletreejs';
import { sha256 } from '@noble/hashes/sha256';
import { CLVMOpcode } from '../core/opcodes';

/**
 * Registry interface for action-based systems
 */
export interface Registry {
  state: Record<string, unknown>;
  constants: Record<string, unknown>;
}

/**
 * Action interface that defines how actions interact with registries
 */
export interface Action<R extends Registry> {
  fromConstants(constants: R['constants']): this;
  curryTreeHash(): string;
  constructPuzzle(builder: PuzzleBuilder): PuzzleBuilder;
  spend(registry: R, params: Record<string, unknown>): SpendResult;
}

/**
 * Result of spending an action
 */
export interface SpendResult {
  conditions?: TreeNode;
  newState?: Record<string, unknown>;
  slots?: unknown[];
}

/**
 * Finalizer types for action layer
 */
export type Finalizer = 
  | { type: 'default'; hint: string }
  | { type: 'reserve'; reserveFullPuzzleHash: string; reserveInnerPuzzleHash: string; reserveAmountProgram: TreeNode; hint: string };

/**
 * Action layer configuration
 */
export interface ActionLayerConfig {
  merkleRoot: string;
  state: Record<string, unknown>;
  finalizer: Finalizer;
}

/**
 * Action layer solution
 */
export interface ActionLayerSolution {
  proofs: MerkleProof[];
  actionSpends: ActionSpend[];
  finalizerSolution: TreeNode;
}

/**
 * A single action spend
 */
export interface ActionSpend {
  puzzle: TreeNode;
  solution: TreeNode;
}

/**
 * Merkle proof for action verification
 */
export interface MerkleProof {
  path: string[];
  index: number;
}

/**
 * Create the action layer puzzle definition
 */
function createActionLayerPuzzle(): PuzzleBuilder {
  const actionLayer = puzzle();
  
  actionLayer.withCurriedParams({
    FINALIZER: 'FINALIZER',
    MERKLE_ROOT: 'MERKLE_ROOT',
    STATE: 'STATE'
  });
  
  actionLayer.withSolutionParams(
    'proofs',
    'action_spends',
    'finalizer_solution'
  );
  
  actionLayer.includeConditionCodes();
  actionLayer.includeCurryAndTreehash();
  
  actionLayer.comment('Action layer - execute actions and update state');
  
  // Verify merkle proofs for each action
  actionLayer.comment('Verify action merkle proofs');
  
  // Execute each action with current state
  actionLayer.comment('Execute actions sequentially');
  
  // Return conditions from actions
  actionLayer.returnConditions();
  
  return actionLayer;
}

// Calculate and cache the mod hash
let _actionLayerModHash: string | null = null;

export function getActionLayerModHash(): string {
  if (!_actionLayerModHash) {
    _actionLayerModHash = createActionLayerPuzzle().toModHash();
  }
  return _actionLayerModHash;
}

/**
 * Create an action layer
 * @param config - Action layer configuration
 * @returns Action layer puzzle
 */
export function withActionLayer(config: ActionLayerConfig): PuzzleBuilder {
  const layer = puzzle();
  layer.noMod();
  
  // Create finalizer based on type
  const finalizer = createFinalizer(config.finalizer);
  
  layer.withCurriedParams({
    ACTION_LAYER_MOD_HASH: hex(getActionLayerModHash()),
    FINALIZER: finalizer.build(),
    MERKLE_ROOT: config.merkleRoot,
    STATE: encodeState(config.state)
  });
  
  layer.withSolutionParams(
    'proofs',
    'action_spends',
    'finalizer_solution'
  );
  
  layer.includeConditionCodes();
  layer.includeCurryAndTreehash();
  
  layer.comment('Action layer wrapper');
  
  // Apply the action layer mod
  layer.addCondition(CLVMOpcode.APPLY,
    getActionLayerModHash(),
    layer.param('proofs'),
    layer.param('action_spends'),
    layer.param('finalizer_solution')
  );
  
  // Run inner puzzle with updated state
  layer.comment('Run inner puzzle with action context');
  layer.addCondition(CLVMOpcode.APPLY,
    layer.param('INNER_PUZZLE'),
    layer.param('inner_solution')
  );
  
  return layer;
}

/**
 * Create a finalizer based on type
 */
function createFinalizer(finalizer: Finalizer): PuzzleBuilder {
  const finalizerPuzzle = puzzle();
  finalizerPuzzle.noMod();
  
  if (finalizer.type === 'default') {
    finalizerPuzzle.withCurriedParams({
      ACTION_LAYER_MOD_HASH: hex(getActionLayerModHash()),
      HINT: finalizer.hint
    });
    
    finalizerPuzzle.comment('Default finalizer - pass through conditions');
    finalizerPuzzle.returnConditions();
  } else {
    finalizerPuzzle.withCurriedParams({
      ACTION_LAYER_MOD_HASH: hex(getActionLayerModHash()),
      RESERVE_FULL_PUZZLE_HASH: finalizer.reserveFullPuzzleHash,
      RESERVE_INNER_PUZZLE_HASH: finalizer.reserveInnerPuzzleHash,
      RESERVE_AMOUNT_PROGRAM: finalizer.reserveAmountProgram,
      HINT: finalizer.hint
    });
    
    finalizerPuzzle.comment('Reserve finalizer - manage reserve funds');
    // Reserve logic here
  }
  
  return finalizerPuzzle;
}

/**
 * Action registry class
 */
export class ActionRegistry<S extends Record<string, unknown>, C extends Record<string, unknown>> implements Registry {
  public state: S;
  public constants: C;
  private actionHashes: string[];
  private pendingActions: ActionSpend[] = [];
  
  constructor(state: S, constants: C, actionHashes: string[]) {
    this.state = state;
    this.constants = constants;
    this.actionHashes = actionHashes;
  }
  
  /**
   * Create a new action instance
   */
  newAction<A extends Action<this>>(ActionClass: new () => A): A {
    const action = new ActionClass();
    return action.fromConstants(this.constants);
  }
  
  /**
   * Add an action to be executed
   */
  addAction(action: ActionSpend): void {
    this.pendingActions.push(action);
  }
  
  /**
   * Get merkle root of allowed actions
   */
  getMerkleRoot(): string {
    const hashFn = (data: string | Buffer) => {
      const input = typeof data === 'string' ? Buffer.from(data.replace('0x', ''), 'hex') : data;
      return Buffer.from(sha256(input));
    };
    const tree = new MerkleTree(this.actionHashes, hashFn, { sortPairs: true });
    return '0x' + tree.getRoot().toString('hex');
  }
  
  /**
   * Get merkle proofs for pending actions
   */
  getMerkleProofs(): MerkleProof[] {
    const hashFn = (data: string | Buffer) => {
      const input = typeof data === 'string' ? Buffer.from(data.replace('0x', ''), 'hex') : data;
      return Buffer.from(sha256(input));
    };
    const tree = new MerkleTree(this.actionHashes, hashFn, { sortPairs: true });
    return this.pendingActions.map((_action, index) => {
      // In real implementation, would get the hash of the pending action
      const actionHash = this.actionHashes[index % this.actionHashes.length];
      const proof = tree.getProof(actionHash);
      return {
        path: proof.map(p => '0x' + p.data.toString('hex')),
        index
      };
    });
  }
  
  /**
   * Create action layer solution
   */
  createSolution(finalizerSolution: TreeNode = list([])): ActionLayerSolution {
    return {
      proofs: this.getMerkleProofs(),
      actionSpends: this.pendingActions,
      finalizerSolution
    };
  }
}

/**
 * Create an action registry
 * @param initialState - Initial state
 * @param constants - Registry constants
 * @param actionHashes - Hashes of allowed actions
 * @returns Registry wrapper
 */
export function createActionRegistry<S extends Record<string, unknown>, C extends Record<string, unknown>>(
  initialState: S,
  constants: C,
  actionHashes: string[]
): ActionRegistry<S, C> {
  return new ActionRegistry(initialState, constants, actionHashes);
}

/**
 * Base action class
 */
export abstract class BaseAction<R extends Registry> implements Action<R> {
  protected constants!: R['constants'];
  
  fromConstants(constants: R['constants']): this {
    this.constants = constants;
    return this;
  }
  
  abstract curryTreeHash(): string;
  abstract constructPuzzle(builder: PuzzleBuilder): PuzzleBuilder;
  abstract spend(registry: R, params: Record<string, unknown>): SpendResult;
}

/**
 * Example: Register action
 */
export class RegisterAction<R extends Registry> extends BaseAction<R> {
  curryTreeHash(): string {
    // Calculate curry tree hash for this action
    return '0x' + 'r'.repeat(64);
  }
  
  constructPuzzle(builder: PuzzleBuilder): PuzzleBuilder {
    builder.comment('Register action');
    
    builder.withSolutionParams(
      'item_to_register',
      'proof_of_ownership'
    );
    
    // Verify ownership
    builder.comment('Verify ownership proof');
    builder.requireSignature('0x' + 'p'.repeat(96));
    
    // Update state to include new registration
    builder.comment('Update state with registration');
    builder.returnConditions();
    
    return builder;
  }
  
  spend(registry: R, params: Record<string, unknown>): SpendResult {
    const currentRegistrations = registry.state.registrations as unknown[];
    return {
      newState: {
        ...registry.state,
        registrations: [...(currentRegistrations || []), params.item]
      }
    };
  }
}

/**
 * Example: Update action
 */
export class UpdateAction<R extends Registry> extends BaseAction<R> {
  curryTreeHash(): string {
    return '0x' + 'u'.repeat(64);
  }
  
  constructPuzzle(builder: PuzzleBuilder): PuzzleBuilder {
    builder.comment('Update action');
    
    builder.withSolutionParams(
      'item_id',
      'new_value',
      'authorization'
    );
    
    // Verify authorization
    builder.comment('Verify update authorization');
    builder.requireSignature('0x' + 'a'.repeat(96));
    
    // Return updated state
    builder.returnConditions();
    
    return builder;
  }
  
  spend(registry: R, params: Record<string, unknown>): SpendResult {
    const items = registry.state.items && typeof registry.state.items === 'object' ? registry.state.items : {};
    return {
      newState: {
        ...registry.state,
        items: {
          ...items,
          [params.itemId as string]: params.newValue
        }
      }
    };
  }
}

/**
 * Encode state for storage
 */
function encodeState(state: Record<string, unknown>): TreeNode {
  const pairs: TreeNode[] = [];
  for (const [key, value] of Object.entries(state)) {
    pairs.push(list([hex(key), encodeValue(value)]));
  }
  return list(pairs);
}

/**
 * Encode a single value
 */
function encodeValue(value: unknown): TreeNode {
  if (typeof value === 'string') {
    return hex(value);
  } else if (typeof value === 'number' || typeof value === 'bigint') {
    return int(value);
  } else if (value && typeof value === 'object') {
    return encodeState(value as Record<string, unknown>);
  } else {
    return list([]);
  }
}

/**
 * Example: Create a catalog-like registry with actions
 */
export function createCatalogRegistry(
  launcherId: string,
  royaltyAddress: string,
  royaltyPercentage: number
): ActionRegistry<Record<string, unknown>, Record<string, unknown>> {
  const initialState = {
    catMakerPuzzleHash: '0x' + 'c'.repeat(64),
    registrationPrice: 1000000
  };
  
  const constants = {
    launcherId,
    royaltyAddress,
    royaltyTenThousandths: royaltyPercentage * 100,
    precommitPayoutPuzzleHash: royaltyAddress,
    relativeBlockHeight: 32,
    priceSingletonLauncherId: '0x' + 'p'.repeat(64)
  };
  
  const actionHashes = [
    new RegisterAction().curryTreeHash(),
    new UpdateAction().curryTreeHash()
  ];
  
  return createActionRegistry(initialState, constants, actionHashes);
}

/**
 * Example: Delegated state action - allows external singleton to update state
 */
export class DelegatedStateAction<R extends Registry> extends BaseAction<R> {
  curryTreeHash(): string {
    return '0x' + 'd'.repeat(64);
  }
  
  constructPuzzle(builder: PuzzleBuilder): PuzzleBuilder {
    builder.comment('Delegated state action');
    
    const priceSingletonId = this.constants.priceSingletonLauncherId || '0x00';
    
    builder.withCurriedParams({
      OTHER_SINGLETON_LAUNCHER_ID: hex(priceSingletonId as string)
    });
    
    builder.withSolutionParams(
      'new_state',
      'other_singleton_inner_puzzle_hash'
    );
    
    // Verify the other singleton authorized this update
    builder.comment('Verify singleton authorization');
    builder.assertAnnouncement(
      calculateAnnouncementId(
        priceSingletonId as string,
        list([
          hex('state_update'),
          builder.param('new_state').tree
        ])
      )
    );
    
    // Return new state
    builder.returnConditions();
    
    return builder;
  }
  
  spend(_registry: R, params: Record<string, unknown>): SpendResult {
    return {
      newState: params.newState as Record<string, unknown>
    };
  }
}

// Helper to calculate announcement ID
function calculateAnnouncementId(_coinId: string, _message: TreeNode): string {
  // In real implementation would calculate sha256(coinId + message)
  return '0x' + 'a'.repeat(64);
} 