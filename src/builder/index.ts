/**
 * Builder Module - Main external interface
 * 
 * The PuzzleBuilder is the primary way to interact with the framework
 */

// Export everything except conflicting 'solution' constant
export { 
  PuzzleBuilder,
  Expression,
  Expr,
  puzzle,
  expr,
  variable,
  // Skip 'solution' constant to avoid conflict
  amount,
  arg1,
  arg2,
  arg3
} from './PuzzleBuilder';

// Export SolutionBuilder and factories
export {
  SolutionBuilder,
  ConditionListBuilder
} from './SolutionBuilder';

// Re-export type for convenience
export type { ConditionBuilder } from './PuzzleBuilder'; 