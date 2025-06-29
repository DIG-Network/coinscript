"use strict";
/**
 * Chialisp Parser
 *
 * Parses .clsp files into TreeNode AST format
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseChialisp = parseChialisp;
exports.calculateTreeHash = calculateTreeHash;
const builders_1 = require("../core/builders");
/**
 * Parse Chialisp source code into TreeNode AST
 */
function parseChialisp(source) {
    const tokens = tokenize(source);
    const parser = new ChialispParser(tokens);
    return parser.parse();
}
/**
 * Tokenize Chialisp source code
 */
function tokenize(source) {
    const tokens = [];
    let line = 1;
    let column = 1;
    let i = 0;
    while (i < source.length) {
        // Skip whitespace
        if (/\s/.test(source[i])) {
            if (source[i] === '\n') {
                line++;
                column = 1;
            }
            else {
                column++;
            }
            i++;
            continue;
        }
        // Skip comments
        if (source[i] === ';') {
            while (i < source.length && source[i] !== '\n') {
                i++;
                column++;
            }
            continue;
        }
        // Left parenthesis
        if (source[i] === '(') {
            tokens.push({ type: 'LPAREN', value: '(', line, column });
            i++;
            column++;
            continue;
        }
        // Right parenthesis
        if (source[i] === ')') {
            tokens.push({ type: 'RPAREN', value: ')', line, column });
            i++;
            column++;
            continue;
        }
        // String literals
        if (source[i] === '"') {
            const startCol = column;
            let value = '';
            i++; // Skip opening quote
            column++;
            while (i < source.length && source[i] !== '"') {
                if (source[i] === '\\' && i + 1 < source.length) {
                    // Handle escape sequences
                    i++;
                    column++;
                    switch (source[i]) {
                        case 'n':
                            value += '\n';
                            break;
                        case 't':
                            value += '\t';
                            break;
                        case 'r':
                            value += '\r';
                            break;
                        case '\\':
                            value += '\\';
                            break;
                        case '"':
                            value += '"';
                            break;
                        default: value += source[i];
                    }
                }
                else {
                    value += source[i];
                }
                i++;
                column++;
            }
            if (i < source.length) {
                i++; // Skip closing quote
                column++;
            }
            tokens.push({ type: 'STRING', value, line, column: startCol });
            continue;
        }
        // Hex literals (0x...)
        if (source[i] === '0' && i + 1 < source.length && source[i + 1] === 'x') {
            const startCol = column;
            let value = '0x';
            i += 2;
            column += 2;
            while (i < source.length && /[0-9a-fA-F]/.test(source[i])) {
                value += source[i];
                i++;
                column++;
            }
            tokens.push({ type: 'HEX', value, line, column: startCol });
            continue;
        }
        // Numbers
        if (/[0-9-]/.test(source[i])) {
            const startCol = column;
            let value = '';
            // Handle negative numbers
            if (source[i] === '-') {
                value += source[i];
                i++;
                column++;
            }
            while (i < source.length && /[0-9]/.test(source[i])) {
                value += source[i];
                i++;
                column++;
            }
            // Only treat as number if it's not just a minus sign
            if (value !== '-') {
                tokens.push({ type: 'NUMBER', value, line, column: startCol });
                continue;
            }
            else {
                // It's just a minus sign, treat as atom
                tokens.push({ type: 'ATOM', value, line, column: startCol });
                continue;
            }
        }
        // Atoms (symbols, identifiers)
        if (/[^\s()]/.test(source[i])) {
            const startCol = column;
            let value = '';
            while (i < source.length && /[^\s()]/.test(source[i])) {
                value += source[i];
                i++;
                column++;
            }
            tokens.push({ type: 'ATOM', value, line, column: startCol });
            continue;
        }
        // Unknown character
        throw new Error(`Unexpected character '${source[i]}' at line ${line}, column ${column}`);
    }
    tokens.push({ type: 'EOF', value: '', line, column });
    return tokens;
}
/**
 * Parser for Chialisp
 */
