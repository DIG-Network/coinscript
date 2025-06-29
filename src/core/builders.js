"use strict";
/**
 * Tree builders
 *
 * Functions to create tree nodes in a convenient way.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.nil = void 0;
exports.atom = atom;
exports.list = list;
exports.cons = cons;
exports.int = int;
exports.hex = hex;
exports.bytes = bytes;
exports.sym = sym;
exports.str = str;
exports.buildList = buildList;
/**
 * Create an atom node
 */
function atom(value) {
    return { type: 'atom', value };
}
/**
 * Create a list node
 */
function list(items) {
    return { type: 'list', items };
}
/**
 * Create a cons pair node
 */
function cons(first, rest) {
    return { type: 'cons', first, rest };
}
/**
 * Nil atom (empty list)
 */
exports.nil = atom(null);
/**
 * Create atom from integer
 */
function int(value) {
    return atom(value);
}
/**
 * Create atom from hex string
 */
function hex(value) {
    // Remove 0x prefix if present
    const cleanHex = value.startsWith('0x') ? value.slice(2) : value;
    // Convert to Uint8Array
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
        bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
    }
    return atom(bytes);
}
/**
 * Create atom from bytes
 */
function bytes(value) {
    return atom(value);
}
/**
 * Create atom from string (as symbol)
 */
function sym(value) {
    return atom(value);
}
/**
 * Create quoted string atom (stores as bytes)
 */
function str(value) {
    const encoder = new TextEncoder();
    return atom(encoder.encode(value));
}
/**
 * Build a list from cons pairs
 */
function buildList(...items) {
    if (items.length === 0)
        return exports.nil;
    if (items.length === 1)
        return cons(items[0], exports.nil);
    return cons(items[0], buildList(...items.slice(1)));
}
