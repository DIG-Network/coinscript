/**
 * Chia Puzzle Framework
 * 
 * A composable framework for building Chia puzzles
 */

// === PRIMARY INTERFACE ===
// Export PuzzleBuilder and related types/helpers
export { 
  PuzzleBuilder, 
  Expression,
  Expr,
  puzzle, 
  expr, 
  variable,
  amount,
  arg1,
  arg2,
  arg3,
  SolutionBuilder,
  ConditionListBuilder
} from './builder';

// Export layer system
export * from './layers';

// Export runtime support
export * from './runtime';

// Export CoinScript
export * from './coinscript';

// === CORE EXPORTS (for advanced use) ===

// Core types and functions
export * from './core/types';
export * from './core/builders';
export * from './core/parser';
export * from './core/serializer';
export * from './core/converters';
export * from './core/opcodes';

// Re-export Program for convenience
export { Program } from 'clvm-lib';

// Operators organized by category
export * as arithmetic from './operators/arithmetic';
export * as comparison from './operators/comparison';
export * as lists from './operators/lists';
export * as control from './operators/control';
export * as crypto from './operators/crypto';
export * as bls from './operators/bls';
export * as logic from './operators/logic';

// Conditions organized by type
export * as spend from './conditions/spend';
export * as time from './conditions/time';
export * as signatures from './conditions/signatures';
export * as messages from './conditions/messages';
export { ConditionOpcode, CONDITION_OPCODE_NAMES } from './conditions/opcodes';

// Patterns for common use cases
export * as payment from './patterns/payment';
export * as delegation from './patterns/delegation';

// Import modules for namespaces
import * as arithmeticOps from './operators/arithmetic';
import * as comparisonOps from './operators/comparison';
import * as listOps from './operators/lists';
import * as controlOps from './operators/control';
import * as cryptoOps from './operators/crypto';
import * as blsOps from './operators/bls';
import * as logicOps from './operators/logic';

import * as spendConds from './conditions/spend';
import * as timeConds from './conditions/time';
import * as signatureConds from './conditions/signatures';
import * as messageConds from './conditions/messages';

import * as paymentPatterns from './patterns/payment';
import * as delegationPatterns from './patterns/delegation';

// Convenient namespaces
export const operators = {
  arithmetic: arithmeticOps,
  comparison: comparisonOps,
  lists: listOps,
  control: controlOps,
  crypto: cryptoOps,
  bls: blsOps,
  logic: logicOps
} as const;

export const conditions = {
  spend: spendConds,
  time: timeConds,
  signatures: signatureConds,
  messages: messageConds
} as const;

export const patterns = {
  payment: paymentPatterns,
  delegation: delegationPatterns
} as const; 