class ChialispParser {
    constructor(tokens) {
        this.position = 0;
        this.tokens = tokens;
    }
    parse() {
        const result = this.parseExpression();
        if (!this.isAtEnd()) {
            throw new Error(`Unexpected token after expression: ${this.current().value}`);
        }
        return result;
    }
    parseExpression() {
        const token = this.current();
        switch (token.type) {
            case 'LPAREN':
                return this.parseList();
            case 'NUMBER':
                this.advance();
                return (0, builders_1.atom)(parseInt(token.value, 10));
            case 'HEX':
                this.advance();
                const hexValue = token.value.slice(2); // Remove 0x prefix
                const bytes = new Uint8Array(hexValue.length / 2);
                for (let i = 0; i < hexValue.length; i += 2) {
                    bytes[i / 2] = parseInt(hexValue.substr(i, 2), 16);
                }
                return (0, builders_1.atom)(bytes);
            case 'STRING':
                this.advance();
                // Convert string to bytes
                const encoder = new TextEncoder();
                return (0, builders_1.atom)(encoder.encode(token.value));
            case 'ATOM':
                this.advance();
                // Check for special atoms
                if (token.value === '()' || token.value === 'nil') {
                    return builders_1.nil;
                }
                // Check if it's a valid number
                if (/^-?\d+$/.test(token.value)) {
                    return (0, builders_1.atom)(parseInt(token.value, 10));
                }
                // Otherwise it's a symbol
                return (0, builders_1.atom)(token.value);
            default:
                throw new Error(`Unexpected token: ${token.type} '${token.value}' at line ${token.line}, column ${token.column}`);
        }
    }
    parseList() {
        this.expect('LPAREN');
        const items = [];
        while (!this.check('RPAREN') && !this.isAtEnd()) {
            items.push(this.parseExpression());
        }
        this.expect('RPAREN');
        // Handle empty list
        if (items.length === 0) {
            return (0, builders_1.list)([]);
        }
        // Check for improper list (cons pair) notation: (a . b)
        if (items.length >= 2 && items[items.length - 2].type === 'atom' &&
            items[items.length - 2].value === '.') {
            // Remove the dot
            items.splice(items.length - 2, 1);
            // This would be a cons pair in full Chialisp, but we'll represent as regular list
        }
        return (0, builders_1.list)(items);
    }
    current() {
        return this.tokens[this.position];
    }
    advance() {
        if (!this.isAtEnd()) {
            this.position++;
        }
        return this.tokens[this.position - 1];
    }
    check(type) {
        if (this.isAtEnd())
            return false;
        return this.current().type === type;
    }
    expect(type) {
        if (!this.check(type)) {
            const token = this.current();
            throw new Error(`Expected ${type} but got ${token.type} '${token.value}' at line ${token.line}, column ${token.column}`);
        }
        return this.advance();
    }
    isAtEnd() {
        return this.current().type === 'EOF';
    }
}
/**
 * Calculate the tree hash of a Chialisp program
 * This is used to compute puzzle hashes
 */
function calculateTreeHash(node) {
    // Simplified tree hash calculation
    // In production, this would use proper sha256tree algorithm
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    function hashNode(n) {
        if (n.type === 'atom') {
            if (n.value === null) {
                hash.update(Buffer.from([0])); // nil
            }
            else if (typeof n.value === 'number' || typeof n.value === 'bigint') {
                // Convert number to minimal byte representation
                const num = BigInt(n.value);
                if (num === 0n) {
                    hash.update(Buffer.from([0]));
                }
                else {
                    const hex = num.toString(16);
                    const padded = hex.length % 2 ? '0' + hex : hex;
                    hash.update(Buffer.from(padded, 'hex'));
                }
            }
            else if (n.value instanceof Uint8Array) {
                hash.update(n.value);
            }
            else if (typeof n.value === 'string') {
                hash.update(Buffer.from(n.value, 'utf8'));
            }
        }
        else if (n.type === 'list') {
            hash.update(Buffer.from([1])); // List marker
            for (const item of n.items) {
                hashNode(item);
            }
        }
        else if (n.type === 'cons') {
            hash.update(Buffer.from([2])); // Cons marker
            hashNode(n.first);
            hashNode(n.rest);
        }
    }
    hashNode(node);
    return new Uint8Array(hash.digest());
}
