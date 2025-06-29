/**
 * Payment patterns
 * 
 * Simple payment puzzle patterns
 */

import { TreeNode } from '../core/types';
import { list, int, hex } from '../core/builders';
import { quote } from '../operators/control';
import { 
  APPLY, ARG, ARG1, ARG2, CONS, RAISE, SHA256TREE1,
  SUBTRACT, DIVIDE, MULTIPLY
} from '../core/opcodes';

/**
 * Pay to conditions - simplest puzzle that returns conditions from solution
 * (a (q . 2) 1) - Apply quote of arg 2 to environment
 */
export function payToConditions(): TreeNode {
  return list([APPLY, quote(ARG2), ARG1]);
}

/**
 * Pay to public key - requires signature
 * Returns condition: (AGG_SIG_ME pubkey (sha256tree1 conditions))
 */
export function payToPublicKey(publicKey: string | Uint8Array): TreeNode {
  const pubkeyNode = typeof publicKey === 'string' 
    ? hex(publicKey)
    : hex(Array.from(publicKey).map(b => b.toString(16).padStart(2, '0')).join(''));
  
  return list([
    CONS,
    list([int(50), pubkeyNode, list([SHA256TREE1, ARG1])]), // AGG_SIG_ME
    ARG1
  ]);
}

/**
 * Pay to puzzle hash - creates a coin with specific puzzle
 */
export function payToPuzzleHash(puzzleHash: string, amount: number | bigint): TreeNode {
  return quote(list([
    list([int(51), hex(puzzleHash), int(amount)]) // CREATE_COIN
  ]));
}

/**
 * Multi-payment - pay to multiple recipients
 */
export function multiPayment(payments: Array<{ puzzleHash: string; amount: number | bigint }>): TreeNode {
  const conditions = payments.map(({ puzzleHash, amount }) => 
    list([int(51), hex(puzzleHash), int(amount)]) // CREATE_COIN
  );
  return quote(list(conditions));
}

/**
 * Payment with change - pay amount and return change
 */
export function paymentWithChange(
  recipientPuzzleHash: string,
  paymentAmount: number | bigint,
  changePuzzleHash: string
): TreeNode {
  return list([
    CONS,
    list([int(51), hex(recipientPuzzleHash), int(paymentAmount)]), // CREATE_COIN
    list([
      CONS,
      list([int(51), hex(changePuzzleHash), list([SUBTRACT, ARG, int(paymentAmount)])]), // CREATE_COIN with change
      ARG1
    ])
  ]);
}

/**
 * Fixed payment - always pays specific amount to specific address
 */
export function fixedPayment(puzzleHash: string, amount: number | bigint): TreeNode {
  return quote(list([
    list([int(51), hex(puzzleHash), int(amount)]) // CREATE_COIN
  ]));
}

/**
 * Burner puzzle - destroys coins (pays to unspendable puzzle)
 */
export function burner(): TreeNode {
  // Puzzle that always fails
  return quote(list([RAISE]));
}

/**
 * Fee payment - just reserves fee
 */
export function feePayment(feeAmount: number | bigint): TreeNode {
  return quote(list([
    list([int(52), int(feeAmount)]) // RESERVE_FEE
  ]));
}

/**
 * Split payment - splits coin into N equal parts
 */
export function splitPayment(recipients: string[], totalAmount?: number | bigint): TreeNode {
  const amountPerRecipient = totalAmount 
    ? list([DIVIDE, int(totalAmount), int(recipients.length)])
    : list([DIVIDE, ARG, int(recipients.length)]);
  
  const conditions = recipients.map(puzzleHash => 
    list([int(51), hex(puzzleHash), amountPerRecipient]) // CREATE_COIN
  );
  
  return quote(list(conditions));
}

/**
 * Percentage payment - pay percentage to recipients
 */
export function percentagePayment(
  recipients: Array<{ puzzleHash: string; percentage: number }>
): TreeNode {
  // Verify percentages add up to 100
  const total = recipients.reduce((sum, r) => sum + r.percentage, 0);
  if (total !== 100) {
    throw new Error('Percentages must sum to 100');
  }
  
  const conditions = recipients.map(({ puzzleHash, percentage }) => 
    list([
      int(51), // CREATE_COIN
      hex(puzzleHash), 
      list([DIVIDE, list([MULTIPLY, ARG, int(percentage)]), int(100)])
    ])
  );
  
  return quote(list(conditions));
} 