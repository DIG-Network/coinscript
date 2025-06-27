/**
 * PuzzleBuilder - Fluent API for building Chia puzzles
 * 
 * The main external interface for the framework
 */

import { 
  TreeNode, 
  list, 
  sym, 
  int, 
  hex,
  serialize,
  sha256tree,
  substitute
} from '../core';
import { formatCLSP } from '../core/clspFormatter';
import { 
  IF, CONS, ADD, SUBTRACT, MULTIPLY, DIVIDE, GT, GTS, EQ, NOT,
  SHA256, SHA256TREE1, APPLY, QUOTE, ARG, ARG1, ARG2, ARG3,
  ALL, ANY, ASSERT, NIL, MOD
} from '../core/opcodes';

// Type-safe condition builders
export interface ConditionBuilder {
  // Coin creation
  createCoin(puzzleHash: string | Uint8Array, amount: number | bigint | Expression, memo?: string | Uint8Array): PuzzleBuilder;
  
  // Signatures
  requireSignature(pubkey: string | Uint8Array, message?: Expression): PuzzleBuilder;
  requireMySignature(pubkey: string | Uint8Array): PuzzleBuilder;
  requireSignatureUnsafe(pubkey: string | Uint8Array, message: Expression): PuzzleBuilder;
  
  // Time locks
  requireAfterSeconds(seconds: number | Expression): PuzzleBuilder;
  requireAfterHeight(height: number | Expression): PuzzleBuilder;
  requireBeforeSeconds(seconds: number | Expression): PuzzleBuilder;
  requireBeforeHeight(height: number | Expression): PuzzleBuilder;
  
  // Fees
  reserveFee(amount: number | bigint | Expression): PuzzleBuilder;
  
  // Announcements
  createAnnouncement(message: string | Uint8Array): PuzzleBuilder;
  assertAnnouncement(announcementId: string | Uint8Array): PuzzleBuilder;
  
  // Puzzle assertions
  assertMyPuzzleHash(hash: string | Uint8Array): PuzzleBuilder;
  assertMyCoinId(id: string | Uint8Array): PuzzleBuilder;
  
  // Raw conditions
  addCondition(opcode: number, ...args: (Expression | string | number | Uint8Array)[]): PuzzleBuilder;
  
  // Control flow continuation
  then(callback: (builder: PuzzleBuilder) => void): PuzzleBuilder;
  else(callback: (builder: PuzzleBuilder) => void): PuzzleBuilder;
  elseIf(condition: Expression, callback: (builder: PuzzleBuilder) => void): PuzzleBuilder;
}

// Expression builder for composable values
export class Expression {
  constructor(public tree: TreeNode) {}
  
  // Arithmetic
  add(other: Expression | number | bigint): Expression {
    return new Expression(list([ADD, this.tree, toTree(other)]));
  }
  
  subtract(other: Expression | number | bigint): Expression {
    return new Expression(list([SUBTRACT, this.tree, toTree(other)]));
  }
  
  multiply(other: Expression | number | bigint): Expression {
    return new Expression(list([MULTIPLY, this.tree, toTree(other)]));
  }
  
  divide(other: Expression | number | bigint): Expression {
    return new Expression(list([DIVIDE, this.tree, toTree(other)]));
  }
  
  // Comparison
  greaterThan(other: Expression | number | bigint): Expression {
    return new Expression(list([GT, this.tree, toTree(other)]));
  }
  
  greaterThanBytes(other: Expression | string | Uint8Array): Expression {
    return new Expression(list([GTS, this.tree, toTree(other)]));
  }
  
  equals(other: Expression | number | bigint | string): Expression {
    return new Expression(list([EQ, this.tree, toTree(other)]));
  }
  
  // Logic
  not(): Expression {
    return new Expression(list([NOT, this.tree]));
  }
  
  and(other: Expression): Expression {
    return new Expression(list([ALL, this.tree, other.tree]));
  }
  
  or(other: Expression): Expression {
    return new Expression(list([ANY, this.tree, other.tree]));
  }
  
