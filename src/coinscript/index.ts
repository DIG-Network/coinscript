/**
 * CoinScript Module
 * 
 * High-level language for writing Chia smart coins
 */

export { compileCoinScript, parseCoinScriptFile } from './parser';

// Re-export types for external use
export type {
  CoinDeclaration,
  LayerDeclaration,
  StorageVariable,
  Constructor,
  ActionDeclaration,
  EventDeclaration,
  Parameter,
  Statement,
  Expression
} from './ast'; 