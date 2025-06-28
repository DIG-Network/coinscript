import { 
  Expression, 
  CallExpression, 
  Identifier, 
  Literal,
  BinaryExpression,
  UnaryExpression,
  MemberExpression
} from './parser';

/**
 * Functions that expect tree arguments
 */
const TREE_FUNCTIONS = new Set([
  'sha256tree',
  'treehash',
  'tree_hash'
]);

/**
 * Check if an expression is a valid tree structure
 */
export function isValidTreeExpression(expr: Expression): boolean {
  switch (expr.type) {
    case 'Literal':
      // Literals (atoms) are valid trees
      return true;
    
    case 'Identifier': {
      // Variables could contain trees - we can't validate at compile time
      // But certain identifiers are known to be atoms/non-trees
      const id = expr as Identifier;
      // The solution reference '1' or '@' is not a tree by itself
      if (id.name === '1' || id.name === '@') {
        return false;
      }
      // Otherwise, assume it could be valid
      return true;
    }
    
    case 'CallExpression': {
      const call = expr as CallExpression;
      // Cons operations create trees
      if (call.callee.type === 'Identifier') {
        const funcName = (call.callee as Identifier).name;
        if (funcName === 'c' || funcName === 'cons' || funcName === 'list') {
          return true;
        }
        // Functions that return trees
        if (funcName === 'f' || funcName === 'r' || funcName === 'first' || funcName === 'rest') {
          // These extract from trees, result depends on input
          return true;
        }
      }
      return true; // Be permissive for unknown functions
    }
    
    case 'BinaryExpression':
      // Binary expressions produce atoms, not trees
      return false;
    
    case 'UnaryExpression':
      // Unary expressions produce atoms, not trees
      return false;
    
    case 'MemberExpression':
      // Member expressions could be anything
      return true;
    
    default:
      // Unknown expression types - be permissive
      return true;
  }
}

/**
 * Validate tree function calls in an expression
 */
export function validateTreeFunctionCalls(expr: Expression): string[] {
  const errors: string[] = [];
  
  function validate(node: Expression): void {
    if (node.type === 'CallExpression') {
      const call = node as CallExpression;
      
      // Check if this is a tree function
      if (call.callee.type === 'Identifier') {
        const funcName = (call.callee as Identifier).name;
        
        if (TREE_FUNCTIONS.has(funcName)) {
          // Validate arguments
          if (call.arguments.length === 0) {
            errors.push(`${funcName} requires a tree argument`);
          } else if (call.arguments.length > 1) {
            errors.push(`${funcName} takes only one tree argument`);
          } else {
            const arg = call.arguments[0];
            if (!isValidTreeExpression(arg)) {
              errors.push(
                `${funcName} expects a tree structure, but received an atom. ` +
                `Consider wrapping the value in a list or using a tree-producing function.`
              );
            }
          }
        }
      }
      
      // Recursively validate arguments
      for (const arg of call.arguments) {
        validate(arg);
      }
    }
    
    // Recursively validate other expression types
    switch (node.type) {
      case 'BinaryExpression': {
        const binExpr = node as BinaryExpression;
        validate(binExpr.left);
        validate(binExpr.right);
        break;
      }
      case 'UnaryExpression': {
        const unaryExpr = node as UnaryExpression;
        validate(unaryExpr.operand);
        break;
      }
      case 'MemberExpression': {
        const memberExpr = node as MemberExpression;
        validate(memberExpr.object);
        if (!memberExpr.computed) {
          validate(memberExpr.property);
        }
        break;
      }
    }
  }
  
  validate(expr);
  return errors;
}

/**
 * Get suggestions for fixing tree validation errors
 */
export function getTreeFixSuggestion(funcName: string, arg: Expression): string {
  if (arg.type === 'Literal' || arg.type === 'Identifier') {
    return `Try using (list ${expressionToString(arg)}) or (c ${expressionToString(arg)} ()) to create a tree`;
  }
  return `Ensure the argument to ${funcName} is a tree structure, not an atom`;
}

function expressionToString(expr: Expression): string {
  switch (expr.type) {
    case 'Literal':
      return String((expr as Literal).value);
    case 'Identifier':
      return (expr as Identifier).name;
    default:
      return '<expression>';
  }
} 