  // Hashing
  sha256(): Expression {
    return new Expression(list([SHA256, this.tree]));
  }
  
  treeHash(): Expression {
    return new Expression(list([SHA256TREE1, this.tree]));
  }
}

// Helper to convert various types to trees
function toTree(value: Expression | string | number | bigint | Uint8Array | TreeNode): TreeNode {
  if (value instanceof Expression) return value.tree;
  if (typeof value === 'number' || typeof value === 'bigint') return int(value);
  if (typeof value === 'string') return hex(value);
  if (value instanceof Uint8Array) {
    // Convert Uint8Array to hex string
    const hexStr = Array.from(value)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return hex(hexStr);
  }
  return value;
}

// Built-in expressions
export const amount = new Expression(ARG);
export const arg1 = new Expression(ARG1);
export const arg2 = new Expression(ARG2);
export const arg3 = new Expression(ARG3);
export const solution = new Expression(ARG1);

// Main builder class
export class PuzzleBuilder implements ConditionBuilder {
  private nodes: TreeNode[] = [];
  private currentContext: 'main' | 'if' | 'else' = 'main';
  private ifCondition?: TreeNode;
  private thenNodes: TreeNode[] = [];
  private elseNodes: TreeNode[] = [];
  
  // New fields for mod support
  private curriedParams: Map<string, TreeNode> = new Map();
  private solutionParams: string[] = [];
  private isModStructure: boolean = true; // Default to creating mod structures
  private includes: string[] = []; // Library includes
  private comments: Map<TreeNode, string> = new Map(); // Comments for nodes
  private blockComments: string[] = []; // Block comments to add before the body
  
  // === MOD STRUCTURE SUPPORT ===
  
  /**
   * Add a comment to the next node added
   */
  comment(text: string): PuzzleBuilder {
    // Store the comment to be associated with the next node
    this._pendingComment = text;
    return this;
  }
  
  /**
   * Add a block comment (standalone comment line)
   */
  blockComment(text: string): PuzzleBuilder {
    this.blockComments.push(text);
    return this;
  }
  
  private _pendingComment?: string;
  
  /**
   * Include a ChiaLisp library file
   */
  include(libraryPath: string): PuzzleBuilder {
    this.includes.push(libraryPath);
    return this;
  }
  
  /**
   * Include standard condition codes library
   */
  includeConditionCodes(): PuzzleBuilder {
    return this.include('condition_codes.clvm');
  }
  
  /**
   * Include curry and treehash library
   */
  includeCurryAndTreehash(): PuzzleBuilder {
    return this.include('curry-and-treehash.clinc');
  }
  
  /**
   * Include CAT truths library
   */
  includeCatTruths(): PuzzleBuilder {
    return this.include('cat_truths.clib');
  }
  
  /**
   * Include utility macros library
   */
  includeUtilityMacros(): PuzzleBuilder {
    return this.include('utility_macros.clib');
  }
  
  /**
   * Include all standard libraries commonly used
   */
  includeStandardLibraries(): PuzzleBuilder {
    return this
      .includeConditionCodes()
      .includeCurryAndTreehash()
      .includeCatTruths()
      .includeUtilityMacros();
  }
  
  /**
   * Define curried parameters that will be baked into the puzzle
   */
  withCurriedParams(params: Record<string, string | number | bigint | Uint8Array | TreeNode | Expression>): PuzzleBuilder {
    Object.entries(params).forEach(([name, value]) => {
      this.curriedParams.set(name, toTree(value));
    });
    return this;
  }
  
  /**
   * Define solution parameters expected when the puzzle is solved
   */
  withSolutionParams(...params: string[]): PuzzleBuilder {
    this.solutionParams.push(...params);
    return this;
  }
  
  /**
   * Access a parameter as a variable (not its value)
   */
  param(name: string): Expression {
    return new Expression(sym(name));
  }
  
  /**
   * Disable mod structure generation (for simple expressions)
   */
  noMod(): PuzzleBuilder {
    this.isModStructure = false;
    return this;
  }
  
