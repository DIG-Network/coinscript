/**
 * Curry implementation for Chia puzzles
 * 
 * Currying in Chia means creating a new puzzle that applies fixed arguments
 * to an existing puzzle, effectively "baking in" values.
 */

import { TreeNode, isAtom, isCons } from './types';
import { list, sym } from './builders';
import { QUOTE, APPLY, CONS } from './opcodes';
import { serialize } from './serializer';

/**
 * Curry a puzzle with given arguments
 * This creates a new puzzle that applies the arguments to the original puzzle
 * 
 * @param puzzle The puzzle to curry
 * @param args The arguments to curry into the puzzle
 * @returns A new puzzle with the arguments curried in
 */
export function curry(puzzle: TreeNode, ...args: TreeNode[]): TreeNode {
  if (args.length === 0) {
    return puzzle;
  }
  
  // Build the curry structure: (a (q . puzzle) (c (q . arg1) (c (q . arg2) ... 1)))
  // This applies the puzzle with the curried arguments prepended to the solution
  
  // Start with the solution reference (1)
  let argList: TreeNode = sym('1');
  
  // Build the argument list in reverse order
  for (let i = args.length - 1; i >= 0; i--) {
    // Each argument is quoted and consed onto the list
    argList = list([CONS, list([QUOTE, args[i]]), argList]);
  }
  
  // Apply the puzzle with the constructed argument list
  return list([APPLY, list([QUOTE, puzzle]), argList]);
}

/**
 * Substitute variable references in a puzzle with actual values
 * This is used internally during puzzle building to replace parameter names with values
 * 
 * @param tree The tree to substitute in
 * @param substitutions Map of variable names to their values
 * @returns A new tree with substitutions applied
 */
export function substitute(tree: TreeNode, substitutions: Map<string, TreeNode>): TreeNode {
  // If it's an atom, check if it's a variable to substitute
  if (isAtom(tree)) {
    // Check if this is a symbol that should be substituted
    const atomStr = serialize(tree);
    if (substitutions.has(atomStr)) {
      return substitutions.get(atomStr)!;
    }
    return tree;
  }
  
  // If it's a cons, recursively substitute in both parts
  if (isCons(tree)) {
    const first = substitute(tree.first, substitutions);
    const rest = substitute(tree.rest, substitutions);
    
    // Only create a new cons if something changed
    if (first === tree.first && rest === tree.rest) {
      return tree;
    }
    
    return { type: 'cons', first, rest };
  }
  
  return tree;
}

/**
 * Create a curried puzzle from a mod structure with parameters
 * This handles the common case of currying a (mod (param1 param2 ...) body) structure
 * 
 * @param modTree The mod structure
 * @param values Map of parameter names to their values
 * @returns A curried puzzle
 */
export function curryMod(modTree: TreeNode, values: Map<string, TreeNode>): TreeNode {
  // For a simple approach, we'll use the curry function to apply values
  // In a real implementation, this would be more sophisticated
  
  const args: TreeNode[] = [];
  values.forEach((value) => {
    args.push(value);
  });
  
  if (args.length === 0) {
    return modTree;
  }
  
  return curry(modTree, ...args);
} 