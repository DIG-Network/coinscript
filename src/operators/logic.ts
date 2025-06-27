/**
 * Logic operators
 * 
 * Pure functional operators for logical operations
 */

import { TreeNode } from '../core/types';
import { list } from '../core/builders';
import { NOT, ALL, ANY, LOGAND, LOGIOR, LOGXOR, LOGNOT, ASH, LSH, IF, ONE } from '../core/opcodes';

/**
 * Logical NOT
 * (not value) -> true if value is nil/false
 */
export function not(value: TreeNode): TreeNode {
  return list([NOT, value]);
}

/**
 * Logical AND - all must be true
 * (all v1 v2 ...) -> true if all true
 */
export function all(...values: TreeNode[]): TreeNode {
  return list([ALL, ...values]);
}

/**
 * Logical OR - any must be true
 * (any v1 v2 ...) -> true if any true
 */
export function any(...values: TreeNode[]): TreeNode {
  return list([ANY, ...values]);
}

/**
 * Bitwise AND
 * (logand a b ...) -> a & b & ...
 */
export function logand(...values: TreeNode[]): TreeNode {
  return list([LOGAND, ...values]);
}

/**
 * Bitwise OR
 * (logior a b ...) -> a | b | ...
 */
export function logior(...values: TreeNode[]): TreeNode {
  return list([LOGIOR, ...values]);
}

/**
 * Bitwise XOR
 * (logxor a b ...) -> a ^ b ^ ...
 */
export function logxor(...values: TreeNode[]): TreeNode {
  return list([LOGXOR, ...values]);
}

/**
 * Bitwise NOT
 * (lognot value) -> ~value
 */
export function lognot(value: TreeNode): TreeNode {
  return list([LOGNOT, value]);
}

/**
 * Arithmetic shift (multiply/divide by power of 2)
 * (ash value shift) -> value * 2^shift
 */
export function ash(value: TreeNode, shift: TreeNode): TreeNode {
  return list([ASH, value, shift]);
}

/**
 * Logical shift
 * (lsh value shift) -> value << shift (logical)
 */
export function lsh(value: TreeNode, shift: TreeNode): TreeNode {
  return list([LSH, value, shift]);
}

/**
 * Logical implication
 * (implies a b) -> if a then b
 */
export function implies(a: TreeNode, b: TreeNode): TreeNode {
  return list([IF, a, b, ONE]);
}

/**
 * Logical equivalence (if and only if)
 * (iff a b) -> a <=> b
 */
export function iff(a: TreeNode, b: TreeNode): TreeNode {
  return list([
    IF,
    a,
    b,
    not(b)
  ]);
}

/**
 * Exclusive OR (logical)
 * (xor a b) -> a XOR b (one but not both)
 */
export function xor(a: TreeNode, b: TreeNode): TreeNode {
  return list([
    IF,
    a,
    not(b),
    b
  ]);
}

/**
 * NAND operation
 * (nand a b ...) -> NOT(a AND b AND ...)
 */
export function nand(...values: TreeNode[]): TreeNode {
  return not(all(...values));
}

/**
 * NOR operation
 * (nor a b ...) -> NOT(a OR b OR ...)
 */
export function nor(...values: TreeNode[]): TreeNode {
  return not(any(...values));
}

/**
 * Check if value is truthy (non-nil)
 * (truthy? value) -> true if not nil
 */
export function isTruthy(value: TreeNode): TreeNode {
  return list([NOT, not(value)]);
}

/**
 * Check if value is falsy (nil)
 * (falsy? value) -> true if nil
 */
export function isFalsy(value: TreeNode): TreeNode {
  return not(value);
}

/**
 * Default value if nil
 * (default value default) -> value or default if nil
 */
export function defaultValue(value: TreeNode, defaultVal: TreeNode): TreeNode {
  return list([
    IF,
    value,
    value,
    defaultVal
  ]);
} 