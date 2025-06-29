/**
 * Runtime support for stateful coins
 */

export {
  StateManager,
  ActionMerkleTree,
  StatefulCoinManager
} from './stateManager';

// Export interfaces separately with export type
export type {
  StateField,
  CoinState
} from './stateManager'; 