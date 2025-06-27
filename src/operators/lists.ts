/**
 * List operators
 * 
 * Pure functional operators for list manipulation
 */

import { TreeNode } from '../core/types';
import { list } from '../core/builders';
import { 
  FIRST, REST, CONS, LISTP, IF, EQ, NOT, ADD, APPLY, QUOTE, NIL, SUBTRACT,
  ZERO, ONE 
} from '../core/opcodes';

/**
 * First element of a list
 * (f lst) -> first element
 */
export function first(lst: TreeNode): TreeNode {
  return list([FIRST, lst]);
}

/**
 * Rest of a list (all but first)
 * (r lst) -> rest
 */
export function rest(lst: TreeNode): TreeNode {
  return list([REST, lst]);
}

/**
 * Cons - create a pair or prepend to list
 * (c first rest) -> (first . rest)
 */
export function cons(first: TreeNode, rest: TreeNode): TreeNode {
  return list([CONS, first, rest]);
}

/**
 * List predicate - check if something is a list (not nil)
 * (l value) -> true if list
 */
export function isList(value: TreeNode): TreeNode {
  return list([LISTP, value]);
}

/**
 * Get nth element (0-indexed)
 * (nth lst n) -> element at index n
 */
export function nth(lst: TreeNode, n: TreeNode): TreeNode {
  return list([
    IF,
    list([EQ, n, ZERO]),
    first(lst),
    nth(rest(lst), list([SUBTRACT, n, ONE]))
  ]);
}

/**
 * Get list length
 * (length lst) -> number of elements
 */
export function length(lst: TreeNode): TreeNode {
  return list([
    IF,
    list([NOT, isList(lst)]),
    ZERO,
    list([ADD, ONE, length(rest(lst))])
  ]);
}

/**
 * Append lists
 * (append lst1 lst2) -> concatenated list
 */
export function append(lst1: TreeNode, lst2: TreeNode): TreeNode {
  return list([
    IF,
    list([NOT, isList(lst1)]),
    lst2,
    cons(first(lst1), append(rest(lst1), lst2))
  ]);
}

/**
 * Reverse a list
 * (reverse lst) -> reversed list
 */
export function reverse(lst: TreeNode, acc: TreeNode = NIL): TreeNode {
  return list([
    IF,
    list([NOT, isList(lst)]),
    acc,
    reverse(rest(lst), cons(first(lst), acc))
  ]);
}

/**
 * Map function over list
 * (map func lst) -> transformed list
 */
export function map(func: TreeNode, lst: TreeNode): TreeNode {
  return list([
    IF,
    list([NOT, isList(lst)]),
    NIL,
    cons(
      list([APPLY, func, list([QUOTE, first(lst)])]),
      map(func, rest(lst))
    )
  ]);
}

/**
 * Filter list by predicate
 * (filter pred lst) -> filtered list
 */
export function filter(pred: TreeNode, lst: TreeNode): TreeNode {
  return list([
    IF,
    list([NOT, isList(lst)]),
    NIL,
    list([
      IF,
      list([APPLY, pred, list([QUOTE, first(lst)])]),
      cons(first(lst), filter(pred, rest(lst))),
      filter(pred, rest(lst))
    ])
  ]);
}

/**
 * Reduce list with accumulator
 * (reduce func acc lst) -> reduced value
 */
export function reduce(func: TreeNode, acc: TreeNode, lst: TreeNode): TreeNode {
  return list([
    IF,
    list([NOT, isList(lst)]),
    acc,
    reduce(
      func,
      list([APPLY, func, list([QUOTE, cons(acc, first(lst))])]),
      rest(lst)
    )
  ]);
}

/**
 * Check if any element satisfies predicate
 * (any pred lst) -> true if any match
 */
export function any(pred: TreeNode, lst: TreeNode): TreeNode {
  return list([
    IF,
    list([NOT, isList(lst)]),
    NIL, // nil is false
    list([
      IF,
      list([APPLY, pred, list([QUOTE, first(lst)])]),
      ONE, // true
      any(pred, rest(lst))
    ])
  ]);
}

/**
 * Check if all elements satisfy predicate
 * (all pred lst) -> true if all match
 */
export function all(pred: TreeNode, lst: TreeNode): TreeNode {
  return list([
    IF,
    list([NOT, isList(lst)]),
    ONE, // empty list: all match
    list([
      IF,
      list([NOT, list([APPLY, pred, list([QUOTE, first(lst)])])]),
      NIL, // false
      all(pred, rest(lst))
    ])
  ]);
} 