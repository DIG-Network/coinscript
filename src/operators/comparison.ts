/**
 * Comparison operators
 * 
 * Pure functional operators for comparing values
 */

import { TreeNode } from '../core/types';
import { list } from '../core/builders';
import { EQ, GT, GTS, NOT, ALL, IF, MINUS_ONE, ZERO, ONE } from '../core/opcodes';

/**
 * Check equality
 * (= a b ...) -> true if all equal
 */
export function equal(...values: TreeNode[]): TreeNode {
  return list([EQ, ...values]);
}

/**
 * Not equal
 * (!= a b) -> true if a != b
 */
export function notEqual(a: TreeNode, b: TreeNode): TreeNode {
  return list([NOT, equal(a, b)]);
}

/**
 * Greater than comparison
 * (> a b) -> true if a > b
 */
export function greater(a: TreeNode, b: TreeNode): TreeNode {
  return list([GT, a, b]);
}

/**
 * Greater than (bytes comparison)
 * (>s a b) -> true if a > b (as bytes)
 */
export function greaterBytes(a: TreeNode, b: TreeNode): TreeNode {
  return list([GTS, a, b]);
}

/**
 * Less than comparison
 * (< a b) -> true if a < b
 */
export function less(a: TreeNode, b: TreeNode): TreeNode {
  return list([GT, b, a]); // Swap arguments
}

/**
 * Less than (bytes comparison)
 * (<s a b) -> true if a < b (as bytes)
 */
export function lessBytes(a: TreeNode, b: TreeNode): TreeNode {
  return list([GTS, b, a]); // Swap arguments
}

/**
 * Greater than or equal
 * (>= a b) -> true if a >= b
 */
export function greaterOrEqual(a: TreeNode, b: TreeNode): TreeNode {
  return list([NOT, less(a, b)]);
}

/**
 * Less than or equal
 * (<= a b) -> true if a <= b
 */
export function lessOrEqual(a: TreeNode, b: TreeNode): TreeNode {
  return list([NOT, greater(a, b)]);
}

/**
 * Check if value is in range (inclusive)
 * (in-range value min max) -> true if min <= value <= max
 */
export function inRange(value: TreeNode, min: TreeNode, max: TreeNode): TreeNode {
  return list([
    ALL,
    list([
      greaterOrEqual(value, min),
      lessOrEqual(value, max)
    ])
  ]);
}

/**
 * Compare and return ordering
 * (compare a b) -> -1 if a < b, 0 if a = b, 1 if a > b
 */
export function compare(a: TreeNode, b: TreeNode): TreeNode {
  return list([
    IF,
    less(a, b),
    MINUS_ONE,
    list([
      IF,
      equal(a, b),
      ZERO,
      ONE
    ])
  ]);
} 