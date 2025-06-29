/**
 * Transfer Program Layer
 * 
 * Customizable transfer logic layer
 */

import { PuzzleBuilder, puzzle } from '../builder/PuzzleBuilder';
import { TreeNode } from '../core/types';
import { CLVMOpcode } from '../core/opcodes';

export function withTransferProgramLayer(
  innerPuzzle: PuzzleBuilder | TreeNode,
  transferProgram: PuzzleBuilder | TreeNode
): PuzzleBuilder {
  const transfer = puzzle();
  transfer.noMod();
  
  const innerTree = innerPuzzle instanceof PuzzleBuilder ? innerPuzzle.build() : innerPuzzle;
  const transferTree = transferProgram instanceof PuzzleBuilder ? transferProgram.build() : transferProgram;
  
  transfer.withCurriedParams({
    TRANSFER_PROGRAM: transferTree,
    INNER_PUZZLE: innerTree
  });
  
  transfer.withSolutionParams(
    'inner_solution',
    'transfer_solution'
  );
  
  transfer.comment('Transfer program layer');
  
  // Run transfer program
  transfer.comment('Run transfer program');
  transfer.addCondition(CLVMOpcode.APPLY, transfer.param('TRANSFER_PROGRAM'), transfer.param('transfer_solution'));
  
  // Run inner puzzle
  transfer.addCondition(CLVMOpcode.APPLY, transfer.param('INNER_PUZZLE'), transfer.param('inner_solution'));
  
  return transfer;
} 