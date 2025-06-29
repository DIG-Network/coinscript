/**
 * Runtime support for managing state in slot-machine pattern coins
 */

import { TreeNode, list, int, hex } from '../core';
import { sha256tree } from '../core';
import { MerkleTree } from 'merkletreejs';
import { createHash } from 'crypto';

export interface StateField {
  name: string;
  type: 'uint256' | 'bool' | 'address' | 'mapping';
  value: unknown;
}

export interface CoinState {
  fields: StateField[];
  version: number;
}

/**
 * State Manager - handles encoding/decoding state for slot-machine coins
 */
export class StateManager {
  private stateStructure: Map<string, string> = new Map();
  
  constructor(stateFields: Array<{ name: string; type: string }>) {
    for (const field of stateFields) {
      this.stateStructure.set(field.name, field.type);
    }
  }
  
  /**
   * Encode JavaScript state object to ChiaLisp tree
   */
  encodeState(state: Record<string, unknown>): TreeNode {
    const fields: TreeNode[] = [];
    
    for (const [name, type] of this.stateStructure) {
      const value = state[name];
      fields.push(this.encodeField(name, type, value));
    }
    
    return list(fields);
  }
  
  /**
   * Decode ChiaLisp tree to JavaScript state object
   */
  decodeState(_stateTree: TreeNode): Record<string, unknown> {
    // Implementation would parse the tree structure
    // For now, return empty state
    return {};
  }
  
  /**
   * Encode a single field based on its type
   */
  private encodeField(_name: string, type: string, value: unknown): TreeNode {
    switch (type) {
      case 'uint256':
        return int(BigInt(Number(value) || 0));
      
      case 'bool':
        return int(value ? 1 : 0);
      
      case 'address':
        return hex(String(value || '0x' + '00'.repeat(32)));
      
      case 'mapping': {
        // Encode mapping as a list of (key, value) pairs
        const pairs: TreeNode[] = [];
        if (value && typeof value === 'object') {
          const entries = Object.entries(value as Record<string, unknown>);
          for (const [k, v] of entries) {
            pairs.push(list([hex(k), int(BigInt(Number(v) || 0))]));
          }
        }
        return list(pairs);
      }
      
      default:
        return int(0);
    }
  }
  
  /**
   * Calculate state hash for verification
   */
  hashState(state: Record<string, unknown>): string {
    const stateTree = this.encodeState(state);
    const hash = sha256tree(stateTree);
    return '0x' + Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Create a state diff between two states
   */
  createStateDiff(oldState: Record<string, unknown>, newState: Record<string, unknown>): Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }> {
    const diff: Array<{
      field: string;
      oldValue: unknown;
      newValue: unknown;
    }> = [];
    
    for (const [name] of this.stateStructure) {
      const oldVal = oldState[name];
      const newVal = newState[name];
      
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
        diff.push({
          field: name,
          oldValue: oldVal,
          newValue: newVal
        });
      }
    }
    
    return diff;
  }
}

/**
 * Merkle tree utilities for action management
 */
export class ActionMerkleTree {
  private actions: Map<string, string> = new Map(); // action name -> puzzle hash
  private merkleTree: MerkleTree | null = null;
  private actionOrder: string[] = []; // Maintain order for consistent tree building
  
  addAction(name: string, puzzleHash: string): void {
    this.actions.set(name, puzzleHash);
    this.actionOrder.push(name);
    this.merkleTree = null; // Invalidate cached tree
  }
  
  /**
   * Build or rebuild the merkle tree
   */
  private buildTree(): MerkleTree {
    if (this.merkleTree) {
      return this.merkleTree;
    }
    
    // Get action hashes in consistent order
    const leaves = this.actionOrder.map(name => {
      const puzzleHash = this.actions.get(name)!;
      // Remove 0x prefix if present
      const cleanHash = puzzleHash.startsWith('0x') ? puzzleHash.slice(2) : puzzleHash;
      return Buffer.from(cleanHash, 'hex');
    });
    
    // Create merkle tree with SHA256
    this.merkleTree = new MerkleTree(leaves, (data: Buffer) => this.sha256Hash(data), {
      sortPairs: true,
      sortLeaves: false // We maintain our own order
    });
    
    return this.merkleTree;
  }
  
