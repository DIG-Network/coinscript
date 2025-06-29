"use strict";
/**
 * Core Types
 *
 * Fundamental types for representing ChiaLisp as a tree structure
 * that can be easily inspected, manipulated, and converted.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversionError = exports.SerializeError = exports.ParseError = exports.TreeError = void 0;
exports.isAtom = isAtom;
exports.isList = isList;
exports.isCons = isCons;
exports.isNil = isNil;
/**
 * Type guards
 */
function isAtom(node) {
    return node.type === 'atom';
}
function isList(node) {
    return node.type === 'list';
}
function isCons(node) {
    return node.type === 'cons';
}
/**
 * Check if atom represents nil
 */
function isNil(node) {
    return isAtom(node) && node.value === null;
}
/**
 * Error types
 */
class TreeError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'TreeError';
    }
}
exports.TreeError = TreeError;
class ParseError extends TreeError {
    constructor(message, source, position) {
        super(message, 'PARSE_ERROR');
        this.source = source;
        this.position = position;
        this.name = 'ParseError';
    }
}
exports.ParseError = ParseError;
class SerializeError extends TreeError {
    constructor(message) {
        super(message, 'SERIALIZE_ERROR');
        this.name = 'SerializeError';
    }
}
exports.SerializeError = SerializeError;
class ConversionError extends TreeError {
    constructor(message) {
        super(message, 'CONVERSION_ERROR');
        this.name = 'ConversionError';
    }
}
exports.ConversionError = ConversionError;