  // === COIN OPERATIONS ===
  
  createCoin(puzzleHash: string | Uint8Array, amount: number | bigint | Expression, memo?: string | Uint8Array): PuzzleBuilder {
    const condition = memo 
      ? list([
          int(51), // CREATE_COIN
          toTree(puzzleHash),
          toTree(amount),
          toTree(memo)
        ])
      : list([
          int(51), // CREATE_COIN
          toTree(puzzleHash),
          toTree(amount)
        ]);
    this.addNode(condition);
    return this;
  }
  
  // === SIGNATURES ===
  
  requireSignature(pubkey: string | Uint8Array, message?: Expression): PuzzleBuilder {
    const msg = message || new Expression(list([SHA256TREE1, ARG1]));
    const condition = list([
      int(50), // AGG_SIG_ME
      toTree(pubkey),
      msg.tree
    ]);
    this.addNode(condition);
    return this;
  }
  
  requireMySignature(pubkey: string | Uint8Array): PuzzleBuilder {
    return this.requireSignature(pubkey);
  }
  
  requireSignatureUnsafe(pubkey: string | Uint8Array, message: Expression): PuzzleBuilder {
    const condition = list([
      int(49), // AGG_SIG_UNSAFE
      toTree(pubkey),
      message.tree
    ]);
    this.addNode(condition);
    return this;
  }
  
  // === TIME LOCKS ===
  
  requireAfterSeconds(seconds: number | Expression): PuzzleBuilder {
    const condition = list([int(80), toTree(seconds)]); // ASSERT_SECONDS_RELATIVE
    this.addNode(condition);
    return this;
  }
  
  requireAfterHeight(height: number | Expression): PuzzleBuilder {
    const condition = list([int(82), toTree(height)]); // ASSERT_HEIGHT_RELATIVE
    this.addNode(condition);
    return this;
  }
  
  requireBeforeSeconds(seconds: number | Expression): PuzzleBuilder {
    const condition = list([int(83), toTree(seconds)]); // ASSERT_BEFORE_SECONDS_RELATIVE
    this.addNode(condition);
    return this;
  }
  
  requireBeforeHeight(height: number | Expression): PuzzleBuilder {
    const condition = list([int(85), toTree(height)]); // ASSERT_BEFORE_HEIGHT_RELATIVE
    this.addNode(condition);
    return this;
  }
  
  // === FEES ===
  
  reserveFee(amount: number | bigint | Expression): PuzzleBuilder {
    const condition = list([int(52), toTree(amount)]); // RESERVE_FEE
    this.addNode(condition);
    return this;
  }
  
  // === ANNOUNCEMENTS ===
  
  createAnnouncement(message: string | Uint8Array): PuzzleBuilder {
    const condition = list([int(60), toTree(message)]); // CREATE_COIN_ANNOUNCEMENT
    this.addNode(condition);
    return this;
  }
  
  assertAnnouncement(announcementId: string | Uint8Array): PuzzleBuilder {
    const condition = list([int(61), toTree(announcementId)]); // ASSERT_COIN_ANNOUNCEMENT
    this.addNode(condition);
    return this;
  }
  
  // === ASSERTIONS ===
  
  assertMyPuzzleHash(hash: string | Uint8Array): PuzzleBuilder {
    const condition = list([int(70), toTree(hash)]); // ASSERT_MY_PUZZLEHASH
    this.addNode(condition);
    return this;
  }
  
  assertMyCoinId(id: string | Uint8Array): PuzzleBuilder {
    const condition = list([int(74), toTree(id)]); // ASSERT_MY_COIN_ID
    this.addNode(condition);
    return this;
  }
  
  // === RAW CONDITIONS ===
  
  addCondition(opcode: number, ...args: (Expression | string | number | Uint8Array)[]): PuzzleBuilder {
    const condition = list([int(opcode), ...args.map(toTree)]);
    this.addNode(condition);
    return this;
  }
  
  // === CONTROL FLOW ===
  
