"use strict";
/**
 * CLVM Opcodes
 *
 * Named constants for all CLVM operators to improve code readability
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFMACRO = exports.DEFUN = exports.LAMBDA = exports.MOD = exports.CONTAINS = exports.IS_ERROR = exports.ASSERT = exports.SOFTFORK = exports.BLS_VERIFY = exports.G1_NEGATE = exports.G1_MULTIPLY = exports.G1_SUBTRACT = exports.G1_ADD = exports.PUBKEY_FOR_EXP = exports.POINT_ADD = exports.SECP256R1_VERIFY = exports.SECP256K1_VERIFY = exports.COINID = exports.KECCAK256 = exports.SHA256TREE1 = exports.SHA256TREE = exports.SHA256 = exports.CONCAT = exports.SUBSTR = exports.STRLEN = exports.ALL = exports.ANY = exports.NOT = exports.LOGNOT = exports.LOGXOR = exports.LOGIOR = exports.LOGAND = exports.LSH = exports.ASH = exports.GTS = exports.GT = exports.DIVMOD = exports.DIVIDE = exports.MULTIPLY = exports.SUBTRACT = exports.ADD = exports.EQ = exports.RAISE = exports.LISTP = exports.REST = exports.FIRST = exports.CONS = exports.IF = exports.APPLY = exports.QUOTE = void 0;
exports.CLVMOpcode = exports.OPCODE_NUMBERS = exports.MULTISIG_PUBKEY = exports.REVOKE = exports.FALSE = exports.TRUE = exports.NIL = exports.MINUS_ONE = exports.ONE = exports.ZERO = exports.ARG5 = exports.ARG4 = exports.ARG3 = exports.ARG2 = exports.ARG1 = exports.ARG = exports.DEFCONST = void 0;
const builders_1 = require("./builders");
// Core operators
exports.QUOTE = (0, builders_1.sym)('q');
exports.APPLY = (0, builders_1.sym)('a');
exports.IF = (0, builders_1.sym)('i');
exports.CONS = (0, builders_1.sym)('c');
exports.FIRST = (0, builders_1.sym)('f');
exports.REST = (0, builders_1.sym)('r');
exports.LISTP = (0, builders_1.sym)('l');
exports.RAISE = (0, builders_1.sym)('x');
exports.EQ = (0, builders_1.sym)('=');
// Math operators
exports.ADD = (0, builders_1.sym)('+');
exports.SUBTRACT = (0, builders_1.sym)('-');
exports.MULTIPLY = (0, builders_1.sym)('*');
exports.DIVIDE = (0, builders_1.sym)('/');
exports.DIVMOD = (0, builders_1.sym)('divmod');
exports.GT = (0, builders_1.sym)('>');
exports.GTS = (0, builders_1.sym)('>s');
// Bit operations
exports.ASH = (0, builders_1.sym)('ash');
exports.LSH = (0, builders_1.sym)('lsh');
exports.LOGAND = (0, builders_1.sym)('logand');
exports.LOGIOR = (0, builders_1.sym)('logior');
exports.LOGXOR = (0, builders_1.sym)('logxor');
exports.LOGNOT = (0, builders_1.sym)('lognot');
// Logic operations
exports.NOT = (0, builders_1.sym)('not');
exports.ANY = (0, builders_1.sym)('any');
exports.ALL = (0, builders_1.sym)('all');
// String/byte operations
exports.STRLEN = (0, builders_1.sym)('strlen');
exports.SUBSTR = (0, builders_1.sym)('substr');
exports.CONCAT = (0, builders_1.sym)('concat');
// Crypto operations
exports.SHA256 = (0, builders_1.sym)('sha256');
exports.SHA256TREE = (0, builders_1.sym)('sha256tree');
exports.SHA256TREE1 = (0, builders_1.sym)('sha256tree1');
exports.KECCAK256 = (0, builders_1.sym)('keccak256');
exports.COINID = (0, builders_1.sym)('coinid');
exports.SECP256K1_VERIFY = (0, builders_1.sym)('secp256k1_verify');
exports.SECP256R1_VERIFY = (0, builders_1.sym)('secp256r1_verify');
// BLS operations
exports.POINT_ADD = (0, builders_1.sym)('point_add');
exports.PUBKEY_FOR_EXP = (0, builders_1.sym)('pubkey_for_exp');
exports.G1_ADD = (0, builders_1.sym)('g1_add');
exports.G1_SUBTRACT = (0, builders_1.sym)('g1_subtract');
exports.G1_MULTIPLY = (0, builders_1.sym)('g1_multiply');
exports.G1_NEGATE = (0, builders_1.sym)('g1_negate');
exports.BLS_VERIFY = (0, builders_1.sym)('bls_verify');
// Other operations
exports.SOFTFORK = (0, builders_1.sym)('softfork');
exports.ASSERT = (0, builders_1.sym)('assert');
exports.IS_ERROR = (0, builders_1.sym)('is_error');
exports.CONTAINS = (0, builders_1.sym)('contains');
// Common aliases
exports.MOD = (0, builders_1.sym)('mod');
exports.LAMBDA = (0, builders_1.sym)('lambda');
exports.DEFUN = (0, builders_1.sym)('defun');
exports.DEFMACRO = (0, builders_1.sym)('defmacro');
exports.DEFCONST = (0, builders_1.sym)('defconst');
// Environment references (@ is commonly used for arg 1)
exports.ARG = (0, builders_1.sym)('@');
exports.ARG1 = (0, builders_1.sym)('1');
exports.ARG2 = (0, builders_1.sym)('2');
exports.ARG3 = (0, builders_1.sym)('3');
exports.ARG4 = (0, builders_1.sym)('4');
exports.ARG5 = (0, builders_1.sym)('5');
// Numeric constants
exports.ZERO = (0, builders_1.sym)('0');
exports.ONE = (0, builders_1.sym)('1');
exports.MINUS_ONE = (0, builders_1.sym)('-1');
// Common constants
exports.NIL = (0, builders_1.atom)(null);
exports.TRUE = exports.ONE; // 1 is true
exports.FALSE = exports.NIL; // nil is false
// Common strings
exports.REVOKE = (0, builders_1.sym)('"REVOKE"');
exports.MULTISIG_PUBKEY = (0, builders_1.sym)('multisig-pubkey');
/**
 * Opcode number mappings for reference
 */
