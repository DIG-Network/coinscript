/**
 * PuzzleBuilder - Fluent API for building Chia puzzles
 * 
 * The main external interface for the framework
 */

import { 
  TreeNode, 
  Atom,
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
  ALL, ANY, NIL, MOD, RAISE
} from '../core/opcodes';
import { Program } from 'clvm-lib';
import { readFileSync } from 'fs';
import { parseChialisp } from '../chialisp/parser';
import { 
  determineRequiredIncludes, 
  getConditionCodeName
} from '../chialisp/includeIndex';
import { SolutionBuilder } from './SolutionBuilder';
import { toModHash as utilToModHash, toPuzzleReveal as utilToPuzzleReveal, toChiaLisp as utilToChiaLisp } from '../core/utils';

// Type-safe condition builders
export interface ConditionBuilder {
  // Coin creation
  createCoin(puzzleHash: string | Uint8Array | Expression, amount: number | bigint | Expression, memo?: string | Uint8Array): PuzzleBuilder;
  
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
  createAnnouncement(message: string | Uint8Array | Expression): PuzzleBuilder;
  assertAnnouncement(announcementId: string | Uint8Array | Expression): PuzzleBuilder;
  
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
  
  // Utility methods to match TreeNode interface
  toModHash(): string {
    return utilToModHash(this.tree);
  }
  
  toPuzzleReveal(): string {
    return utilToPuzzleReveal(this.tree);
  }
  