  if(condition: Expression): PuzzleBuilder {
    this.currentContext = 'if';
    this.ifCondition = condition.tree;
    this.thenNodes = [];
    this.elseNodes = [];
    return this;
  }
  
  then(callback: (builder: PuzzleBuilder) => void): PuzzleBuilder {
    if (this.currentContext !== 'if') {
      throw new Error('then() must follow if()');
    }
    const thenBuilder = new PuzzleBuilder();
    callback(thenBuilder);
    this.thenNodes = thenBuilder.nodes;
    return this;
  }
  
  else(callback: (builder: PuzzleBuilder) => void): PuzzleBuilder {
    if (this.currentContext !== 'if') {
      throw new Error('else() must follow if().then()');
    }
    this.currentContext = 'else';
    const elseBuilder = new PuzzleBuilder();
    callback(elseBuilder);
    this.elseNodes = elseBuilder.nodes;
    
    // Build the complete if expression
    const ifExpr = list([
      IF,
      this.ifCondition!,
      this.buildNodeList(this.thenNodes),
      this.buildNodeList(this.elseNodes)
    ]);
    
    this.nodes.push(ifExpr);
    this.currentContext = 'main';
    return this;
  }
  
  elseIf(condition: Expression, callback: (builder: PuzzleBuilder) => void): PuzzleBuilder {
    if (this.currentContext !== 'if') {
      throw new Error('elseIf() must follow if().then()');
    }
    
    // Convert elseIf to nested if in else branch
    const elseIfBuilder = new PuzzleBuilder();
    elseIfBuilder.if(condition).then(callback).else(() => {});
    this.elseNodes = [elseIfBuilder.build()];
    
    return this;
  }
  
  // === PATTERNS ===
  
  payToConditions(): PuzzleBuilder {
    // (a (q . 2) 1) - execute conditions from solution
    this.nodes = [list([APPLY, list([QUOTE, ARG2]), ARG1])];
    return this;
  }
  
  payToPublicKey(pubkey: string | Uint8Array): PuzzleBuilder {
    this.requireSignature(pubkey);
    this.returnConditions();
    return this;
  }
  
  delegatedPuzzle(): PuzzleBuilder {
    // (a 2 3) - run puzzle from arg2 with solution arg3
    this.nodes = [list([APPLY, ARG2, ARG3])];
    return this;
  }
  
  // === LOOPS (unrolled) ===
  
  repeat(count: number, callback: (index: number, builder: PuzzleBuilder) => void): PuzzleBuilder {
    for (let i = 0; i < count; i++) {
      callback(i, this);
    }
    return this;
  }
  
  forEach<T>(items: T[], callback: (item: T, index: number, builder: PuzzleBuilder) => void): PuzzleBuilder {
    items.forEach((item, index) => {
      callback(item, index, this);
    });
    return this;
  }
  
  // === COMPOSITION ===
  
  merge(other: PuzzleBuilder): PuzzleBuilder {
    this.nodes.push(...other.nodes);
    return this;
  }
  
  wrap(wrapper: (inner: TreeNode) => TreeNode): PuzzleBuilder {
    const innerPuzzle = this.build();
    this.nodes = [wrapper(innerPuzzle)];
    return this;
  }
  
  // === UTILITIES ===
  
  require(condition: Expression, _message?: string): PuzzleBuilder {
    // Assert condition is true
    const assertion = list([ASSERT, condition.tree]);
    this.addNode(assertion);
    return this;
  }
  
  returnConditions(): PuzzleBuilder {
    // Return conditions from solution (arg1)
    this.addNode(ARG1);
    return this;
  }
  
  /**
   * Return a specific value/expression
   */
  returnValue(value: Expression | string | number): PuzzleBuilder {
    if (typeof value === 'string' || typeof value === 'number') {
      this.addNode(variable(String(value)).tree);
    } else {
      this.addNode(value.tree);
    }
    return this;
  }
  
  fail(_message?: string): PuzzleBuilder {
    // Always fail (raise exception)
    this.addNode(list([sym('x')]));
    return this;
  }
  
  // === BUILDING ===
  
