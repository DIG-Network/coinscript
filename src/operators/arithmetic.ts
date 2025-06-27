/**
 * Arithmetic operators
 * 
 * Pure functional operators for arithmetic operations on trees
 */

import { TreeNode } from '../core/types';
import { list } from '../core/builders';
import { ADD, SUBTRACT, MULTIPLY, DIVIDE, DIVMOD, IF, GT, REST, ZERO } from '../core/opcodes';

/**
 * Add two or more values
 * (+ a b c ...) -> sum
 */
export function add(...values: TreeNode[]): TreeNode {
  return list([ADD, ...values]);
}

/**
 * Subtract values (left to right)
 * (- a b c ...) -> a - b - c - ...
 */
export function subtract(...values: TreeNode[]): TreeNode {
  return list([SUBTRACT, ...values]);
}

/**
 * Multiply values
 * (* a b c ...) -> product
 */
export function multiply(...values: TreeNode[]): TreeNode {
  return list([MULTIPLY, ...values]);
}

/**
 * Divide values (left to right)
 * (/ a b c ...) -> a / b / c / ...
 */
export function divide(...values: TreeNode[]): TreeNode {
  return list([DIVIDE, ...values]);
}

/**
 * Division with remainder
 * (divmod a b) -> (quotient . remainder)
 */
export function divmod(a: TreeNode, b: TreeNode): TreeNode {
  return list([DIVMOD, a, b]);
}

/**
 * Modulo operation
 * (% a b) -> a mod b
 */
export function mod(a: TreeNode, b: TreeNode): TreeNode {
  return list([DIVMOD, a, b, REST]);
}

/**
 * Absolute value
 * (abs n) -> |n|
 */
export function abs(n: TreeNode): TreeNode {
  return list([
    IF,
    list([GT, n, ZERO]),
    n,
    list([SUBTRACT, ZERO, n])
  ]);
}

/**
 * Maximum of values
 * (max a b ...) -> maximum value
 */
export function max(a: TreeNode, b: TreeNode, ...rest: TreeNode[]): TreeNode {
  if (rest.length === 0) {
    return list([
      IF,
      list([GT, a, b]),
      a,
      b
    ]);
  }
  return max(max(a, b), rest[0], ...rest.slice(1));
}

/**
 * Minimum of values
 * (min a b ...) -> minimum value
 */
export function min(a: TreeNode, b: TreeNode, ...rest: TreeNode[]): TreeNode {
  if (rest.length === 0) {
    return list([
      IF,
      list([GT, a, b]),
      b,
      a
    ]);
  }
  return min(min(a, b), rest[0], ...rest.slice(1));
} 