  toChiaLisp(): string {
    return utilToChiaLisp(this.tree);
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
  private featuresUsed: Set<string> = new Set(); // Track features for auto-includes
  
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
    return this.include('condition_codes.clib');
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
   * Include CLVM opcode constants
   */
  includeOpcodes(): PuzzleBuilder {
    this.featuresUsed.add('_opcodes_constants');
    return this.include('opcodes.clib');
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
  
  /**
   * Set a custom mod structure (e.g., from loaded Chialisp)
   */
  withMod(modAst: TreeNode): PuzzleBuilder {
    this.customMod = modAst;
    return this;
  }
  
  private customMod?: TreeNode;
  
  // === COIN OPERATIONS ===
  
  createCoin(puzzleHash: string | Uint8Array | Expression, amount: number | bigint | Expression, memo?: string | Uint8Array): PuzzleBuilder {
    // Track feature usage
    this.featuresUsed.add('CREATE_COIN');
    
    // Use symbolic name if condition codes are included or will be auto-included
    const opcodeExpr = this.shouldUseSymbolicConditionCode(51)
      ? sym('CREATE_COIN')
      : int(51);
    
    // Handle puzzle hash - if it's a parameter name (not hex), treat it as a variable
    let puzzleHashExpr: TreeNode;
    if (puzzleHash instanceof Expression) {
      puzzleHashExpr = puzzleHash.tree;
    } else if (typeof puzzleHash === 'string' && !puzzleHash.startsWith('0x') && puzzleHash.match(/^[a-zA-Z_]\w*$/)) {
      // It's a variable name
      puzzleHashExpr = sym(puzzleHash);
    } else {
      puzzleHashExpr = toTree(puzzleHash);
    }
      
    const condition = memo 
      ? list([
          opcodeExpr,
          puzzleHashExpr,
          toTree(amount),
          toTree(memo)
        ])
      : list([
          opcodeExpr,
          puzzleHashExpr,
          toTree(amount)
        ]);
    this.addNode(condition);
    return this;
  }
  
  // === SIGNATURES ===
  
  requireSignature(pubkey: string | Uint8Array, message?: Expression): PuzzleBuilder {
    // Track feature usage
    this.featuresUsed.add('AGG_SIG_ME');
    
    // For AGG_SIG_ME, if no message is provided, we use a simple default
    let msg: Expression;
    if (message) {
      msg = message;
    } else {
      // Use a simple default message - empty bytes for now
      // In production, this would typically be the tree hash of the solution
      msg = new Expression(NIL);
    }
    
    const opcodeExpr = this.shouldUseSymbolicConditionCode(50)
      ? sym('AGG_SIG_ME')
      : int(50);
    const condition = list([
      opcodeExpr,
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
    // Track feature usage
    this.featuresUsed.add('AGG_SIG_UNSAFE');
    
    const opcodeExpr = this.shouldUseSymbolicConditionCode(49)
      ? sym('AGG_SIG_UNSAFE')
      : int(49);
    const condition = list([
      opcodeExpr,
      toTree(pubkey),
      message.tree
    ]);
    this.addNode(condition);
    return this;
  }
  
  // === TIME LOCKS ===
  
  requireAfterSeconds(seconds: number | Expression): PuzzleBuilder {
    this.featuresUsed.add('ASSERT_SECONDS_RELATIVE');
    const opcodeExpr = this.shouldUseSymbolicConditionCode(80)
      ? sym('ASSERT_SECONDS_RELATIVE')
      : int(80);
    const condition = list([opcodeExpr, toTree(seconds)]);
    this.addNode(condition);
    return this;
  }
  
  requireAfterHeight(height: number | Expression): PuzzleBuilder {
    this.featuresUsed.add('ASSERT_HEIGHT_RELATIVE');
    const opcodeExpr = this.shouldUseSymbolicConditionCode(82)
      ? sym('ASSERT_HEIGHT_RELATIVE')
      : int(82);
    const condition = list([opcodeExpr, toTree(height)]);
    this.addNode(condition);
    return this;
  }
  
  requireBeforeSeconds(seconds: number | Expression): PuzzleBuilder {
    this.featuresUsed.add('ASSERT_SECONDS_ABSOLUTE');
    const opcodeExpr = this.shouldUseSymbolicConditionCode(81)
      ? sym('ASSERT_SECONDS_ABSOLUTE')
      : int(81);
    const condition = list([opcodeExpr, toTree(seconds)]);
    this.addNode(condition);
    return this;
  }
  
  requireBeforeHeight(height: number | Expression): PuzzleBuilder {
    this.featuresUsed.add('ASSERT_HEIGHT_ABSOLUTE');
    const opcodeExpr = this.shouldUseSymbolicConditionCode(83)
      ? sym('ASSERT_HEIGHT_ABSOLUTE')
      : int(83);
    const condition = list([opcodeExpr, toTree(height)]);
    this.addNode(condition);
    return this;
  }
  
  // === FEES ===
  
  reserveFee(amount: number | bigint | Expression): PuzzleBuilder {
    this.featuresUsed.add('RESERVE_FEE');
    const opcodeExpr = this.shouldUseSymbolicConditionCode(52)
      ? sym('RESERVE_FEE')
      : int(52);
    const condition = list([opcodeExpr, toTree(amount)]);
    this.addNode(condition);
    return this;
  }
  
  // === ANNOUNCEMENTS ===
  
  createAnnouncement(message: string | Uint8Array | Expression): PuzzleBuilder {
    this.featuresUsed.add('CREATE_COIN_ANNOUNCEMENT');
    const opcodeExpr = this.shouldUseSymbolicConditionCode(60)
      ? sym('CREATE_COIN_ANNOUNCEMENT')
      : int(60);
    const condition = list([opcodeExpr, toTree(message)]);
    this.addNode(condition);
    return this;
  }
  
  assertAnnouncement(announcementId: string | Uint8Array | Expression): PuzzleBuilder {
    this.featuresUsed.add('ASSERT_COIN_ANNOUNCEMENT');
    const opcodeExpr = this.shouldUseSymbolicConditionCode(61)
      ? sym('ASSERT_COIN_ANNOUNCEMENT')
      : int(61);
    const condition = list([opcodeExpr, toTree(announcementId)]);
    this.addNode(condition);
    return this;
  }
  
  // === ASSERTIONS ===
  
  assertMyPuzzleHash(hash: string | Uint8Array): PuzzleBuilder {
    this.featuresUsed.add('ASSERT_MY_PUZZLEHASH');
    const opcodeExpr = this.shouldUseSymbolicConditionCode(72)
      ? sym('ASSERT_MY_PUZZLEHASH')
      : int(72);
    const condition = list([opcodeExpr, toTree(hash)]);
    this.addNode(condition);
    return this;
  }
  
  assertMyCoinId(id: string | Uint8Array): PuzzleBuilder {
    this.featuresUsed.add('ASSERT_MY_COIN_ID');
    const opcodeExpr = this.shouldUseSymbolicConditionCode(70)
      ? sym('ASSERT_MY_COIN_ID')
      : int(70);
    const condition = list([opcodeExpr, toTree(id)]);
    this.addNode(condition);
    return this;
  }
  
  assertMyParentId(id: string | Uint8Array): PuzzleBuilder {
    this.featuresUsed.add('ASSERT_MY_PARENT_ID');
    const opcodeExpr = this.shouldUseSymbolicConditionCode(71)
      ? sym('ASSERT_MY_PARENT_ID')
      : int(71);
    const condition = list([opcodeExpr, toTree(id)]);
    this.addNode(condition);
    return this;
  }
  
  assertMyAmount(amount: number | bigint | Expression): PuzzleBuilder {
    this.featuresUsed.add('ASSERT_MY_AMOUNT');
    const opcodeExpr = this.shouldUseSymbolicConditionCode(73)
      ? sym('ASSERT_MY_AMOUNT')
      : int(73);
    const condition = list([opcodeExpr, toTree(amount)]);
    this.addNode(condition);
    return this;
  }
  
  createPuzzleAnnouncement(message: string | Uint8Array): PuzzleBuilder {
    this.featuresUsed.add('CREATE_PUZZLE_ANNOUNCEMENT');
    const opcodeExpr = this.shouldUseSymbolicConditionCode(62)
      ? sym('CREATE_PUZZLE_ANNOUNCEMENT')
      : int(62);
    const condition = list([opcodeExpr, toTree(message)]);
    this.addNode(condition);
    return this;
  }
  
  assertPuzzleAnnouncement(announcementId: string | Uint8Array): PuzzleBuilder {
    this.featuresUsed.add('ASSERT_PUZZLE_ANNOUNCEMENT');
    const opcodeExpr = this.shouldUseSymbolicConditionCode(63)
      ? sym('ASSERT_PUZZLE_ANNOUNCEMENT')
      : int(63);
    const condition = list([opcodeExpr, toTree(announcementId)]);
    this.addNode(condition);
    return this;
  }
  
  // === RAW CONDITIONS ===
  
  addCondition(opcode: number, ...args: (Expression | string | number | Uint8Array)[]): PuzzleBuilder {
    // Get symbolic name if available
    const conditionName = getConditionCodeName(opcode);
    if (conditionName) {
      this.featuresUsed.add(conditionName);
    }
    
    const opcodeExpr = this.shouldUseSymbolicConditionCode(opcode) && conditionName
      ? sym(conditionName)
      : int(opcode);
      
    const condition = list([opcodeExpr, ...args.map(toTree)]);
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
    // Instead of using the assert macro, generate the expanded form directly
    // assert expands to: (i condition () (x))
    // This means: if condition is true, return nil; otherwise raise exception
    const assertion = list([
      IF,  // 'i' operator
      condition.tree,
      NIL, // return nil if condition is true
      list([RAISE]) // raise exception if condition is false
    ]);
    this.addNode(assertion);
    return this;
  }
  
  returnConditions(value?: Expression | TreeNode): PuzzleBuilder {
    if (value) {
      if (value instanceof Expression) {
        this.returnValue(value);
      } else {
        this.returnValue(expr(value));
      }
    } else {
      // Return all accumulated conditions
      const conditions = this.buildNodeList(this.nodes);
      this.nodes = [conditions];
    }
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
    
    // Auto-include required files
    this.autoInclude();
    
    // If we have a custom mod (e.g., from loaded Chialisp), use it
    if (this.customMod) {
      // Apply curried parameters if any
      if (this.curriedParams.size > 0) {
        const substitutions = new Map<string, TreeNode>();
        this.curriedParams.forEach((value, name) => {
          substitutions.set(name, value);
        });
        return substitute(this.customMod, substitutions);
      }
      return this.customMod;
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
  
  serialize(options?: SerializeOptions): string {
    const tree = this.build();
    
    // Default to chialisp format
    const format = options?.format || 'chialisp';
    
    if (format === 'chialisp') {
    const clspCode = serialize(tree, {
        indent: options?.indent,
      comments: this.comments,
      blockComments: this.blockComments,
      includedLibraries: this.includes
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
    
    // For other formats, we need to use clvm-lib
    try {
      // First serialize to ChiaLisp
      let clspCode = serialize(tree, {
        comments: this.comments,
        blockComments: this.blockComments,
        includedLibraries: this.includes
      });
      
      // Preprocess includes by inlining libraries
      if (clspCode.includes('(include condition_codes.clib)')) {
        // Define the condition codes inline
        const conditionCodes = `
          (defconstant AGG_SIG_UNSAFE 49)
          (defconstant AGG_SIG_ME 50)
          (defconstant CREATE_COIN 51)
          (defconstant RESERVE_FEE 52)
          (defconstant CREATE_COIN_ANNOUNCEMENT 60)
          (defconstant ASSERT_COIN_ANNOUNCEMENT 61)
          (defconstant CREATE_PUZZLE_ANNOUNCEMENT 62)
          (defconstant ASSERT_PUZZLE_ANNOUNCEMENT 63)
          (defconstant ASSERT_MY_COIN_ID 70)
          (defconstant ASSERT_MY_PARENT_ID 71)
          (defconstant ASSERT_MY_PUZZLEHASH 72)
          (defconstant ASSERT_MY_AMOUNT 73)
          (defconstant ASSERT_SECONDS_RELATIVE 80)
          (defconstant ASSERT_SECONDS_ABSOLUTE 81)
          (defconstant ASSERT_HEIGHT_RELATIVE 82)
          (defconstant ASSERT_HEIGHT_ABSOLUTE 83)
          (defconstant REMARK 1)
        `;
        
        // Replace the include with the actual constants
        clspCode = clspCode.replace('(include condition_codes.clib)', conditionCodes);
      }
      
      // Inline utility macros
      if (clspCode.includes('(include utility_macros.clib)')) {
        // Define the utility macros inline
        const utilityMacros = `
          (defmacro assert items
              (if (r items)
                  (list if (f items) (c assert (r items)) (q . (x)))
                  (f items)
              )
          )
          
          (defmacro or ARGS
              (if ARGS
                  (qq (if (unquote (f ARGS))
                          1
                          (unquote (c or (r ARGS)))
                      )
                  )
                  0
              )
          )
          
          (defmacro and ARGS
              (if ARGS
                  (qq (if (unquote (f ARGS))
                          (unquote (c and (r ARGS)))
                          ()
                      )
                  )
                  1
              )
          )
        `;
        
        // Replace the include with the actual macros
        clspCode = clspCode.replace('(include utility_macros.clib)', utilityMacros);
      }
      
      // Inline sha256tree.clib
      if (clspCode.includes('(include sha256tree.clib)')) {
        const sha256treeFuncs = `
          (defun sha256tree (TREE)
            (if (l TREE)
              (sha256 2 (sha256tree (f TREE)) (sha256tree (r TREE)))
              (sha256 1 TREE)))
        `;
        clspCode = clspCode.replace('(include sha256tree.clib)', sha256treeFuncs);
      }
      
      // Inline curry-and-treehash.clinc - simplified version with just sha256tree
      if (clspCode.includes('(include curry-and-treehash.clinc)')) {
        const curryAndTreehash = `
          ; Essential function for tree hashing
          (defun sha256tree (TREE)
            (if (l TREE)
                (sha256 2 (sha256tree (f TREE)) (sha256tree (r TREE)))
                (sha256 1 TREE)))
        `;
        clspCode = clspCode.replace('(include curry-and-treehash.clinc)', curryAndTreehash);
      }
      
      // Create a Program from the ChiaLisp code
      const program = Program.fromSource(clspCode);
      
      // Handle single_puzzle mode - curry inner puzzles
      let finalProgram = program;
      if (options?.single_puzzle && options.innerPuzzles && options.innerPuzzles.length > 0) {
        // Build all inner puzzles and curry them
        const innerPrograms = options.innerPuzzles.map(p => {
          const innerClsp = serialize(p.build());
          return Program.fromSource(innerClsp);
        });
        
        // Curry each inner puzzle into the main puzzle
        finalProgram = program.curry(innerPrograms);
      }
      
      // Compile if requested or required for the format
      const needsCompilation = options?.compiled || format === 'modhash' || format === 'hex';
      if (needsCompilation) {
        // Compile the program
        const compiledOutput = finalProgram.compile();
        
        // The compile() method returns an object with value and cost properties
        // Extract the actual compiled program
        if (typeof compiledOutput === 'object' && compiledOutput !== null && 'value' in compiledOutput) {
          // Update finalProgram to be the compiled result
          finalProgram = compiledOutput.value;
        } else {
          throw new Error('Unexpected compile output format');
        }
      }
      
      // Return based on format
      switch (format) {
        case 'clvm':
          return finalProgram.toString();
        case 'hex':
          // Use serializeHex for hex format
          return finalProgram.serializeHex();
        case 'modhash':
          return finalProgram.hashHex();
        default:
          throw new Error(`Unknown format: ${format as string}`);
      }
    } catch (error) {
      throw new Error(`Failed to serialize to ${format}: ${error instanceof Error ? error.message : String(error)}`);
    }
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
   * Get the puzzle reveal (serialized hex) for use in spend bundles
   * This is the compiled CLVM in hex format without 0x prefix
   */
  toPuzzleReveal(): string {
    return this.serialize({ format: 'hex', compiled: true }).slice(2);
  }
  
  /**
   * Convert to ChiaLisp source code string
   */
  toChiaLisp(options?: { indent?: boolean }): string {
    return this.serialize({ format: 'chialisp', indent: options?.indent });
  }
  
  /**
   * Convert to compiled CLVM hex string
   */
  toCLVM(): string {
    return this.serialize({ format: 'hex', compiled: true });
  }
  
  /**
   * Create an unsigned spend bundle with this puzzle and the given solution
   */
  toUnsignedSpendBundle(solution: SolutionBuilder | string | TreeNode, coin: { parent_coin_info: string; amount: bigint | number; puzzle_hash?: string }): { coin_spends: unknown[]; aggregated_signature: string } {
    const puzzleReveal = Buffer.from(this.toPuzzleReveal(), 'hex');
    
    // Handle different solution types
    let solutionHex: string;
    if (solution instanceof SolutionBuilder) {
      solutionHex = solution.toHex().slice(2); // Remove 0x prefix
    } else if (typeof solution === 'string') {
      // Assume it's ChiaLisp - compile it
      const solutionProgram = Program.fromSource(solution);
      solutionHex = solutionProgram.serializeHex();
    } else {
      // TreeNode - serialize it
      const solutionProgram = Program.fromSource(serialize(solution));
      solutionHex = solutionProgram.serializeHex();
    }
    
    const coinSpend = {
      coin: {
        parent_coin_info: coin.parent_coin_info,
        puzzle_hash: coin.puzzle_hash || this.toModHash().slice(2),
        amount: coin.amount
      },
      puzzleReveal,
      solution: Buffer.from(solutionHex, 'hex')
    };
    
    return {
      coin_spends: [coinSpend],
      aggregated_signature: '0xc00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'
    };
  }
  
  /**
   * Simulate spending this puzzle with the given solution
   * Returns the result and cost
   */
  simulateSpend(solution: string | SolutionBuilder | TreeNode | Program): { result: unknown; cost: number } {
    return this.simulate(solution);
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
    // Use CONS constant name if opcodes.clib is included
    const consOperator = this.shouldUseSymbolicOpcodeConstant() ? sym('CONS') : CONS;
    return nodes.reduceRight((rest, node) => 
      list([consOperator, node, rest]), 
      NIL
    );
  }

  /**
   * Load a ChiaLisp (.clsp) file and create a PuzzleBuilder from it
   * @param filePath Path to the .clsp file
   * @returns PuzzleBuilder instance with the loaded puzzle
   */
  static fromChiaLisp(filePath: string): PuzzleBuilder {
    try {
      // Read the file
      const source = readFileSync(filePath, 'utf-8');
      
      // Parse the ChiaLisp code
      const ast = parseChialisp(source);
      
      // Create a new PuzzleBuilder with the parsed AST
      const builder = new PuzzleBuilder();
      builder.withMod(ast);
      
      // Extract parameters from the mod if present
      if (ast.type === 'list' && ast.items.length >= 2) {
        const firstItem = ast.items[0];
        if (firstItem.type === 'atom' && firstItem.value === 'mod') {
          const paramList = ast.items[1];
          if (paramList.type === 'list') {
            const params = paramList.items
              .filter((item): item is Atom => item.type === 'atom' && typeof item.value === 'string')
              .map(item => item.value as string);
            
            // Separate curried vs solution parameters by convention
            // (uppercase = curried, lowercase = solution)
            const curriedParams: string[] = [];
            const solutionParams: string[] = [];
            
            for (const param of params) {
              if (param === param.toUpperCase() && param !== '@') {
                curriedParams.push(param);
              } else if (param !== '@') {
                solutionParams.push(param);
              }
            }
            
            // Apply parameters to the builder
            if (curriedParams.length > 0) {
              const paramObj: Record<string, string> = {};
              curriedParams.forEach(p => paramObj[p] = p);
              builder.withCurriedParams(paramObj);
            }
            
            if (solutionParams.length > 0) {
              builder.withSolutionParams(...solutionParams);
            }
          }
        }
      }
      
      return builder;
    } catch (error) {
      throw new Error(`Failed to load ChiaLisp file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load a CoinScript (.coins) file and create a PuzzleBuilder from it
   * @param filePath Path to the .coins file
   * @returns PuzzleBuilder instance with the compiled puzzle
   */
  static fromCoinScript(filePath: string): PuzzleBuilder {
    try {
      // Import is deferred to avoid circular dependency
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const coinscriptModule = require('../coinscript/parser');
      const compileCoinScript = coinscriptModule.compileCoinScript as (source: string) => { mainPuzzle: PuzzleBuilder };
      
      // Read the file
      const source = readFileSync(filePath, 'utf-8');
      
      // Compile the CoinScript
      const result = compileCoinScript(source);
      
      // Return the main puzzle
      return result.mainPuzzle;
    } catch (error) {
      throw new Error(`Failed to load CoinScript file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check if we should use symbolic condition code names
   */
  private shouldUseSymbolicConditionCode(_opcode: number): boolean {
    // Use symbolic names if:
    // 1. condition_codes.clib is manually included, OR
    // 2. we're tracking features that will auto-include it
    
    // Check if manually included
    if (this.includes.some(inc => inc.includes('condition_codes'))) {
      return true;
    }
    
    // Check if we have any condition-related features that will trigger auto-include
    const hasConditionFeatures = Array.from(this.featuresUsed).some(f => 
      f.includes('CREATE_COIN') ||
      f.includes('AGG_SIG') ||
      f.includes('ASSERT_') ||
      f.includes('RESERVE_FEE') ||
      f.includes('ANNOUNCEMENT') ||
      f === 'REMARK'
    );
    
    return hasConditionFeatures;
  }
  
  /**
   * Check if we should use symbolic opcode constant names
   */
  private shouldUseSymbolicOpcodeConstant(): boolean {
    // Only use symbolic names if opcodes.clib is manually included
    return this.includes.some(inc => inc.includes('opcodes.clib'));
  }
  
  /**
   * Automatically determine and add required includes based on features used
   */
  private autoInclude(): void {
    const requiredIncludes = determineRequiredIncludes(this.featuresUsed);
    
    // Add auto-determined includes that aren't already manually included
    for (const include of requiredIncludes) {
      if (!this.includes.includes(include)) {
        this.includes.push(include);
      }
    }
  }

  /**
   * Simulate running this puzzle with a given solution
   * Returns the result or throws an error with details
   */
  simulate(solution: string | number[] | SolutionBuilder | Program | TreeNode): { result: unknown; cost: number } {
    try {
      // Build the puzzle tree
      const puzzleTree = this.build();
      
      // Serialize to ChiaLisp first
      const clspCode = serialize(puzzleTree, {
        comments: this.comments,
        blockComments: this.blockComments,
        includedLibraries: this.includes
      });
      
      // Create a Program from ChiaLisp
      const program = Program.fromSource(clspCode);
      
      // Prepare solution - convert to proper format
      let solutionProgram: Program;
      if (typeof solution === 'string') {
        solutionProgram = Program.fromSource(solution);
      } else if (Array.isArray(solution)) {
        // Convert array to list format
        const solutionStr = this.arrayToClsp(solution);
        solutionProgram = Program.fromSource(solutionStr);
      } else if (solution instanceof SolutionBuilder) {
        // Get the hex and convert to Program
        const hexStr = solution.toHex();
        solutionProgram = Program.deserializeHex(hexStr);
      } else if ('serializeHex' in solution && typeof solution.serializeHex === 'function') {
        // It's already a Program
        solutionProgram = solution as Program;
      } else {
        // TreeNode - serialize it first
        const solutionStr = serialize(solution as TreeNode);
        solutionProgram = Program.fromSource(solutionStr);
      }
      
      // Run the puzzle with the solution
      const result = program.run(solutionProgram);
      
      return {
        result: result.value,
        cost: typeof result.cost === 'bigint' ? Number(result.cost) : result.cost
      };
    } catch (error) {
      throw new Error(`Simulation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Convert JavaScript array to ChiaLisp list format
   */
  private arrayToClsp(arr: unknown[]): string {
    if (arr.length === 0) return '()';
    
    const elements = arr.map(item => {
      if (typeof item === 'string') {
        // Check if it's a hex string
        if (item.startsWith('0x')) {
          return item;
        }
        // Otherwise quote it
        return `"${item}"`;
      } else if (typeof item === 'number' || typeof item === 'bigint') {
        return String(item);
      } else if (Array.isArray(item)) {
        return this.arrayToClsp(item);
      } else {
        return String(item);
      }
    });
    
    return `(${elements.join(' ')})`;
  }
  
  /**
   * Validate that this puzzle produces valid conditions
   * Returns true if valid, throws error if not
   */
  validateConditions(solution: string | number[] | SolutionBuilder | Program | TreeNode): boolean {
    try {
      const result = this.simulate(solution);
      
      // Check if result is a list of conditions
      if (!Array.isArray(result.result)) {
        throw new Error('Puzzle must return a list of conditions');
      }
      
      // Validate each condition
      for (const condition of result.result) {
        if (!Array.isArray(condition) || condition.length < 1) {
          throw new Error('Each condition must be a list with at least an opcode');
        }
        
        const opcode = condition[0];
        
        // Validate known opcodes
        switch (opcode) {
          case 51: // CREATE_COIN
            if (condition.length < 3) {
              throw new Error('CREATE_COIN requires puzzle_hash and amount');
            }
            break;
          case 50: // AGG_SIG_ME
            if (condition.length < 3) {
              throw new Error('AGG_SIG_ME requires pubkey and message');
            }
            break;
          // Add more validation as needed
        }
      }
      
      return true;
    } catch (error) {
      throw new Error(`Condition validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Add conditions conditionally (alias for if with conditions)
   * @deprecated Use if() instead
   */
  ifConditions(condition: Expression): PuzzleBuilder {
    return this.if(condition);
  }
  
  /**
   * Add a parameter (alias for add in solution builder context)
   * @deprecated This is a solution builder method, not puzzle builder
   */
  addParam(_value: unknown): PuzzleBuilder {
    throw new Error('addParam is a SolutionBuilder method. Use withSolutionParams() or withCurriedParams() for puzzles.');
  }
  
  /**
   * Validate state structure
   */
  validateState(stateStructure?: Record<string, string>): PuzzleBuilder {
    this.comment('State validation');
    if (stateStructure) {
      this.comment(`Expected state fields: ${Object.keys(stateStructure).join(', ')}`);
    }
    // In a real implementation, this would generate validation logic
    return this;
  }
  
  /**
   * Create a reference to an inner puzzle (for layer patterns)
   */
  inner(): Expression {
    return new Expression(sym('INNER_PUZZLE'));
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
  // Handle numeric parameter references
  if (/^\d+$/.test(name)) {
    return new Expression(int(parseInt(name)));
  }
  // Handle @ symbol for arg1
  if (name === '@') {
    return new Expression(ARG);
  }
  // For other names, create a symbol
  return new Expression(sym(name));
}

// Convenience exports
export { Expression as Expr }; 

export interface SerializeOptions {
  /** Whether to indent the output */
  indent?: boolean;
  /** Whether to use opcode constants from opcodes.clib (defaults to same as indent) */
  useOpcodeConstants?: boolean;
  /** Output format */
  format?: 'chialisp' | 'clvm' | 'hex' | 'modhash';
  /** Whether to compile to CLVM first (for clvm/hex/modhash formats) */
  compiled?: boolean;
  /** Whether to curry all inner puzzles into a single puzzle */
  single_puzzle?: boolean;
  /** Inner puzzles to curry (for single_puzzle mode) */
  innerPuzzles?: PuzzleBuilder[];
} 