  build(): TreeNode {
    if (this.currentContext !== 'main') {
      throw new Error('Incomplete control flow - missing else() or build()');
    }
    
    let body = this.buildNodeList(this.nodes);
    
    // If we have curried parameters, substitute them in the body
    if (this.curriedParams.size > 0) {
      // Create a substitution map
      const substitutions = new Map<string, TreeNode>();
      this.curriedParams.forEach((value, name) => {
        substitutions.set(name, value);
      });
      
      // Apply substitutions to the body
      body = substitute(body, substitutions);
    }
    
    // If not generating a mod structure, return the body directly
    if (!this.isModStructure) {
      return body;
    }
    
    // Build parameter list for mod - ONLY solution parameters
    const allParams: TreeNode[] = [];
    
    // Only add solution parameters to the mod parameter list
    this.solutionParams.forEach(name => {
      allParams.push(sym(name));
    });
    
    // If no parameters defined, use default @ for solution
    if (allParams.length === 0) {
      allParams.push(ARG);
    }
    
    // Build mod structure with includes
    const paramList = allParams.length === 1 ? allParams[0] : list(allParams);
    
    // If we have includes, add them before the body
    if (this.includes.length > 0) {
      const includeNodes = this.includes.map(path => 
        list([sym('include'), sym(path)])
      );
      
      // Create the mod with includes and body
      const modElements = [MOD, paramList, ...includeNodes, body];
      return list(modElements);
    }
    
    // No includes - standard mod structure
    return list([MOD, paramList, body]);
  }
  
  serialize(options?: { indent?: boolean }): string {
    const tree = this.build();
    const clspCode = serialize(tree, {
      ...options,
      comments: this.comments,
      blockComments: this.blockComments
    });
    
    // Apply CLSP formatter if indent is true
    if (options?.indent) {
      return formatCLSP(clspCode, {
        maxLineLength: 120,
        indentSize: 2
      });
    }
    
    return clspCode;
  }
  
  /**
   * Calculate the SHA256 tree hash of this puzzle
   * Returns hex string with 0x prefix
   */
  toModHash(): string {
    const tree = this.build();
    const hashBytes = sha256tree(tree);
    return '0x' + Array.from(hashBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  /**
   * Build and curry the puzzle with provided values
   */
  curry(values?: Record<string, string | number | bigint | Uint8Array>): TreeNode {
    const puzzle = this.build();
    
    if (!values || Object.keys(values).length === 0) {
      return puzzle;
    }
    
    // Apply currying to replace parameters with values
    // This is a simplified version - real implementation would need proper curry support
    const curriedPuzzle = puzzle;
    
    Object.entries(values).forEach(([name, value]) => {
      // In real implementation, this would properly curry the values into the mod
      // For now, we'll just note that this needs proper implementation
      console.warn(`Currying ${name} with value ${String(value)} - needs proper implementation`);
    });
    
    return curriedPuzzle;
  }
  
  // === PRIVATE HELPERS ===
  
  private addNode(node: TreeNode): void {
    // Associate pending comment with this node if any
    if (this._pendingComment) {
      this.comments.set(node, this._pendingComment);
      this._pendingComment = undefined;
    }
    
    if (this.currentContext === 'if') {
      this.thenNodes.push(node);
    } else if (this.currentContext === 'else') {
      this.elseNodes.push(node);
    } else {
      this.nodes.push(node);
    }
  }
  
  private buildNodeList(nodes: TreeNode[]): TreeNode {
    if (nodes.length === 0) return NIL;
    if (nodes.length === 1) return nodes[0];
    
    // Build nested cons list
    return nodes.reduceRight((rest, node) => 
      list([CONS, node, rest]), 
      NIL
    );
  }

}

// === FACTORY FUNCTIONS ===

export function puzzle(): PuzzleBuilder {
  return new PuzzleBuilder();
}

export function expr(value: number | bigint | string | TreeNode): Expression {
  return new Expression(toTree(value));
}

export function variable(name: string): Expression {
  return new Expression(sym(name));
}

// Convenience exports
export { Expression as Expr }; 