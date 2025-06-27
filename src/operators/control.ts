/**
 * Control flow operators
 * 
 * Pure functional operators for control flow
 */

import { TreeNode } from '../core/types';
import { list, sym } from '../core/builders';
import { IF, APPLY, QUOTE, RAISE, NOT, LAMBDA, TRUE, NIL, IS_ERROR } from '../core/opcodes';

/**
 * If-then-else (strict evaluation in CLVM)
 * (i condition then else) -> then or else
 */
export function if_(condition: TreeNode, thenBranch: TreeNode, elseBranch: TreeNode): TreeNode {
  return list([IF, condition, thenBranch, elseBranch]);
}

/**
 * Apply - evaluate first arg as program with second arg as environment
 * (a program env) -> result
 */
export function apply(program: TreeNode, env: TreeNode): TreeNode {
  return list([APPLY, program, env]);
}

/**
 * Quote - treat as value, not program
 * (q value) -> value
 */
export function quote(value: TreeNode): TreeNode {
  return list([QUOTE, value]);
}

/**
 * Exit/raise - terminate with error
 * (x ...) -> error
 */
export function raise(...values: TreeNode[]): TreeNode {
  return list([RAISE, ...values]);
}

/**
 * Cond - multi-way conditional (like switch/case)
 * (cond (test1 expr1) (test2 expr2) ... default) -> matching expr or default
 */
export function cond(clauses: Array<[TreeNode, TreeNode]>, defaultCase?: TreeNode): TreeNode {
  if (clauses.length === 0) {
    return defaultCase || raise();
  }
  
  const [test, expr] = clauses[0];
  return if_(
    test,
    expr,
    cond(clauses.slice(1), defaultCase)
  );
}

/**
 * When - execute if condition is true
 * (when condition expr) -> expr or nil
 */
export function when(condition: TreeNode, expr: TreeNode): TreeNode {
  return if_(condition, expr, quote(NIL));
}

/**
 * Unless - execute if condition is false
 * (unless condition expr) -> expr or nil
 */
export function unless(condition: TreeNode, expr: TreeNode): TreeNode {
  return if_(condition, quote(NIL), expr);
}

/**
 * Let binding (create local variables)
 * (let ((var1 val1) (var2 val2) ...) body) -> body with bindings
 */
export function let_(bindings: Array<[string, TreeNode]>, body: TreeNode): TreeNode {
  // In CLVM, we simulate let with apply and lambda
  const vars = bindings.map(([v]) => sym(v));
  const vals = bindings.map(([, val]) => val);
  
  return apply(
    list([LAMBDA, list(vars), body]),
    list(vals)
  );
}

/**
 * Begin - execute expressions in sequence, return last
 * (begin expr1 expr2 ... exprN) -> exprN
 */
export function begin(...exprs: TreeNode[]): TreeNode {
  if (exprs.length === 0) {
    return quote(NIL);
  }
  if (exprs.length === 1) {
    return exprs[0];
  }
  
  // Use if to sequence evaluation
  return if_(
    quote(TRUE), // always true
    exprs[exprs.length - 1], // return last
    begin(...exprs.slice(0, -1)) // evaluate others for side effects
  );
}

/**
 * Assert - check condition, raise if false
 * (assert condition message?) -> nil or error
 */
export function assert(condition: TreeNode, message?: TreeNode): TreeNode {
  return if_(
    condition,
    quote(NIL),
    message ? raise(message) : raise()
  );
}

/**
 * Try-catch simulation (limited in CLVM)
 * (try expr catch-expr) -> expr result or catch-expr if error
 */
export function tryCatch(expr: TreeNode, catchExpr: TreeNode): TreeNode {
  // CLVM doesn't have real exception handling
  // This is a pattern that checks for specific error conditions
  return if_(
    list([NOT, list([IS_ERROR, expr])]),
    expr,
    catchExpr
  );
} 