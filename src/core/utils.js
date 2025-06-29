"use strict";
/**
 * Core utilities for the puzzle framework
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeToBytes = serializeToBytes;
exports.calculateModHash = calculateModHash;
const serializer_1 = require("./serializer");
const crypto = __importStar(require("crypto"));
/**
 * Serialize a tree node to bytes
 * @param node - The tree node to serialize
 * @returns Serialized bytes
 */
function serializeToBytes(node) {
    const hexString = (0, serializer_1.serialize)(node);
    // Remove 0x prefix if present
    const cleanHex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;
    // Convert hex string to Uint8Array
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
        bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
    }
    return bytes;
}
/**
 * Calculate the mod hash of a puzzle (tree hash)
 * @param puzzle - The puzzle tree node
 * @returns The mod hash as a hex string
 */
function calculateModHash(puzzle) {
    // Simplified implementation - in production this would use proper sha256tree
    const hash = crypto.createHash('sha256');
    // For now, just hash the serialized form
    // TODO: Implement proper sha256tree algorithm
    const serialized = serializeToBytes(puzzle);
    hash.update(serialized);
    return '0x' + hash.digest('hex');
}