exports.OPCODE_NUMBERS = {
    1: 'q', // QUOTE
    2: 'a', // APPLY  
    3: 'i', // IF
    4: 'c', // CONS
    5: 'f', // FIRST
    6: 'r', // REST
    7: 'l', // LISTP
    8: 'x', // RAISE
    9: '=', // EQ
    10: '>s', // GREATER_BYTES
    11: 'sha256',
    12: 'substr',
    13: 'strlen',
    14: 'concat',
    16: '+', // ADD
    17: '-', // SUBTRACT
    18: '*', // MULTIPLY
    19: '/', // DIVIDE
    20: 'divmod',
    21: '>', // GREATER
    22: 'ash',
    23: 'lsh',
    24: 'logand',
    25: 'logior',
    26: 'logxor',
    27: 'lognot',
    28: 'point_add',
    29: 'pubkey_for_exp',
    30: 'not',
    31: 'any',
    32: 'all',
    33: 'softfork'
};
/**
 * CLVM Opcode numbers as constants
 */
var CLVMOpcode;
(function (CLVMOpcode) {
    CLVMOpcode[CLVMOpcode["QUOTE"] = 1] = "QUOTE";
    CLVMOpcode[CLVMOpcode["APPLY"] = 2] = "APPLY";
    CLVMOpcode[CLVMOpcode["IF"] = 3] = "IF";
    CLVMOpcode[CLVMOpcode["CONS"] = 4] = "CONS";
    CLVMOpcode[CLVMOpcode["FIRST"] = 5] = "FIRST";
    CLVMOpcode[CLVMOpcode["REST"] = 6] = "REST";
    CLVMOpcode[CLVMOpcode["LISTP"] = 7] = "LISTP";
    CLVMOpcode[CLVMOpcode["RAISE"] = 8] = "RAISE";
    CLVMOpcode[CLVMOpcode["EQ"] = 9] = "EQ";
    CLVMOpcode[CLVMOpcode["GREATER_BYTES"] = 10] = "GREATER_BYTES";
    CLVMOpcode[CLVMOpcode["SHA256"] = 11] = "SHA256";
    CLVMOpcode[CLVMOpcode["SUBSTR"] = 12] = "SUBSTR";
    CLVMOpcode[CLVMOpcode["STRLEN"] = 13] = "STRLEN";
    CLVMOpcode[CLVMOpcode["CONCAT"] = 14] = "CONCAT";
    CLVMOpcode[CLVMOpcode["ADD"] = 16] = "ADD";
    CLVMOpcode[CLVMOpcode["SUBTRACT"] = 17] = "SUBTRACT";
    CLVMOpcode[CLVMOpcode["MULTIPLY"] = 18] = "MULTIPLY";
    CLVMOpcode[CLVMOpcode["DIVIDE"] = 19] = "DIVIDE";
    CLVMOpcode[CLVMOpcode["DIVMOD"] = 20] = "DIVMOD";
    CLVMOpcode[CLVMOpcode["GREATER"] = 21] = "GREATER";
    CLVMOpcode[CLVMOpcode["ASH"] = 22] = "ASH";
    CLVMOpcode[CLVMOpcode["LSH"] = 23] = "LSH";
    CLVMOpcode[CLVMOpcode["LOGAND"] = 24] = "LOGAND";
    CLVMOpcode[CLVMOpcode["LOGIOR"] = 25] = "LOGIOR";
    CLVMOpcode[CLVMOpcode["LOGXOR"] = 26] = "LOGXOR";
    CLVMOpcode[CLVMOpcode["LOGNOT"] = 27] = "LOGNOT";
    CLVMOpcode[CLVMOpcode["POINT_ADD"] = 28] = "POINT_ADD";
    CLVMOpcode[CLVMOpcode["PUBKEY_FOR_EXP"] = 29] = "PUBKEY_FOR_EXP";
    CLVMOpcode[CLVMOpcode["NOT"] = 30] = "NOT";
    CLVMOpcode[CLVMOpcode["ANY"] = 31] = "ANY";
    CLVMOpcode[CLVMOpcode["ALL"] = 32] = "ALL";
    CLVMOpcode[CLVMOpcode["SOFTFORK"] = 33] = "SOFTFORK";
})(CLVMOpcode || (exports.CLVMOpcode = CLVMOpcode = {}));
