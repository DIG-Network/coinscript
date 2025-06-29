/**
 * SolutionBuilder - Fluent API for building Chia puzzle solutions
 * 
 * Solutions are the data passed to puzzles when spending coins
 */

import { 
  TreeNode, 
  list, 
  sym, 
  int, 
  hex,
  serialize,
  NIL
} from '../core';

// Type for state values
type StateValue = string | number | bigint | boolean | Map<string, unknown> | Record<string, unknown>;

/**
 * Specialized builder for condition lists
 */
export class ConditionListBuilder {
  private conditions: TreeNode[] = [];
  
  createCoin(puzzleHash: string, amount: number | bigint, memo?: string): ConditionListBuilder {
    const cond = memo
      ? list([int(51), hex(puzzleHash), int(amount), hex(memo)])
      : list([int(51), hex(puzzleHash), int(amount)]);
    this.conditions.push(cond);
    return this;
  }
  
  reserveFee(amount: number | bigint): ConditionListBuilder {
    this.conditions.push(list([int(52), int(amount)]));
    return this;
  }
  
  requireSignature(pubkey: string): ConditionListBuilder {
    this.conditions.push(list([int(50), hex(pubkey), hex('0x00')]));
    return this;
  }
  
  createAnnouncement(message: string): ConditionListBuilder {
    this.conditions.push(list([int(60), hex(message)]));
    return this;
  }
  
  assertAnnouncement(coinId: string, message?: string): ConditionListBuilder {
    if (message) {
      this.conditions.push(list([int(61), hex(coinId), hex(message)]));
    } else {
      this.conditions.push(list([int(61), hex(coinId)]));
    }
    return this;
  }
  
  assertSecondsRelative(seconds: number): ConditionListBuilder {
    this.conditions.push(list([int(80), int(seconds)]));
    return this;
  }
  
  assertHeightAbsolute(height: number): ConditionListBuilder {
    this.conditions.push(list([int(82), int(height)]));
    return this;
  }
  
  aggSigMe(pubkey: string, message: string): ConditionListBuilder {
    this.conditions.push(list([int(50), hex(pubkey), hex(message)]));
    return this;
  }
  
  requireAfterHeight(height: number): ConditionListBuilder {
    this.conditions.push(list([int(82), int(height)]));
    return this;
  }
  
  requireAfterSeconds(seconds: number): ConditionListBuilder {
    this.conditions.push(list([int(80), int(seconds)]));
    return this;
  }
  
  addRawCondition(opcode: number, ...args: Array<string | number | bigint | Uint8Array>): ConditionListBuilder {
    this.conditions.push(list([int(opcode), ...args.map(arg => toTree(arg))]));
    return this;
  }
  
  build(): TreeNode {
    return list(this.conditions);
  }
}

export class SolutionBuilder {
  private nodes: TreeNode[] = [];
  private structureType: 'list' | 'cons' | 'raw' = 'list';
  
  /**
   * Static constructor for creating a new SolutionBuilder
   */
  static create(): SolutionBuilder {
    return new SolutionBuilder();
  }
  
  /**
   * Add a raw value to the solution
   * Can accept multiple values at once for convenience
   */
  add(...values: Array<string | number | bigint | Uint8Array | TreeNode | SolutionBuilder | boolean>): SolutionBuilder {
    if (values.length === 0) return this;
    
    // If single value, add it directly
    if (values.length === 1) {
      this.nodes.push(toTree(values[0]));
    } else {
      // If multiple values, add each one
      values.forEach(v => this.nodes.push(toTree(v)));
    }
    return this;
  }
  
  /**
   * Add multiple values at once
   * @deprecated Use add() which now accepts multiple values
   */
  addMany(...values: Array<string | number | bigint | Uint8Array | TreeNode | boolean>): SolutionBuilder {
    return this.add(...values);
  }
  
  /**
   * Add a list to the solution
   */
  addList(callback: (builder: SolutionBuilder) => void): SolutionBuilder {
    const listBuilder = new SolutionBuilder();
    callback(listBuilder);
    this.nodes.push(listBuilder.build());
    return this;
  }
  
  /**
   * Add an empty list (nil)
   */
  addNil(): SolutionBuilder {
    this.nodes.push(NIL);
    return this;
  }
  
  /**
   * Add a condition list (for pay-to-conditions puzzles)
   */
  addConditions(callback: (builder: ConditionListBuilder) => void): SolutionBuilder {
    const condBuilder = new ConditionListBuilder();
    callback(condBuilder);
    this.nodes.push(condBuilder.build());
    return this;
  }
  
  /**
   * Add state for slot-machine pattern
   */
  addState(state: Record<string, StateValue>): SolutionBuilder {
    // Convert state object to ChiaLisp structure
    const stateList = this.encodeState(state);
    this.nodes.push(stateList);
    return this;
  }
  
