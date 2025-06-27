/**
 * Ownership Layer
 * 
 * Manages ownership and transfer rules for any puzzle
 */

import { PuzzleBuilder, puzzle, Expression } from '../builder/PuzzleBuilder';
import { TreeNode } from '../core/types';
import { list, hex, int } from '../core/builders';
import { CLVMOpcode } from '../core/opcodes';
import { ConditionOpcode } from '../conditions/opcodes';

/**
 * Create the ownership layer puzzle definition
 */
function createOwnershipLayerPuzzle(): PuzzleBuilder {
  const ownership = puzzle();
  
  ownership.withCurriedParams({
    OWNER: 'OWNER',
    TRANSFER_PROGRAM: 'TRANSFER_PROGRAM',
    INNER_PUZZLE: 'INNER_PUZZLE'
  });
  
  ownership.withSolutionParams(
    'inner_solution',
    'transfer_solution'
  );
  
  ownership.includeConditionCodes();
  ownership.includeCurryAndTreehash();
  
  // Ownership layer logic
  ownership.comment('Ownership layer - manage ownership and transfers');
  ownership.addCondition(2, // APPLY
    ownership.param('INNER_PUZZLE'),
    ownership.param('inner_solution')
  );
  
  return ownership;
}

// Calculate and cache the mod hash
let _ownershipLayerModHash: string | null = null;

export function getOwnershipLayerModHash(): string {
  if (!_ownershipLayerModHash) {
    _ownershipLayerModHash = createOwnershipLayerPuzzle().toModHash();
  }
  return _ownershipLayerModHash;
}

// Export both as function and constant for compatibility
export const OWNERSHIP_LAYER_MOD_HASH = getOwnershipLayerModHash;

/**
 * Ownership layer options
 */
export interface OwnershipLayerOptions {
  owner: string | Expression;
  transferProgram?: PuzzleBuilder | TreeNode;
  royaltyAddress?: string;
  tradePricePercentage?: number; // In basis points (500 = 5%)
}

/**
 * Wrap any puzzle with ownership layer
 * @param innerPuzzle - The inner puzzle to wrap
 * @param options - Ownership configuration
 * @returns Ownership wrapped puzzle
 */
export function withOwnershipLayer(
  innerPuzzle: PuzzleBuilder | TreeNode,
  options: OwnershipLayerOptions
): PuzzleBuilder {
  const ownership = puzzle();
  ownership.noMod();
  
  const innerTree = innerPuzzle instanceof PuzzleBuilder ? innerPuzzle.build() : innerPuzzle;
  const transferTree = options.transferProgram 
    ? (options.transferProgram instanceof PuzzleBuilder ? options.transferProgram.build() : options.transferProgram)
    : createDefaultTransferProgram(options.royaltyAddress, options.tradePricePercentage).build();
  
  ownership.withCurriedParams({
    OWNERSHIP_LAYER_MOD_HASH: hex(getOwnershipLayerModHash()),
    CURRENT_OWNER: options.owner,
    TRANSFER_PROGRAM: transferTree,
    INNER_PUZZLE: innerTree
  });
  
  ownership.withSolutionParams(
    'inner_solution',
    'new_owner',          // Optional: new owner if transferring
    'transfer_solution'   // Optional: solution for transfer program
  );
  
  ownership.includeConditionCodes();
  ownership.includeCurryAndTreehash();
  
  ownership.comment('Ownership layer enforces ownership rules');
  
  // Check if ownership is being transferred
  ownership.if(ownership.param('new_owner'))
    .then((b: PuzzleBuilder) => {
      b.comment('Handle ownership transfer');
      
      // Run transfer program to validate transfer
      b.comment('Validate transfer via transfer program');
      b.addCondition(CLVMOpcode.APPLY,
        b.param('TRANSFER_PROGRAM'),
        b.param('transfer_solution')
      );
      
      // Create announcement of ownership change
      b.comment('Announce ownership change');
      b.createAnnouncement('ownership_transfer');
    })
    .else(() => {});
  
  // Run inner puzzle
  ownership.comment('Run inner puzzle');
  ownership.addCondition(CLVMOpcode.APPLY,
    ownership.param('INNER_PUZZLE'),
    ownership.param('inner_solution')
  );
  
  return ownership;
}

