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
  
  createCoin(puzzleHash: string | Uint8Array, amount: number | bigint | Expression, memo?: string | Uint8Array): PuzzleBuilder {
    // Use symbolic name if condition codes are included
    const opcodeExpr = this.includes.includes('condition_codes.clvm') || this.includes.includes('condition_codes.clib')
      ? sym('CREATE_COIN')
      : int(51);
    
    // Handle puzzle hash - if it's a parameter name (not hex), treat it as a variable
    let puzzleHashExpr: TreeNode;
    if (typeof puzzleHash === 'string' && !puzzleHash.startsWith('0x') && puzzleHash.match(/^[a-zA-Z_]\w*$/)) {
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
    const msg = message || new Expression(list([SHA256TREE1, ARG1]));
    const opcodeExpr = this.includes.includes('condition_codes.clvm') || this.includes.includes('condition_codes.clib')
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
    const opcodeExpr = this.includes.includes('condition_codes.clvm') || this.includes.includes('condition_codes.clib')
      ? sym('CREATE_COIN_ANNOUNCEMENT')
      : int(60);
    const condition = list([opcodeExpr, toTree(message)]);
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
    // Map of opcodes to their symbolic names from condition_codes.clib
    const opcodeNames: Record<number, string> = {
      1: 'REMARK',
      49: 'AGG_SIG_UNSAFE',
      50: 'AGG_SIG_ME',
      51: 'CREATE_COIN',
      52: 'RESERVE_FEE',
      60: 'CREATE_COIN_ANNOUNCEMENT',
      61: 'ASSERT_COIN_ANNOUNCEMENT',
      62: 'CREATE_PUZZLE_ANNOUNCEMENT',
      63: 'ASSERT_PUZZLE_ANNOUNCEMENT',
      70: 'ASSERT_MY_COIN_ID',
      71: 'ASSERT_MY_PARENT_ID',
      72: 'ASSERT_MY_PUZZLEHASH',
      73: 'ASSERT_MY_AMOUNT',
      80: 'ASSERT_SECONDS_RELATIVE',
      81: 'ASSERT_SECONDS_ABSOLUTE',
      82: 'ASSERT_HEIGHT_RELATIVE',
      83: 'ASSERT_HEIGHT_ABSOLUTE'
    };
    
    // Use symbolic name if condition codes are included and we have a name for this opcode
    const hasConditionCodes = this.includes.includes('condition_codes.clvm') || this.includes.includes('condition_codes.clib');
    const opcodeExpr = hasConditionCodes && opcodeNames[opcode]
      ? sym(opcodeNames[opcode])
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
    // Assert condition is true using (if (not condition) (x) ())
    const assertion = list([
      IF,
      list([NOT, condition.tree]),
      list([RAISE]),  // Raise exception if condition is false
      NIL  // Do nothing if condition is true
    ]);
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
    
    // For other formats, we need to use clvm-lib
    try {
      // First serialize to ChiaLisp
      let clspCode = serialize(tree, {
        comments: this.comments,
        blockComments: this.blockComments
      });
      
      // Preprocess includes by inlining condition codes
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

  /**
   * Load a ChiaLisp (.clsp) file and create a PuzzleBuilder from it
   * @param filePath Path to the .clsp file
   * @returns PuzzleBuilder instance with the loaded puzzle
   */
  static fromClsp(filePath: string): PuzzleBuilder {
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
      const { compileCoinScript } = require('../coinscript/parser') as {
        compileCoinScript: (source: string) => { mainPuzzle: PuzzleBuilder };
      };
      
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
  /** Output format */
  format?: 'chialisp' | 'clvm' | 'hex' | 'modhash';
  /** Whether to compile to CLVM first (for clvm/hex/modhash formats) */
  compiled?: boolean;
  /** Whether to curry all inner puzzles into a single puzzle */
  single_puzzle?: boolean;
  /** Inner puzzles to curry (for single_puzzle mode) */
  innerPuzzles?: PuzzleBuilder[];
} 