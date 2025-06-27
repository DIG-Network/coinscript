/**
 * Standard Puzzles Module
 * 
 * Basic payment and authentication patterns
 */

export * from './paymentPuzzles';

// Re-export common patterns
import { 
  payToConditions,
  payToPublicKey,
  payToDelegatedPuzzle,
  payToConditionsWithSig,
  multiSig
} from './paymentPuzzles';

export {
  payToConditions,
  payToPublicKey,
  payToDelegatedPuzzle,
  payToConditionsWithSig,
  multiSig
}; 