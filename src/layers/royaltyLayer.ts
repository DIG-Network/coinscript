/**
 * Royalty Layer
 * 
 * Manages royalty payments for trades
 */

import { PuzzleBuilder, puzzle } from '../builder/PuzzleBuilder';
import { TreeNode } from '../core/types';
import { ConditionOpcode } from '../conditions/opcodes';
import { CLVMOpcode } from '../core/opcodes';

export interface RoyaltyLayerOptions {
  royaltyAddress: string;
  royaltyPercentage: number; // In basis points (500 = 5%)
  minRoyaltyAmount?: number;
  maxRoyaltyAmount?: number;
}

export function withRoyaltyLayer(
  innerPuzzle: PuzzleBuilder | TreeNode,
  options: RoyaltyLayerOptions
): PuzzleBuilder {
  const royalty = puzzle();
  royalty.noMod();
  
  const innerTree = innerPuzzle instanceof PuzzleBuilder ? innerPuzzle.build() : innerPuzzle;
  
  royalty.withCurriedParams({
    ROYALTY_ADDRESS: options.royaltyAddress,
    ROYALTY_PERCENTAGE: options.royaltyPercentage,
    MIN_ROYALTY: options.minRoyaltyAmount || 0,
    MAX_ROYALTY: options.maxRoyaltyAmount || 0,
    INNER_PUZZLE: innerTree
  });
  
  royalty.withSolutionParams(
    'inner_solution',
    'trade_price'
  );
  
  royalty.comment('Royalty layer enforces royalty payments');
  
  // Calculate and enforce royalty payment
  royalty.if(royalty.param('trade_price').greaterThan(0))
    .then((b: PuzzleBuilder) => {
      b.comment('Calculate and pay royalty');
      // Calculate royalty amount as (trade_price * royalty_percentage) / 10000
      const royaltyAmount = b.param('trade_price')
        .multiply(b.param('ROYALTY_PERCENTAGE'))
        .divide(10000);
      
      // Create the royalty payment with calculated amount
      b.addCondition(ConditionOpcode.CREATE_COIN,
        b.param('ROYALTY_ADDRESS'),
        royaltyAmount
      );
    })
    .else(() => {});
  
  // Run inner puzzle
  royalty.addCondition(CLVMOpcode.APPLY, royalty.param('INNER_PUZZLE'), royalty.param('inner_solution'));
  
  return royalty;
} 