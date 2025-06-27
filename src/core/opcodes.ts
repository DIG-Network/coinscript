/**
 * CLVM Opcodes
 * 
 * Named constants for all CLVM operators to improve code readability
 */

import { sym } from './builders';
import { TreeNode } from './types';

// Core operators
export const QUOTE: TreeNode = sym('q');
export const APPLY: TreeNode = sym('a');
export const IF: TreeNode = sym('i');
export const CONS: TreeNode = sym('c');
export const FIRST: TreeNode = sym('f');
export const REST: TreeNode = sym('r');
export const LISTP: TreeNode = sym('l');
export const RAISE: TreeNode = sym('x');
export const EQ: TreeNode = sym('=');

// Math operators
export const ADD: TreeNode = sym('+');
export const SUBTRACT: TreeNode = sym('-');
export const MULTIPLY: TreeNode = sym('*');
export const DIVIDE: TreeNode = sym('/');
export const DIVMOD: TreeNode = sym('divmod');
export const GT: TreeNode = sym('>');
export const GTS: TreeNode = sym('>s');

// Bit operations
export const ASH: TreeNode = sym('ash');
export const LSH: TreeNode = sym('lsh');
export const LOGAND: TreeNode = sym('logand');
export const LOGIOR: TreeNode = sym('logior');
export const LOGXOR: TreeNode = sym('logxor');
export const LOGNOT: TreeNode = sym('lognot');

// Logic operations
export const NOT: TreeNode = sym('not');
export const ANY: TreeNode = sym('any');
export const ALL: TreeNode = sym('all');

// String/byte operations
export const STRLEN: TreeNode = sym('strlen');
export const SUBSTR: TreeNode = sym('substr');
export const CONCAT: TreeNode = sym('concat');

// Crypto operations
export const SHA256: TreeNode = sym('sha256');
export const SHA256TREE: TreeNode = sym('sha256tree');
export const SHA256TREE1: TreeNode = sym('sha256tree1');
export const KECCAK256: TreeNode = sym('keccak256');
export const COINID: TreeNode = sym('coinid');
export const SECP256K1_VERIFY: TreeNode = sym('secp256k1_verify');
export const SECP256R1_VERIFY: TreeNode = sym('secp256r1_verify');

// BLS operations
export const POINT_ADD: TreeNode = sym('point_add');
export const PUBKEY_FOR_EXP: TreeNode = sym('pubkey_for_exp');
export const G1_ADD: TreeNode = sym('g1_add');
export const G1_SUBTRACT: TreeNode = sym('g1_subtract');
export const G1_MULTIPLY: TreeNode = sym('g1_multiply');
export const G1_NEGATE: TreeNode = sym('g1_negate');
export const BLS_VERIFY: TreeNode = sym('bls_verify');

// Other operations
export const SOFTFORK: TreeNode = sym('softfork');
export const ASSERT: TreeNode = sym('assert');
export const IS_ERROR: TreeNode = sym('is_error');
export const CONTAINS: TreeNode = sym('contains');

// Common aliases
export const MOD: TreeNode = sym('mod');
export const LAMBDA: TreeNode = sym('lambda');
export const DEFUN: TreeNode = sym('defun');
export const DEFMACRO: TreeNode = sym('defmacro');
export const DEFCONST: TreeNode = sym('defconst');

// Environment references (@ is commonly used for arg 1)
export const ARG: TreeNode = sym('@');
export const ARG1: TreeNode = sym('1');
export const ARG2: TreeNode = sym('2');
export const ARG3: TreeNode = sym('3');
export const ARG4: TreeNode = sym('4');
export const ARG5: TreeNode = sym('5');

// Numeric constants
export const ZERO: TreeNode = sym('0');
export const ONE: TreeNode = sym('1');
export const MINUS_ONE: TreeNode = sym('-1');

// Common constants
export const NIL: TreeNode = sym('()');
export const TRUE: TreeNode = ONE;  // 1 is true
export const FALSE: TreeNode = NIL; // nil is false

// Common strings
export const REVOKE: TreeNode = sym('"REVOKE"');
export const MULTISIG_PUBKEY: TreeNode = sym('multisig-pubkey');

/**
 * Opcode number mappings for reference
 */
export const OPCODE_NUMBERS = {
  1: 'q',      // QUOTE
  2: 'a',      // APPLY  
  3: 'i',      // IF
  4: 'c',      // CONS
  5: 'f',      // FIRST
  6: 'r',      // REST
  7: 'l',      // LISTP
  8: 'x',      // RAISE
  9: '=',      // EQ
  10: '>s',    // GREATER_BYTES
  11: 'sha256',
  12: 'substr',
  13: 'strlen',
  14: 'concat',
  16: '+',     // ADD
  17: '-',     // SUBTRACT
  18: '*',     // MULTIPLY
  19: '/',     // DIVIDE
  20: 'divmod',
  21: '>',     // GREATER
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
} as const;

/**
 * CLVM Opcode numbers as constants
 */
export enum CLVMOpcode {
  QUOTE = 1,
  APPLY = 2,
  IF = 3,
  CONS = 4,
  FIRST = 5,
  REST = 6,
  LISTP = 7,
  RAISE = 8,
  EQ = 9,
  GREATER_BYTES = 10,
  SHA256 = 11,
  SUBSTR = 12,
  STRLEN = 13,
  CONCAT = 14,
  ADD = 16,
  SUBTRACT = 17,
  MULTIPLY = 18,
  DIVIDE = 19,
  DIVMOD = 20,
  GREATER = 21,
  ASH = 22,
  LSH = 23,
  LOGAND = 24,
  LOGIOR = 25,
  LOGXOR = 26,
  LOGNOT = 27,
  POINT_ADD = 28,
  PUBKEY_FOR_EXP = 29,
  NOT = 30,
  ANY = 31,
  ALL = 32,
  SOFTFORK = 33
} 