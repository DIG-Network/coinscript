"use strict";
/**
 * SolutionBuilder - Fluent API for building Chia puzzle solutions
 *
 * Solutions are the data passed to puzzles when spending coins
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolutionBuilder = exports.ConditionListBuilder = void 0;
exports.createSolution = createSolution;
exports.createConditions = createConditions;
const core_1 = require("../core");
/**
 * Specialized builder for condition lists
 */
class ConditionListBuilder {
    constructor() {
        this.conditions = [];
    }
    createCoin(puzzleHash, amount, memo) {
        const cond = memo
            ? (0, core_1.list)([(0, core_1.int)(51), (0, core_1.hex)(puzzleHash), (0, core_1.int)(amount), (0, core_1.hex)(memo)])
            : (0, core_1.list)([(0, core_1.int)(51), (0, core_1.hex)(puzzleHash), (0, core_1.int)(amount)]);
        this.conditions.push(cond);
        return this;
    }
    reserveFee(amount) {
        this.conditions.push((0, core_1.list)([(0, core_1.int)(52), (0, core_1.int)(amount)]));
        return this;
    }
    requireSignature(pubkey) {
        this.conditions.push((0, core_1.list)([(0, core_1.int)(50), (0, core_1.hex)(pubkey), (0, core_1.hex)('0x00')]));
        return this;
    }
    createAnnouncement(message) {
        this.conditions.push((0, core_1.list)([(0, core_1.int)(60), (0, core_1.hex)(message)]));
        return this;
    }
    assertAnnouncement(coinId, message) {
        if (message) {
            this.conditions.push((0, core_1.list)([(0, core_1.int)(61), (0, core_1.hex)(coinId), (0, core_1.hex)(message)]));
        }
        else {
            this.conditions.push((0, core_1.list)([(0, core_1.int)(61), (0, core_1.hex)(coinId)]));
        }
        return this;
    }
    assertSecondsRelative(seconds) {
        this.conditions.push((0, core_1.list)([(0, core_1.int)(80), (0, core_1.int)(seconds)]));
        return this;
    }
    assertHeightAbsolute(height) {
        this.conditions.push((0, core_1.list)([(0, core_1.int)(82), (0, core_1.int)(height)]));
        return this;
    }
    aggSigMe(pubkey, message) {
        this.conditions.push((0, core_1.list)([(0, core_1.int)(50), (0, core_1.hex)(pubkey), (0, core_1.hex)(message)]));
        return this;
    }
    requireAfterHeight(height) {
        this.conditions.push((0, core_1.list)([(0, core_1.int)(82), (0, core_1.int)(height)]));
        return this;
    }
    requireAfterSeconds(seconds) {
        this.conditions.push((0, core_1.list)([(0, core_1.int)(80), (0, core_1.int)(seconds)]));
        return this;
    }
    addRawCondition(opcode, ...args) {
        this.conditions.push((0, core_1.list)([(0, core_1.int)(opcode), ...args.map(arg => toTree(arg))]));
        return this;
    }
    build() {
        return (0, core_1.list)(this.conditions);
    }
}
exports.ConditionListBuilder = ConditionListBuilder;
class SolutionBuilder {
    constructor() {
        this.nodes = [];
        this.structureType = 'list';
    }
    /**
     * Add a raw value to the solution
     */
    add(value) {
        this.nodes.push(toTree(value));
        return this;
    }
    /**
     * Add multiple values at once
     */
    addMany(...values) {
        values.forEach(v => this.add(v));
        return this;
    }
    /**
     * Add a list to the solution
     */
    addList(callback) {
        const listBuilder = new SolutionBuilder();
        callback(listBuilder);
        this.nodes.push(listBuilder.build());
        return this;
    }
    /**
     * Add an empty list (nil)
     */
    addNil() {
        this.nodes.push(core_1.NIL);
        return this;
    }
    /**
     * Add a condition list (for pay-to-conditions puzzles)
     */
    addConditions(callback) {
        const condBuilder = new ConditionListBuilder();
        callback(condBuilder);
        this.nodes.push(condBuilder.build());
        return this;
    }
    /**
     * Add state for slot-machine pattern
     */
    addState(state) {
        // Convert state object to ChiaLisp structure
        const stateList = this.encodeState(state);
        this.nodes.push(stateList);
        return this;
    }
    /**
     * Add action name and parameters for slot-machine pattern
     */
    addAction(actionName, params) {
        this.add(actionName);
        if (params && params.length > 0) {
            this.addList(b => {
                params.forEach(p => b.add(p));
            });
        }
        else {
            this.addNil();
        }
        return this;
    }
    /**
     * Add merkle proof
     */
    addMerkleProof(proof) {
        this.addList(b => {
            proof.forEach(hash => b.add(hash));
        });
        return this;
    }
    /**
     * Add a delegated puzzle solution
     */
    addDelegatedPuzzle(puzzle, solution) {
        this.add(puzzle);
        this.add(solution);
        return this;
    }
    /**
     * Add raw ChiaLisp code (advanced users)
     * The code string should be valid ChiaLisp syntax
     */
    addRaw(chialispCode) {
        // For now, we'll add it as a symbol - in a real implementation,
        // this would parse the ChiaLisp and create the appropriate tree
        this.nodes.push((0, core_1.sym)(chialispCode));
        return this;
    }
    /**
     * Set the solution structure type
     */
    asConsCell() {
        this.structureType = 'cons';
        return this;
    }
    asRaw() {
        this.structureType = 'raw';
        return this;
    }
    /**
     * Build the solution tree
     */
    build() {
        if (this.nodes.length === 0)
            return core_1.NIL;
        switch (this.structureType) {
            case 'raw':
                return this.nodes.length === 1 ? this.nodes[0] : (0, core_1.list)(this.nodes);
            case 'cons':
                if (this.nodes.length !== 2) {
                    throw new Error('Cons cell requires exactly 2 elements');
                }
                return (0, core_1.list)([(0, core_1.sym)('c'), this.nodes[0], this.nodes[1]]);
            case 'list':
            default:
                return (0, core_1.list)(this.nodes);
        }
    }
    /**
     * Serialize the solution to ChiaLisp string
     */
    serialize(options) {
        return (0, core_1.serialize)(this.build(), options);
    }
    /**
     * Serialize to hex (for use in spend bundles)
     */
    toHex() {
        // This would need proper CLVM serialization
        // For now, return a placeholder
        return '0x' + Buffer.from(this.serialize()).toString('hex');
    }
    // Private helper to encode state
    encodeState(state) {
        const entries = [];
        Object.entries(state).forEach(([_key, value]) => {
            if (typeof value === 'number' || typeof value === 'bigint') {
                entries.push((0, core_1.int)(value));
            }
            else if (typeof value === 'string') {
                entries.push((0, core_1.hex)(value));
            }
            else if (typeof value === 'boolean') {
                entries.push(value ? (0, core_1.int)(1) : core_1.NIL);
            }
            else if (value instanceof Map) {
                // For Map instances, encode as list of (key . value) pairs
                const pairs = [];
                value.forEach((v, k) => {
                    if (typeof k === 'string' && (typeof v === 'number' || typeof v === 'bigint')) {
                        pairs.push((0, core_1.list)([(0, core_1.hex)(k), (0, core_1.int)(v)]));
                    }
                });
                entries.push((0, core_1.list)(pairs));
            }
            else if (typeof value === 'object' && value !== null) {
                // For plain objects, encode as list of (key . value) pairs
                const pairs = [];
                Object.entries(value).forEach(([k, v]) => {
                    if (typeof v === 'number' || typeof v === 'bigint') {
                        pairs.push((0, core_1.list)([(0, core_1.hex)(k), (0, core_1.int)(v)]));
                    }
                });
                entries.push((0, core_1.list)(pairs));
            }
            else {
                entries.push(toTree(value));
            }
        });
        return (0, core_1.list)(entries);
    }
}
exports.SolutionBuilder = SolutionBuilder;
// Helper to convert values to trees
function toTree(value) {
    if (value instanceof SolutionBuilder) {
        return value.build();
    }
    if (typeof value === 'number' || typeof value === 'bigint') {
        return (0, core_1.int)(value);
    }
    if (typeof value === 'boolean') {
        // Convert booleans to ChiaLisp convention: true = 1, false = ()
        return value ? (0, core_1.int)(1) : core_1.NIL;
    }
    if (typeof value === 'string') {
        if (value.startsWith('0x')) {
            return (0, core_1.hex)(value);
        }
        // Treat as symbol/identifier
        return (0, core_1.sym)(value);
    }
    if (value instanceof Uint8Array) {
        const hexStr = '0x' + Array.from(value)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        return (0, core_1.hex)(hexStr);
    }
    return value;
}
// Factory functions
function createSolution() {
    return new SolutionBuilder();
}
function createConditions() {
    return new ConditionListBuilder();
}