  /**
   * Add action name and parameters for slot-machine pattern
   */
  addAction(actionName: string, params?: Array<string | number | bigint | Uint8Array | boolean>): SolutionBuilder {
    this.add(actionName);
    if (params && params.length > 0) {
      this.addList(b => {
        params.forEach(p => b.add(p));
      });
    } else {
      this.addNil();
    }
    return this;
  }
  
  /**
   * Add merkle proof
   */
  addMerkleProof(proof: string[]): SolutionBuilder {
    this.addList(b => {
      proof.forEach(hash => b.add(hash));
    });
    return this;
  }
  
  /**
   * Add a delegated puzzle solution
   */
  addDelegatedPuzzle(puzzle: TreeNode, solution: TreeNode): SolutionBuilder {
    this.add(puzzle);
    this.add(solution);
    return this;
  }
  
  /**
   * Add raw ChiaLisp code (advanced users)
   * The code string should be valid ChiaLisp syntax
   */
  addRaw(chialispCode: string): SolutionBuilder {
    // For now, we'll add it as a symbol - in a real implementation,
    // this would parse the ChiaLisp and create the appropriate tree
    this.nodes.push(sym(chialispCode));
    return this;
  }
  
  /**
   * Set the solution structure type
   */
  asConsCell(): SolutionBuilder {
    this.structureType = 'cons';
    return this;
  }
  
  asRaw(): SolutionBuilder {
    this.structureType = 'raw';
    return this;
  }
  
  /**
   * Build the solution tree
   */
  build(): TreeNode {
    if (this.nodes.length === 0) return NIL;
    
    switch (this.structureType) {
      case 'raw':
        return this.nodes.length === 1 ? this.nodes[0] : list(this.nodes);
      
      case 'cons':
        if (this.nodes.length !== 2) {
          throw new Error('Cons cell requires exactly 2 elements');
        }
        return list([sym('c'), this.nodes[0], this.nodes[1]]);
      
      case 'list':
      default:
        return list(this.nodes);
    }
  }
  
  /**
   * Serialize the solution to ChiaLisp string
   */
  serialize(options?: { indent?: boolean }): string {
    return serialize(this.build(), options);
  }
  
  /**
   * Convert to ChiaLisp source code string
   */
  toChiaLisp(options?: { indent?: boolean }): string {
    return serialize(this.build(), options);
  }
  
  /**
   * Serialize to hex (for use in spend bundles)
   */
  toHex(): string {
    // This would need proper CLVM serialization
    // For now, return a placeholder
    return '0x' + Buffer.from(this.serialize()).toString('hex');
  }
  
  // Private helper to encode state
  private encodeState(state: Record<string, StateValue>): TreeNode {
    const entries: TreeNode[] = [];
    
    Object.entries(state).forEach(([_key, value]) => {
      if (typeof value === 'number' || typeof value === 'bigint') {
        entries.push(int(value));
      } else if (typeof value === 'string') {
        entries.push(hex(value));
      } else if (typeof value === 'boolean') {
        entries.push(value ? int(1) : NIL);
      } else if (value instanceof Map) {
        // For Map instances, encode as list of (key . value) pairs
        const pairs: TreeNode[] = [];
        value.forEach((v, k) => {
          if (typeof k === 'string' && (typeof v === 'number' || typeof v === 'bigint')) {
            pairs.push(list([hex(k), int(v)]));
          }
        });
        entries.push(list(pairs));
      } else if (typeof value === 'object' && value !== null) {
        // For plain objects, encode as list of (key . value) pairs
        const pairs: TreeNode[] = [];
        Object.entries(value).forEach(([k, v]) => {
          if (typeof v === 'number' || typeof v === 'bigint') {
            pairs.push(list([hex(k), int(v)]));
          }
        });
        entries.push(list(pairs));
      } else {
        entries.push(toTree(value as string | number | bigint));
      }
    });
    
    return list(entries);
  }
}

// Helper to convert values to trees
function toTree(value: string | number | bigint | Uint8Array | TreeNode | SolutionBuilder | boolean): TreeNode {
  if (value instanceof SolutionBuilder) {
    return value.build();
  }
  if (typeof value === 'number' || typeof value === 'bigint') {
    return int(value);
  }
  if (typeof value === 'boolean') {
    // Convert booleans to ChiaLisp convention: true = 1, false = ()
    return value ? int(1) : NIL;
  }
  if (typeof value === 'string') {
    if (value.startsWith('0x')) {
      return hex(value);
    }
    // Treat as symbol/identifier
    return sym(value);
  }
  if (value instanceof Uint8Array) {
    const hexStr = '0x' + Array.from(value)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return hex(hexStr);
  }
  return value;
}