"use strict";
/**
 * Converters
 *
 * Convert between tree nodes and clvm-lib Program objects.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.treeToProgram = treeToProgram;
exports.programToTree = programToTree;
exports.sourceToProgram = sourceToProgram;
exports.programToSource = programToSource;
const clvm_lib_1 = require("clvm-lib");
const types_1 = require("./types");
const parser_1 = require("./parser");
const serializer_1 = require("./serializer");
/**
 * Convert a tree node to a Program
 */
function treeToProgram(node) {
    if ((0, types_1.isAtom)(node)) {
        const { value } = node;
        // Nil
        if (value === null) {
            return clvm_lib_1.Program.nil;
        }
        // Number
        if (typeof value === 'number') {
            return clvm_lib_1.Program.fromInt(value);
        }
        // BigInt
        if (typeof value === 'bigint') {
            return clvm_lib_1.Program.fromBigInt(value);
        }
        // Boolean
        if (typeof value === 'boolean') {
            return clvm_lib_1.Program.fromInt(value ? 1 : 0);
        }
        // Bytes
        if (value instanceof Uint8Array) {
            return clvm_lib_1.Program.fromBytes(value);
        }
        // String (as bytes)
        if (typeof value === 'string') {
            const encoder = new TextEncoder();
            return clvm_lib_1.Program.fromBytes(encoder.encode(value));
        }
        throw new types_1.ConversionError(`Cannot convert atom value to Program: ${String(value)}`);
    }
    if ((0, types_1.isList)(node)) {
        // Convert list items
        const items = node.items.map(treeToProgram);
        // Build list from right to left
        let result = clvm_lib_1.Program.nil;
        for (let i = items.length - 1; i >= 0; i--) {
            result = clvm_lib_1.Program.cons(items[i], result);
        }
        return result;
    }
    if ((0, types_1.isCons)(node)) {
        const first = treeToProgram(node.first);
        const rest = treeToProgram(node.rest);
        return clvm_lib_1.Program.cons(first, rest);
    }
    throw new types_1.ConversionError(`Unknown node type: ${JSON.stringify(node)}`);
}
/**
 * Convert a Program to a tree node
 */
function programToTree(program) {
    // Atom
    if (program.isAtom) {
        // Check for nil
        if (program.isNull) {
            return { type: 'atom', value: null };
        }
        // Get atom bytes
        const bytes = program.atom;
        if (!bytes) {
            throw new types_1.ConversionError('Program atom has no bytes');
        }
        // Try to interpret as different types
        // First, try as integer
        try {
            const intValue = program.toInt();
            // Check if it's a small integer that fits in JS number
            if (intValue >= Number.MIN_SAFE_INTEGER && intValue <= Number.MAX_SAFE_INTEGER) {
                return { type: 'atom', value: Number(intValue) };
            }
            // Otherwise use bigint
            return { type: 'atom', value: intValue };
        }
        catch {
            // Not an integer, treat as bytes
            return { type: 'atom', value: bytes };
        }
    }
    // Cons pair
    if (program.isCons) {
        const first = program.first;
        const rest = program.rest;
        if (!first || !rest) {
            throw new types_1.ConversionError('Program cons pair missing first or rest');
        }
        // Check if it's a proper list
        if (isProperList(program)) {
            const items = [];
            let current = program;
            while (current.isCons) {
                if (current.first) {
                    items.push(programToTree(current.first));
                }
                if (current.rest) {
                    current = current.rest;
                }
                else {
                    break;
                }
            }
            return { type: 'list', items };
        }
        // Improper list (cons pair)
        return {
            type: 'cons',
            first: programToTree(first),
            rest: programToTree(rest)
        };
    }
    throw new types_1.ConversionError('Program is neither atom nor cons');
}
/**
 * Check if a Program represents a proper list
 */
function isProperList(program) {
    let current = program;
    while (current.isCons) {
        current = current.rest;
    }
    return current.isNull;
}
/**
 * Convert ChiaLisp source to Program
 */
function sourceToProgram(source) {
    const tree = (0, parser_1.parse)(source);
    return treeToProgram(tree);
}
/**
 * Convert Program to ChiaLisp source
 */
function programToSource(program, indent = false) {
    const tree = programToTree(program);
    return (0, serializer_1.serialize)(tree, { indent, useKeywords: true, useOpcodeConstants: true });
}