  /**
   * SHA256 hash function for merkle tree
   */
  private sha256Hash(data: Buffer): Buffer {
    return createHash('sha256').update(data).digest();
  }
  
  /**
   * Calculate merkle root of all actions
   */
  getMerkleRoot(): string {
    if (this.actions.size === 0) {
      return '0x' + '00'.repeat(32);
    }
    
    const tree = this.buildTree();
    const root = tree.getRoot();
    return '0x' + root.toString('hex');
  }
  
  /**
   * Generate merkle proof for an action
   */
  getMerkleProof(actionName: string): string[] {
    if (!this.actions.has(actionName)) {
      return [];
    }
    
    const tree = this.buildTree();
    const puzzleHash = this.actions.get(actionName)!;
    const cleanHash = puzzleHash.startsWith('0x') ? puzzleHash.slice(2) : puzzleHash;
    const leaf = Buffer.from(cleanHash, 'hex');
    
    const proof = tree.getProof(leaf);
    
    // Convert proof to hex strings
    return proof.map(p => '0x' + p.data.toString('hex'));
  }
  
  /**
   * Verify a merkle proof
   */
  verifyProof(actionName: string, proof: string[], root: string): boolean {
    if (!this.actions.has(actionName)) {
      return false;
    }
    
    const puzzleHash = this.actions.get(actionName)!;
    const cleanHash = puzzleHash.startsWith('0x') ? puzzleHash.slice(2) : puzzleHash;
    const leaf = Buffer.from(cleanHash, 'hex');
    
    const proofBuffers = proof.map(p => {
      const cleanProof = p.startsWith('0x') ? p.slice(2) : p;
      return Buffer.from(cleanProof, 'hex');
    });
    
    const cleanRoot = root.startsWith('0x') ? root.slice(2) : root;
    const rootBuffer = Buffer.from(cleanRoot, 'hex');
    
    return MerkleTree.verify(proofBuffers, leaf, rootBuffer, (data: Buffer) => createHash('sha256').update(data).digest());
  }
}

/**
 * Helper to manage stateful coin lifecycle
 */
export class StatefulCoinManager {
  private stateManager: StateManager;
  private actionTree: ActionMerkleTree;
  
  constructor(
    stateStructure: Array<{ name: string; type: string }>,
    actions: Array<{ name: string; puzzleHash: string }>
  ) {
    this.stateManager = new StateManager(stateStructure);
    this.actionTree = new ActionMerkleTree();
    
    for (const action of actions) {
      this.actionTree.addAction(action.name, action.puzzleHash);
    }
  }
  
  /**
   * Prepare solution for spending a stateful coin
   */
  prepareSolution(
    actionName: string,
    currentState: Record<string, unknown>,
    actionParams: unknown[]
  ): {
    action_name: string;
    current_state: TreeNode;
    action_params: unknown[];
    merkle_proof: string[];
  } {
    return {
      action_name: actionName,
      current_state: this.stateManager.encodeState(currentState),
      action_params: actionParams,
      merkle_proof: this.actionTree.getMerkleProof(actionName)
    };
  }
  
  /**
   * Validate state transition
   */
  validateTransition(
    oldState: Record<string, unknown>,
    newState: Record<string, unknown>,
    _action: string
  ): boolean {
    // Add validation logic based on action rules
    const diff = this.stateManager.createStateDiff(oldState, newState);
    
    // For now, just check that something changed
    return diff.length > 0;
  }
  
  /**
   * Get action merkle root for puzzle creation
   */
  getActionMerkleRoot(): string {
    return this.actionTree.getMerkleRoot();
  }
} 