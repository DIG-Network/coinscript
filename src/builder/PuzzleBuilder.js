"use strict";
/**
 * PuzzleBuilder - Fluent API for building Chia puzzles
 *
 * The main external interface for the framework
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Expr = exports.PuzzleBuilder = exports.solution = exports.arg3 = exports.arg2 = exports.arg1 = exports.amount = exports.Expression = void 0;
exports.puzzle = puzzle;
exports.expr = expr;
exports.variable = variable;
const core_1 = require("../core");
const clspFormatter_1 = require("../core/clspFormatter");
const opcodes_1 = require("../core/opcodes");
const clvm_lib_1 = require("clvm-lib");
const fs_1 = require("fs");
const parser_1 = require("../chialisp/parser");
const includeIndex_1 = require("../chialisp/includeIndex");
const SolutionBuilder_1 = require("./SolutionBuilder");
// Expression builder for composable values
class Expression {
    constructor(tree) {
        this.tree = tree;
    }
    // Arithmetic
    add(other) {
        return new Expression((0, core_1.list)([opcodes_1.ADD, this.tree, toTree(other)]));
    }
    subtract(other) {
        return new Expression((0, core_1.list)([opcodes_1.SUBTRACT, this.tree, toTree(other)]));
    }
    multiply(other) {
        return new Expression((0, core_1.list)([opcodes_1.MULTIPLY, this.tree, toTree(other)]));
    }
    divide(other) {
        return new Expression((0, core_1.list)([opcodes_1.DIVIDE, this.tree, toTree(other)]));
    }
    // Comparison
    greaterThan(other) {
        return new Expression((0, core_1.list)([opcodes_1.GT, this.tree, toTree(other)]));
    }
    greaterThanBytes(other) {
        return new Expression((0, core_1.list)([opcodes_1.GTS, this.tree, toTree(other)]));
    }
    equals(other) {
        return new Expression((0, core_1.list)([opcodes_1.EQ, this.tree, toTree(other)]));
    }
    // Logic
    not() {
        return new Expression((0, core_1.list)([opcodes_1.NOT, this.tree]));
    }
    and(other) {
        return new Expression((0, core_1.list)([opcodes_1.ALL, this.tree, other.tree]));
    }
    or(other) {
        return new Expression((0, core_1.list)([opcodes_1.ANY, this.tree, other.tree]));
    }
    // Hashing
    sha256() {
        return new Expression((0, core_1.list)([opcodes_1.SHA256, this.tree]));
    }
    treeHash() {
        return new Expression((0, core_1.list)([opcodes_1.SHA256TREE1, this.tree]));
    }
}
exports.Expression = Expression;
exports.Expr = Expression;
// Helper to convert various types to trees
function toTree(value) {
    if (value instanceof Expression)
        return value.tree;
    if (typeof value === 'number' || typeof value === 'bigint')
        return (0, core_1.int)(value);
    if (typeof value === 'string')
        return (0, core_1.hex)(value);
    if (value instanceof Uint8Array) {
        // Convert Uint8Array to hex string
        const hexStr = Array.from(value)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        return (0, core_1.hex)(hexStr);
    }
    return value;
}
// Built-in expressions
exports.amount = new Expression(opcodes_1.ARG);
exports.arg1 = new Expression(opcodes_1.ARG1);
exports.arg2 = new Expression(opcodes_1.ARG2);
exports.arg3 = new Expression(opcodes_1.ARG3);
exports.solution = new Expression(opcodes_1.ARG1);
// Main builder class
class PuzzleBuilder {
    constructor() {
        this.nodes = [];
        this.currentContext = 'main';
        this.thenNodes = [];
        this.elseNodes = [];
        // New fields for mod support
        this.curriedParams = new Map();
        this.solutionParams = [];
        this.isModStructure = true; // Default to creating mod structures
        this.includes = []; // Library includes
        this.comments = new Map(); // Comments for nodes
        this.blockComments = []; // Block comments to add before the body
        this.featuresUsed = new Set(); // Track features for auto-includes
    }
    // === MOD STRUCTURE SUPPORT ===
    /**
     * Add a comment to the next node added
     */
    comment(text) {
        // Store the comment to be associated with the next node
        this._pendingComment = text;
        return this;
    }
    /**
     * Add a block comment (standalone comment line)
     */
    blockComment(text) {
        this.blockComments.push(text);
        return this;
    }
    /**
     * Include a ChiaLisp library file
     */
    include(libraryPath) {
        this.includes.push(libraryPath);
        return this;
    }
    /**
     * Include standard condition codes library
     */
    includeConditionCodes() {
        return this.include('condition_codes.clib');
    }
    /**
     * Include curry and treehash library
     */
    includeCurryAndTreehash() {
        return this.include('curry-and-treehash.clinc');
    }
    /**
     * Include CAT truths library
     */
    includeCatTruths() {
        return this.include('cat_truths.clib');
    }
    /**
     * Include utility macros library
     */
    includeUtilityMacros() {
        return this.include('utility_macros.clib');
    }
    /**
     * Include CLVM opcode constants
     */
    includeOpcodes() {
        this.featuresUsed.add('_opcodes_constants');
        return this.include('opcodes.clib');
    }
    /**
     * Include all standard libraries commonly used
     */
    includeStandardLibraries() {
        return this
            .includeConditionCodes()
            .includeCurryAndTreehash()
            .includeCatTruths()
            .includeUtilityMacros();
    }
    /**
     * Define curried parameters that will be baked into the puzzle
     */
    withCurriedParams(params) {
        Object.entries(params).forEach(([name, value]) => {
            this.curriedParams.set(name, toTree(value));
        });
        return this;
    }
    /**
     * Define solution parameters expected when the puzzle is solved
     */
    withSolutionParams(...params) {
        this.solutionParams.push(...params);
        return this;
    }
    /**
     * Access a parameter as a variable (not its value)
     */
    param(name) {
        return new Expression((0, core_1.sym)(name));
    }
    /**
     * Disable mod structure generation (for simple expressions)
     */
    noMod() {
        this.isModStructure = false;
        return this;
    }
    /**
     * Set a custom mod structure (e.g., from loaded Chialisp)
     */
    withMod(modAst) {
        this.customMod = modAst;
        return this;
    }
    // === COIN OPERATIONS ===
    createCoin(puzzleHash, amount, memo) {
        // Track feature usage
        this.featuresUsed.add('CREATE_COIN');
        // Use symbolic name if condition codes are included or will be auto-included
        const opcodeExpr = this.shouldUseSymbolicConditionCode(51)
            ? (0, core_1.sym)('CREATE_COIN')
            : (0, core_1.int)(51);
        // Handle puzzle hash - if it's a parameter name (not hex), treat it as a variable
        let puzzleHashExpr;
        if (typeof puzzleHash === 'string' && !puzzleHash.startsWith('0x') && puzzleHash.match(/^[a-zA-Z_]\w*$/)) {
            // It's a variable name
            puzzleHashExpr = (0, core_1.sym)(puzzleHash);
        }
        else {
            puzzleHashExpr = toTree(puzzleHash);
        }
        const condition = memo
            ? (0, core_1.list)([
                opcodeExpr,
                puzzleHashExpr,
                toTree(amount),
                toTree(memo)
            ])
            : (0, core_1.list)([
                opcodeExpr,
                puzzleHashExpr,
                toTree(amount)
            ]);
        this.addNode(condition);
        return this;
    }
    // === SIGNATURES ===
    requireSignature(pubkey, message) {
        // Track feature usage
        this.featuresUsed.add('AGG_SIG_ME');
        // For AGG_SIG_ME, if no message is provided, we use a simple default
        let msg;
        if (message) {
            msg = message;
        }
        else {
            // Use a simple default message - empty bytes for now
            // In production, this would typically be the tree hash of the solution
            msg = new Expression(opcodes_1.NIL);
        }
        const opcodeExpr = this.shouldUseSymbolicConditionCode(50)
            ? (0, core_1.sym)('AGG_SIG_ME')
            : (0, core_1.int)(50);
        const condition = (0, core_1.list)([
            opcodeExpr,
            toTree(pubkey),
            msg.tree
        ]);
        this.addNode(condition);
        return this;
    }
    requireMySignature(pubkey) {
        return this.requireSignature(pubkey);
    }
    requireSignatureUnsafe(pubkey, message) {
        // Track feature usage
        this.featuresUsed.add('AGG_SIG_UNSAFE');
        const opcodeExpr = this.shouldUseSymbolicConditionCode(49)
            ? (0, core_1.sym)('AGG_SIG_UNSAFE')
            : (0, core_1.int)(49);
        const condition = (0, core_1.list)([
            opcodeExpr,
            toTree(pubkey),
            message.tree
        ]);
        this.addNode(condition);
        return this;
    }
    // === TIME LOCKS ===
    requireAfterSeconds(seconds) {
        this.featuresUsed.add('ASSERT_SECONDS_RELATIVE');
        const opcodeExpr = this.shouldUseSymbolicConditionCode(80)
            ? (0, core_1.sym)('ASSERT_SECONDS_RELATIVE')
            : (0, core_1.int)(80);
        const condition = (0, core_1.list)([opcodeExpr, toTree(seconds)]);
        this.addNode(condition);
        return this;
    }
    requireAfterHeight(height) {
        this.featuresUsed.add('ASSERT_HEIGHT_RELATIVE');
        const opcodeExpr = this.shouldUseSymbolicConditionCode(82)
            ? (0, core_1.sym)('ASSERT_HEIGHT_RELATIVE')
            : (0, core_1.int)(82);
        const condition = (0, core_1.list)([opcodeExpr, toTree(height)]);
        this.addNode(condition);
        return this;
    }
    requireBeforeSeconds(seconds) {
        this.featuresUsed.add('ASSERT_SECONDS_ABSOLUTE');
        const opcodeExpr = this.shouldUseSymbolicConditionCode(81)
            ? (0, core_1.sym)('ASSERT_SECONDS_ABSOLUTE')
            : (0, core_1.int)(81);
        const condition = (0, core_1.list)([opcodeExpr, toTree(seconds)]);
        this.addNode(condition);
        return this;
    }
    requireBeforeHeight(height) {
        this.featuresUsed.add('ASSERT_HEIGHT_ABSOLUTE');
        const opcodeExpr = this.shouldUseSymbolicConditionCode(83)
            ? (0, core_1.sym)('ASSERT_HEIGHT_ABSOLUTE')
            : (0, core_1.int)(83);
        const condition = (0, core_1.list)([opcodeExpr, toTree(height)]);
        this.addNode(condition);
        return this;
    }
    // === FEES ===
    reserveFee(amount) {
        this.featuresUsed.add('RESERVE_FEE');
        const opcodeExpr = this.shouldUseSymbolicConditionCode(52)
            ? (0, core_1.sym)('RESERVE_FEE')
            : (0, core_1.int)(52);
        const condition = (0, core_1.list)([opcodeExpr, toTree(amount)]);
        this.addNode(condition);
        return this;
    }
    // === ANNOUNCEMENTS ===
    createAnnouncement(message) {
        this.featuresUsed.add('CREATE_COIN_ANNOUNCEMENT');
        const opcodeExpr = this.shouldUseSymbolicConditionCode(60)
            ? (0, core_1.sym)('CREATE_COIN_ANNOUNCEMENT')
            : (0, core_1.int)(60);
        const condition = (0, core_1.list)([opcodeExpr, toTree(message)]);
        this.addNode(condition);
        return this;
    }
    assertAnnouncement(announcementId) {
        this.featuresUsed.add('ASSERT_COIN_ANNOUNCEMENT');
        const opcodeExpr = this.shouldUseSymbolicConditionCode(61)
            ? (0, core_1.sym)('ASSERT_COIN_ANNOUNCEMENT')
            : (0, core_1.int)(61);
        const condition = (0, core_1.list)([opcodeExpr, toTree(announcementId)]);
        this.addNode(condition);
        return this;
    }
    // === ASSERTIONS ===
    assertMyPuzzleHash(hash) {
        this.featuresUsed.add('ASSERT_MY_PUZZLEHASH');
        const opcodeExpr = this.shouldUseSymbolicConditionCode(72)
            ? (0, core_1.sym)('ASSERT_MY_PUZZLEHASH')
            : (0, core_1.int)(72);
        const condition = (0, core_1.list)([opcodeExpr, toTree(hash)]);
        this.addNode(condition);
        return this;
    }
    assertMyCoinId(id) {
        this.featuresUsed.add('ASSERT_MY_COIN_ID');
        const opcodeExpr = this.shouldUseSymbolicConditionCode(70)
            ? (0, core_1.sym)('ASSERT_MY_COIN_ID')
            : (0, core_1.int)(70);
        const condition = (0, core_1.list)([opcodeExpr, toTree(id)]);
        this.addNode(condition);
        return this;
    }
    assertMyParentId(id) {
        this.featuresUsed.add('ASSERT_MY_PARENT_ID');
        const opcodeExpr = this.shouldUseSymbolicConditionCode(71)
            ? (0, core_1.sym)('ASSERT_MY_PARENT_ID')
            : (0, core_1.int)(71);
        const condition = (0, core_1.list)([opcodeExpr, toTree(id)]);
        this.addNode(condition);
        return this;
    }
    assertMyAmount(amount) {
        this.featuresUsed.add('ASSERT_MY_AMOUNT');
        const opcodeExpr = this.shouldUseSymbolicConditionCode(73)
            ? (0, core_1.sym)('ASSERT_MY_AMOUNT')
            : (0, core_1.int)(73);
        const condition = (0, core_1.list)([opcodeExpr, toTree(amount)]);
        this.addNode(condition);
        return this;
    }
    createPuzzleAnnouncement(message) {
        this.featuresUsed.add('CREATE_PUZZLE_ANNOUNCEMENT');
        const opcodeExpr = this.shouldUseSymbolicConditionCode(62)
            ? (0, core_1.sym)('CREATE_PUZZLE_ANNOUNCEMENT')
            : (0, core_1.int)(62);
        const condition = (0, core_1.list)([opcodeExpr, toTree(message)]);
        this.addNode(condition);
        return this;
    }
    assertPuzzleAnnouncement(announcementId) {
        this.featuresUsed.add('ASSERT_PUZZLE_ANNOUNCEMENT');
        const opcodeExpr = this.shouldUseSymbolicConditionCode(63)
            ? (0, core_1.sym)('ASSERT_PUZZLE_ANNOUNCEMENT')
            : (0, core_1.int)(63);
        const condition = (0, core_1.list)([opcodeExpr, toTree(announcementId)]);
        this.addNode(condition);
        return this;
    }
    // === RAW CONDITIONS ===
    addCondition(opcode, ...args) {
        // Get symbolic name if available
        const conditionName = (0, includeIndex_1.getConditionCodeName)(opcode);
        if (conditionName) {
            this.featuresUsed.add(conditionName);
        }
        const opcodeExpr = this.shouldUseSymbolicConditionCode(opcode) && conditionName
            ? (0, core_1.sym)(conditionName)
            : (0, core_1.int)(opcode);
        const condition = (0, core_1.list)([opcodeExpr, ...args.map(toTree)]);
        this.addNode(condition);
        return this;
    }
    // === CONTROL FLOW ===
    if(condition) {
        this.currentContext = 'if';
        this.ifCondition = condition.tree;
        this.thenNodes = [];
        this.elseNodes = [];
        return this;
    }
    then(callback) {
        if (this.currentContext !== 'if') {
            throw new Error('then() must follow if()');
        }
        const thenBuilder = new PuzzleBuilder();
        callback(thenBuilder);
        this.thenNodes = thenBuilder.nodes;
        return this;
    }
    else(callback) {
        if (this.currentContext !== 'if') {
            throw new Error('else() must follow if().then()');
        }
        this.currentContext = 'else';
        const elseBuilder = new PuzzleBuilder();
        callback(elseBuilder);
        this.elseNodes = elseBuilder.nodes;
        // Build the complete if expression
        const ifExpr = (0, core_1.list)([
            opcodes_1.IF,
            this.ifCondition,
            this.buildNodeList(this.thenNodes),
            this.buildNodeList(this.elseNodes)
        ]);
        this.nodes.push(ifExpr);
        this.currentContext = 'main';
        return this;
    }
    elseIf(condition, callback) {
        if (this.currentContext !== 'if') {
            throw new Error('elseIf() must follow if().then()');
        }
        // Convert elseIf to nested if in else branch
        const elseIfBuilder = new PuzzleBuilder();
        elseIfBuilder.if(condition).then(callback).else(() => { });
        this.elseNodes = [elseIfBuilder.build()];
        return this;
    }
    // === PATTERNS ===
    payToConditions() {
        // (a (q . 2) 1) - execute conditions from solution
        this.nodes = [(0, core_1.list)([opcodes_1.APPLY, (0, core_1.list)([opcodes_1.QUOTE, opcodes_1.ARG2]), opcodes_1.ARG1])];
        return this;
    }
    payToPublicKey(pubkey) {
        this.requireSignature(pubkey);
        this.returnConditions();
        return this;
    }
    delegatedPuzzle() {
        // (a 2 3) - run puzzle from arg2 with solution arg3
        this.nodes = [(0, core_1.list)([opcodes_1.APPLY, opcodes_1.ARG2, opcodes_1.ARG3])];
        return this;
    }
    // === LOOPS (unrolled) ===
    repeat(count, callback) {
        for (let i = 0; i < count; i++) {
            callback(i, this);
        }
        return this;
    }
    forEach(items, callback) {
        items.forEach((item, index) => {
            callback(item, index, this);
        });
        return this;
    }
    // === COMPOSITION ===
    merge(other) {
        this.nodes.push(...other.nodes);
        return this;
    }
    wrap(wrapper) {
        const innerPuzzle = this.build();
        this.nodes = [wrapper(innerPuzzle)];
        return this;
    }
    // === UTILITIES ===
    require(condition, _message) {
        // Instead of using the assert macro, generate the expanded form directly
        // assert expands to: (i condition () (x))
        // This means: if condition is true, return nil; otherwise raise exception
        const assertion = (0, core_1.list)([
            opcodes_1.IF, // 'i' operator
            condition.tree,
            opcodes_1.NIL, // return nil if condition is true
            (0, core_1.list)([opcodes_1.RAISE]) // raise exception if condition is false
        ]);
        this.addNode(assertion);
        return this;
    }
    returnConditions() {
        // If we have conditions already built, don't add ARG1
        // This allows puzzles that build their own conditions to work correctly
        if (this.nodes.length === 0) {
            // No conditions built - return conditions from solution (arg1)
            this.addNode(opcodes_1.ARG1);
        }
        // Otherwise, the built conditions will be returned
        return this;
    }
    /**
     * Return a specific value/expression
     */
    returnValue(value) {
        if (typeof value === 'string' || typeof value === 'number') {
            this.addNode(variable(String(value)).tree);
        }
        else {
            this.addNode(value.tree);
        }
        return this;
    }
    fail(_message) {
        // Always fail (raise exception)
        this.addNode((0, core_1.list)([(0, core_1.sym)('x')]));
        return this;
    }
    // === BUILDING ===
    build() {
        if (this.currentContext !== 'main') {
            throw new Error('Incomplete control flow - missing else() or build()');
        }
        // Auto-include required files
        this.autoInclude();
        // If we have a custom mod (e.g., from loaded Chialisp), use it
        if (this.customMod) {
            // Apply curried parameters if any
            if (this.curriedParams.size > 0) {
                const substitutions = new Map();
                this.curriedParams.forEach((value, name) => {
                    substitutions.set(name, value);
                });
                return (0, core_1.substitute)(this.customMod, substitutions);
            }
            return this.customMod;
        }
        let body = this.buildNodeList(this.nodes);
        // If we have curried parameters, substitute them in the body
        if (this.curriedParams.size > 0) {
            // Create a substitution map
            const substitutions = new Map();
            this.curriedParams.forEach((value, name) => {
                substitutions.set(name, value);
            });
            // Apply substitutions to the body
            body = (0, core_1.substitute)(body, substitutions);
        }
        // If not generating a mod structure, return the body directly
        if (!this.isModStructure) {
            return body;
        }
        // Build parameter list for mod - ONLY solution parameters
        const allParams = [];
        // Only add solution parameters to the mod parameter list
        this.solutionParams.forEach(name => {
            allParams.push((0, core_1.sym)(name));
        });
        // If no parameters defined, use default @ for solution
        if (allParams.length === 0) {
            allParams.push(opcodes_1.ARG);
        }
        // Build mod structure with includes
        const paramList = allParams.length === 1 ? allParams[0] : (0, core_1.list)(allParams);
        // If we have includes, add them before the body
        if (this.includes.length > 0) {
            const includeNodes = this.includes.map(path => (0, core_1.list)([(0, core_1.sym)('include'), (0, core_1.sym)(path)]));
            // Create the mod with includes and body
            const modElements = [opcodes_1.MOD, paramList, ...includeNodes, body];
            return (0, core_1.list)(modElements);
        }
        // No includes - standard mod structure
        return (0, core_1.list)([opcodes_1.MOD, paramList, body]);
    }
    serialize(options) {
        const tree = this.build();
        // Default to chialisp format
        const format = options?.format || 'chialisp';
        if (format === 'chialisp') {
            const clspCode = (0, core_1.serialize)(tree, {
                indent: options?.indent,
                comments: this.comments,
                blockComments: this.blockComments,
                includedLibraries: this.includes
            });
            // Apply CLSP formatter if indent is true
            if (options?.indent) {
                return (0, clspFormatter_1.formatCLSP)(clspCode, {
                    maxLineLength: 120,
                    indentSize: 2
                });
            }
            return clspCode;
        }
        // For other formats, we need to use clvm-lib
        try {
            // First serialize to ChiaLisp
            let clspCode = (0, core_1.serialize)(tree, {
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
            const program = clvm_lib_1.Program.fromSource(clspCode);
            // Handle single_puzzle mode - curry inner puzzles
            let finalProgram = program;
            if (options?.single_puzzle && options.innerPuzzles && options.innerPuzzles.length > 0) {
                // Build all inner puzzles and curry them
                const innerPrograms = options.innerPuzzles.map(p => {
                    const innerClsp = (0, core_1.serialize)(p.build());
                    return clvm_lib_1.Program.fromSource(innerClsp);
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
                }
                else {
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
                    throw new Error(`Unknown format: ${format}`);
            }
        }
        catch (error) {
            throw new Error(`Failed to serialize to ${format}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Calculate the SHA256 tree hash of this puzzle
     * Returns hex string with 0x prefix
     */
    toModHash() {
        const tree = this.build();
        const hashBytes = (0, core_1.sha256tree)(tree);
        return '0x' + Array.from(hashBytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }
    /**
     * Build and curry the puzzle with provided values
     */
    curry(values) {
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
    addNode(node) {
        // Associate pending comment with this node if any
        if (this._pendingComment) {
            this.comments.set(node, this._pendingComment);
            this._pendingComment = undefined;
        }
        if (this.currentContext === 'if') {
            this.thenNodes.push(node);
        }
        else if (this.currentContext === 'else') {
            this.elseNodes.push(node);
        }
        else {
            this.nodes.push(node);
        }
    }
    buildNodeList(nodes) {
        if (nodes.length === 0)
            return opcodes_1.NIL;
        if (nodes.length === 1)
            return nodes[0];
        // Build nested cons list
        // Use CONS constant name if opcodes.clib is included
        const consOperator = this.shouldUseSymbolicOpcodeConstant() ? (0, core_1.sym)('CONS') : opcodes_1.CONS;
        return nodes.reduceRight((rest, node) => (0, core_1.list)([consOperator, node, rest]), opcodes_1.NIL);
    }
    /**
     * Load a ChiaLisp (.clsp) file and create a PuzzleBuilder from it
     * @param filePath Path to the .clsp file
     * @returns PuzzleBuilder instance with the loaded puzzle
     */
    static fromClsp(filePath) {
        try {
            // Read the file
            const source = (0, fs_1.readFileSync)(filePath, 'utf-8');
            // Parse the ChiaLisp code
            const ast = (0, parser_1.parseChialisp)(source);
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
                            .filter((item) => item.type === 'atom' && typeof item.value === 'string')
                            .map(item => item.value);
                        // Separate curried vs solution parameters by convention
                        // (uppercase = curried, lowercase = solution)
                        const curriedParams = [];
                        const solutionParams = [];
                        for (const param of params) {
                            if (param === param.toUpperCase() && param !== '@') {
                                curriedParams.push(param);
                            }
                            else if (param !== '@') {
                                solutionParams.push(param);
                            }
                        }
                        // Apply parameters to the builder
                        if (curriedParams.length > 0) {
                            const paramObj = {};
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
        }
        catch (error) {
            throw new Error(`Failed to load ChiaLisp file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Load a CoinScript (.coins) file and create a PuzzleBuilder from it
     * @param filePath Path to the .coins file
     * @returns PuzzleBuilder instance with the compiled puzzle
     */
    static fromCoinScript(filePath) {
        try {
            // Import is deferred to avoid circular dependency
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { compileCoinScript } = require('../coinscript/parser');
            // Read the file
            const source = (0, fs_1.readFileSync)(filePath, 'utf-8');
            // Compile the CoinScript
            const result = compileCoinScript(source);
            // Return the main puzzle
            return result.mainPuzzle;
        }
        catch (error) {
            throw new Error(`Failed to load CoinScript file ${filePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Check if we should use symbolic condition code names
     */
    shouldUseSymbolicConditionCode(_opcode) {
        // Use symbolic names if:
        // 1. condition_codes.clib is manually included, OR
        // 2. we're tracking features that will auto-include it
        // Check if manually included
        if (this.includes.some(inc => inc.includes('condition_codes'))) {
            return true;
        }
        // Check if we have any condition-related features that will trigger auto-include
        const hasConditionFeatures = Array.from(this.featuresUsed).some(f => f.includes('CREATE_COIN') ||
            f.includes('AGG_SIG') ||
            f.includes('ASSERT_') ||
            f.includes('RESERVE_FEE') ||
            f.includes('ANNOUNCEMENT') ||
            f === 'REMARK');
        return hasConditionFeatures;
    }
    /**
     * Check if we should use symbolic opcode constant names
     */
    shouldUseSymbolicOpcodeConstant() {
        // Only use symbolic names if opcodes.clib is manually included
        return this.includes.some(inc => inc.includes('opcodes.clib'));
    }
    /**
     * Automatically determine and add required includes based on features used
     */
    autoInclude() {
        const requiredIncludes = (0, includeIndex_1.determineRequiredIncludes)(this.featuresUsed);
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
    simulate(solution) {
        try {
            // Build the puzzle tree
            const puzzleTree = this.build();
            // Serialize to ChiaLisp first
            const clspCode = (0, core_1.serialize)(puzzleTree, {
                comments: this.comments,
                blockComments: this.blockComments,
                includedLibraries: this.includes
            });
            // Create a Program from ChiaLisp
            const program = clvm_lib_1.Program.fromSource(clspCode);
            // Prepare solution - convert to proper format
            let solutionProgram;
            if (typeof solution === 'string') {
                solutionProgram = clvm_lib_1.Program.fromSource(solution);
            }
            else if (Array.isArray(solution)) {
                // Convert array to list format
                const solutionStr = this.arrayToClsp(solution);
                solutionProgram = clvm_lib_1.Program.fromSource(solutionStr);
            }
            else if (solution instanceof SolutionBuilder_1.SolutionBuilder) {
                // Get the hex and convert to Program
                const hexStr = solution.toHex();
                solutionProgram = clvm_lib_1.Program.deserializeHex(hexStr);
            }
            else {
                solutionProgram = solution;
            }
            // Run the puzzle with the solution
            const result = program.run(solutionProgram);
            return {
                result: result.value,
                cost: typeof result.cost === 'bigint' ? Number(result.cost) : result.cost
            };
        }
        catch (error) {
            throw new Error(`Simulation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Convert JavaScript array to ChiaLisp list format
     */
    arrayToClsp(arr) {
        if (arr.length === 0)
            return '()';
        const elements = arr.map(item => {
            if (typeof item === 'string') {
                // Check if it's a hex string
                if (item.startsWith('0x')) {
                    return item;
                }
                // Otherwise quote it
                return `"${item}"`;
            }
            else if (typeof item === 'number' || typeof item === 'bigint') {
                return String(item);
            }
            else if (Array.isArray(item)) {
                return this.arrayToClsp(item);
            }
            else {
                return String(item);
            }
        });
        return `(${elements.join(' ')})`;
    }
    /**
     * Validate that this puzzle produces valid conditions
     * Returns true if valid, throws error if not
     */
    validateConditions(solution) {
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
        }
        catch (error) {
            throw new Error(`Condition validation failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
exports.PuzzleBuilder = PuzzleBuilder;
// === FACTORY FUNCTIONS ===
function puzzle() {
    return new PuzzleBuilder();
}
function expr(value) {
    return new Expression(toTree(value));
}
function variable(name) {
    // Handle numeric parameter references
    if (/^\d+$/.test(name)) {
        return new Expression((0, core_1.int)(parseInt(name)));
    }
    // Handle @ symbol for arg1
    if (name === '@') {
        return new Expression(opcodes_1.ARG);
    }
    // For other names, create a symbol
    return new Expression((0, core_1.sym)(name));
}
