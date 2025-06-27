/**
 * Layer Composition Utilities
 * 
 * Tools for composing multiple layers together
 */

import { PuzzleBuilder, puzzle } from '../builder/PuzzleBuilder';
import { TreeNode } from '../core/types';
import { withSingletonLayer } from './singletonLayer';
import { withOwnershipLayer, OwnershipLayerOptions } from './ownershipLayer';
import { withStateLayer, StateLayerOptions } from './stateLayer';
import { withNotificationLayer, NotificationLayerOptions } from './notificationLayer';

/**
 * Layer configuration
 */
export interface LayerConfig {
  singleton?: {
    launcherId: string;
  };
  ownership?: OwnershipLayerOptions;
  state?: StateLayerOptions;
  notification?: NotificationLayerOptions;
  royalty?: {
    royaltyAddress: string;
    tradePricePercentage: number;
  };
  metadata?: {
    metadata: Record<string, unknown>;
    updaterPuzzleHash?: string;
  };
}

/**
 * Apply multiple layers to a puzzle
 * @param innerPuzzle - The core puzzle to wrap
 * @param layers - Configuration for each layer
 * @returns Layered puzzle
 */
export function applyLayers(
  innerPuzzle: PuzzleBuilder | TreeNode,
  layers: LayerConfig
): PuzzleBuilder {
  let result = innerPuzzle instanceof PuzzleBuilder ? innerPuzzle : puzzle().wrap(() => innerPuzzle);
  
  // Apply layers in specific order (innermost to outermost)
  
  // 1. Notification layer (innermost - closest to core logic)
  if (layers.notification) {
    result = withNotificationLayer(result, layers.notification);
  }
  
  // 2. State layer
  if (layers.state) {
    result = withStateLayer(result, layers.state);
  }
  
  // 3. Ownership layer
  if (layers.ownership) {
    result = withOwnershipLayer(result, layers.ownership);
  }
  
  // 4. Singleton layer (outermost - ensures uniqueness)
  if (layers.singleton) {
    result = withSingletonLayer(result, layers.singleton.launcherId);
  }
  
  return result;
}

/**
 * Create a standard NFT with all layers
 * @param innerPuzzle - The inner puzzle (e.g., p2 conditions)
 * @param config - NFT configuration
 * @returns NFT puzzle with all layers
 */
export function createLayeredNFT(
  innerPuzzle: PuzzleBuilder,
  config: {
    launcherId: string;
    metadata: Record<string, unknown>;
    owner: string;
    royaltyAddress?: string;
    royaltyPercentage?: number;
    metadataUpdater?: string;
  }
): PuzzleBuilder {
  return applyLayers(innerPuzzle, {
    singleton: {
      launcherId: config.launcherId
    },
    ownership: {
      owner: config.owner,
      royaltyAddress: config.royaltyAddress,
      tradePricePercentage: config.royaltyPercentage
    },
    state: {
      initialState: config.metadata,
      stateUpdaterPuzzleHash: config.metadataUpdater
    }
  });
}

/**
 * Create a standard DID with layers
 * @param innerPuzzle - The inner puzzle
 * @param config - DID configuration
 * @returns DID puzzle with layers
 */
export function createLayeredDID(
  innerPuzzle: PuzzleBuilder,
  config: {
    launcherId: string;
    recoveryDids: string[];
    numVerificationsRequired: number;
    metadata?: Record<string, unknown>;
  }
): PuzzleBuilder {
  // DID inner puzzle with recovery logic
  const didInner = puzzle()
    .withCurriedParams({
      RECOVERY_DID_LIST_HASH: calculateRecoveryListHash(config.recoveryDids),
      NUM_VERIFICATIONS_REQUIRED: config.numVerificationsRequired
    })
    .merge(innerPuzzle);
  
  return applyLayers(didInner, {
    singleton: {
      launcherId: config.launcherId
    },
    state: config.metadata ? {
      initialState: config.metadata
    } : undefined
  });
}

/**
 * Create a layered smart contract
 * @param logic - The contract logic
 * @param config - Layer configuration
 * @returns Layered smart contract
 */
export function createLayeredContract(
  logic: PuzzleBuilder,
  config: {
    singleton?: boolean;
    launcherId?: string;
    hasState?: boolean;
    initialState?: Record<string, unknown>;
    hasNotifications?: boolean;
    notificationChannels?: string[];
  }
): PuzzleBuilder {
  const layers: LayerConfig = {};
  
  if (config.singleton && config.launcherId) {
    layers.singleton = { launcherId: config.launcherId };
  }
  
  if (config.hasState) {
    layers.state = {
      initialState: config.initialState || {}
    };
  }
  
  if (config.hasNotifications) {
    layers.notification = {
      notificationId: config.notificationChannels?.[0]
    };
  }
  
  return applyLayers(logic, layers);
}

/**
 * Extract inner puzzle from layered puzzle
 * @param layeredPuzzle - The layered puzzle
 * @param _layerTypes - Types of layers to unwrap (unused in simplified version)
 * @returns Inner puzzle
 */
export function extractInnerPuzzle(
  layeredPuzzle: TreeNode,
  _layerTypes: Array<'singleton' | 'ownership' | 'state' | 'notification'>
): TreeNode {
  // In real implementation would parse and extract inner puzzle
  // For now, return the layered puzzle as-is
  return layeredPuzzle;
}

/**
 * Calculate recovery list hash for DIDs
 * @param recoveryDids - List of recovery DID IDs
 * @returns Hash of recovery list
 */
function calculateRecoveryListHash(recoveryDids: string[]): string {
  // In real implementation would calculate merkle root of recovery DIDs
  // For now, create a deterministic hash based on the DIDs
  const combined = recoveryDids.sort().join('');
  return '0x' + Buffer.from(combined).toString('hex').padEnd(64, '0').slice(0, 64);
}

/**
 * Create a layer inspector
 * Returns information about layers applied to a puzzle
 */
export function inspectLayers(
  puzzle: TreeNode
): {
  layers: string[];
  innerPuzzle?: TreeNode;
  metadata?: Record<string, unknown>;
} {
  // In real implementation would analyze puzzle structure
  return {
    layers: [],
    innerPuzzle: puzzle
  };
}

/**
 * Compose layers with custom ordering
 * @param innerPuzzle - The core puzzle
 * @param layers - Array of layer functions in order
 * @returns Composed puzzle
 */
export function composeLayers(
  innerPuzzle: PuzzleBuilder,
  ...layers: Array<(puzzle: PuzzleBuilder) => PuzzleBuilder>
): PuzzleBuilder {
  return layers.reduce((puzzle, layer) => layer(puzzle), innerPuzzle);
}

// Remove undefined interfaces that are causing issues
export interface LayerOptions {
  type: 'singleton' | 'ownership' | 'state' | 'notification';
  options: unknown;
} 