"use strict";
/**
 * Parser
 *
 * Parses ChiaLisp string representation into tree nodes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse = parse;
exports.tryParse = tryParse;
const types_1 = require("./types");
const builders_1 = require("./builders");
/**
 * Parse ChiaLisp source into a tree
 */
function parse(source, options = {}) {
    const { symbolsByDefault = true } = options;
    let position = 0;
    // Skip whitespace and comments
    function skipWhitespace() {
        while (position < source.length) {
            const ch = source[position];
            if (/\s/.test(ch)) {
                position++;
            }
            else if (ch === ';') {
                // Skip comment until end of line
                while (position < source.length && source[position] !== '\n') {
                    position++;
                }
            }
            else {
                break;
            }
        }
    }
    // Peek at current character
    function peek() {
        return source[position] || '';
    }
    // Consume and return current character
    function consume() {
        return source[position++] || '';
    }
    // Parse error with position
    function error(message) {
        throw new types_1.ParseError(message, source, position);
    }
    // Parse a single expression
    function parseExpression() {
        skipWhitespace();
        const ch = peek();
        if (ch === '(') {
            return parseList();
        }
        else if (ch === '"') {
            return parseString();
        }
        else if (ch === '') {
            error('Unexpected end of input');
        }
        else {
            return parseAtom();
        }
    }
    // Parse a list or cons pair
    function parseList() {
        consume(); // '('
        skipWhitespace();
        if (peek() === ')') {
            consume(); // ')'
            return builders_1.nil;
        }
        const items = [];
        let improper = false;
        let lastItem = null;
        // eslint-disable-next-line no-constant-condition
        while (true) {
            skipWhitespace();
            const nextChar = peek();
            if (nextChar === ')') {
                consume(); // ')'
                break;
            }
            if (nextChar === '.') {
                consume(); // '.'
                skipWhitespace();
                if (items.length === 0) {
                    error('Unexpected dot at start of list');
                }
                // Parse the rest element
                lastItem = parseExpression();
                improper = true;
                skipWhitespace();
                if (peek() !== ')') {
                    error('Expected closing parenthesis after dot notation');
                }
                consume(); // ')'
                break;
            }
            items.push(parseExpression());
        }
        // Build the result
        if (improper && lastItem) {
            // Build improper list
            let result = lastItem;
            for (let i = items.length - 1; i >= 0; i--) {
                result = (0, builders_1.cons)(items[i], result);
            }
            return result;
        }
        else {
            // Proper list
            return (0, builders_1.list)(items);
        }
    }
    // Parse a quoted string
    function parseString() {
        consume(); // '"'
        let value = '';
        while (position < source.length) {
            const ch = source[position];
            if (ch === '"') {
                position++;
                break;
            }
            if (ch === '\\') {
                position++;
                const next = source[position];
                switch (next) {
                    case 'n':
                        value += '\n';
                        break;
                    case 'r':
                        value += '\r';
                        break;
                    case 't':
                        value += '\t';
                        break;
                    case '\\':
                        value += '\\';
                        break;
                    case '"':
                        value += '"';
                        break;
                    default: value += next;
                }
                position++;
            }
            else {
                value += ch;
                position++;
            }
        }
        // In ChiaLisp, quoted strings are often symbols
        return symbolsByDefault ? (0, builders_1.sym)(value) : (0, builders_1.str)(value);
    }
    // Parse an atom
    function parseAtom() {
        let value = '';
        while (position < source.length) {
            const ch = source[position];
            if (/[\s();]/.test(ch)) {
                break;
            }
            value += ch;
            position++;
        }
        if (value === '') {
            error('Empty atom');
        }
        // Check for special atoms
        if (value === '()') {
            return builders_1.nil;
        }
        // Check for hex
        if (value.startsWith('0x')) {
            return (0, builders_1.hex)(value);
        }
        // Check for number
        if (/^-?\d+$/.test(value)) {
            const num = parseInt(value, 10);
            return (0, builders_1.int)(num);
        }
        // Check for bigint
        if (/^-?\d+n$/.test(value)) {
            const bigintValue = BigInt(value.slice(0, -1));
            return (0, builders_1.int)(bigintValue);
        }
        // Default: symbol
        return (0, builders_1.sym)(value);
    }
    // Parse the expression and ensure we consumed all input
    const result = parseExpression();
    skipWhitespace();
    if (position < source.length) {
        error('Unexpected input after expression');
    }
    return result;
}
/**
 * Try to parse ChiaLisp, return null on error
 */
function tryParse(source, options) {
    try {
        return parse(source, options);
    }
    catch (e) {
        if (e instanceof types_1.ParseError) {
            return null;
        }
        throw e;
    }
}