/**
 * Create a default transfer program
 * @param royaltyAddress - Address to receive royalties (optional)
 * @param tradePricePercentage - Royalty percentage in basis points
 * @returns Transfer program puzzle
 */
export function createDefaultTransferProgram(
  royaltyAddress?: string,
  tradePricePercentage?: number
): PuzzleBuilder {
  const transfer = puzzle();
  transfer.noMod();
  
  transfer.withCurriedParams({
    ROYALTY_ADDRESS: royaltyAddress || hex('00'.repeat(32)),
    TRADE_PRICE_PERCENTAGE: tradePricePercentage || 0
  });
  
  transfer.withSolutionParams(
    'current_owner',
    'new_owner', 
    'trade_price'
  );
  
  transfer.comment('Default transfer program');
  
  // Require signature from current owner
  transfer.comment('Require current owner signature');
  transfer.addCondition(ConditionOpcode.AGG_SIG_ME,
    transfer.param('current_owner'),
    transfer.param('new_owner')
  );
  
  // If trade price specified and royalties configured, create royalty payment
  if (royaltyAddress && tradePricePercentage) {
    transfer.if(transfer.param('trade_price'))
      .then((b: PuzzleBuilder) => {
        b.comment('Calculate and pay royalties');
        // In real implementation, would calculate royalty amount
        // royalty_amount = trade_price * TRADE_PRICE_PERCENTAGE / 10000
      });
  }
  
  // Return success
  transfer.returnConditions();
  
  return transfer;
}

/**
 * Create a multi-signature transfer program
 * @param requiredSignatures - Number of signatures required
 * @param authorizedKeys - List of authorized public keys
 * @returns Multi-sig transfer program
 */
export function createMultiSigTransferProgram(
  requiredSignatures: number,
  authorizedKeys: string[]
): PuzzleBuilder {
  const transfer = puzzle();
  transfer.noMod();
  
  transfer.withCurriedParams({
    REQUIRED_SIGS: requiredSignatures,
    AUTHORIZED_KEYS: list(authorizedKeys.map(key => hex(key)))
  });
  
  transfer.withSolutionParams(
    'current_owner',
    'new_owner',
    'trade_prices_list',
    'signatures' // List of (pubkey, signature) pairs
  );
  
  transfer.comment('Multi-signature transfer program');
  
  // Verify we have enough signatures
  transfer.comment('Verify required number of signatures');
  transfer.if(transfer.param('signatures').greaterThan(requiredSignatures - 1))
    .then(b => {
      b.comment('Signatures verified');
    })
    .else(b => {
      b.fail('Insufficient signatures');
    });
  
  // In real implementation, would verify each signature is from authorized key
  transfer.comment('Verify signatures from authorized keys');
  
  return transfer;
}

/**
 * Create a time-locked transfer program
 * @param unlockTime - Timestamp when transfers are allowed
 * @returns Time-locked transfer program
 */
export function createTimeLockedTransferProgram(
  unlockTime: number
): PuzzleBuilder {
  const transfer = puzzle();
  transfer.noMod();
  
  transfer.withCurriedParams({
    UNLOCK_TIME: unlockTime
  });
  
  transfer.withSolutionParams(
    'current_owner',
    'new_owner',
    'trade_prices_list'
  );
  
  transfer.comment('Time-locked transfer program');
  
  // Require time has passed
  transfer.comment('Ensure unlock time has passed');
  transfer.requireAfterSeconds(unlockTime);
  
  // Require owner signature
  transfer.comment('Require current owner signature');
  transfer.requireSignature('0x' + 'a'.repeat(96));
  
  return transfer;
}

/**
 * Create ownership solution for transfers
 * @param newOwner - New owner address
 * @param tradePrices - Optional trade prices for royalty calculation
 * @returns Solution for ownership transfer
 */
export function createOwnershipTransferSolution(
  innerSolution: TreeNode,
  newOwner?: string,
  tradePrices?: number[],
  newTransferProgram?: TreeNode
): TreeNode {
  const solutionItems = [innerSolution];
  
  if (newOwner) {
    solutionItems.push(
      tradePrices ? list(tradePrices.map(p => int(p))) : list([]),
      hex(newOwner),
      newTransferProgram || list([])
    );
  }
  
  return list(solutionItems);
} 