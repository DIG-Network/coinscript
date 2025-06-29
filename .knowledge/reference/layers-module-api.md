# Layers Module API Reference

## Overview
The layers module provides composable puzzle wrappers that add functionality like uniqueness (singleton), ownership (NFT), state persistence, and more. Layers can be combined to create complex puzzle behaviors.

## Core Concepts

### Layer Architecture
- **Inner Puzzle**: The core logic being wrapped
- **Layer Puzzle**: Wrapper that adds functionality
- **Composition**: Layers can be nested (inner to outer)
- **Solution Routing**: Each layer handles its parameters and passes through to inner puzzle

### Layer Order
When composing multiple layers, order matters:
1. **Notification** (innermost) - Cross-puzzle messaging
2. **State** - Persistent state management
3. **Ownership** - NFT-like ownership
4. **Singleton** (outermost) - Uniqueness guarantee

## Singleton Layer

Ensures a coin is unique and trackable across spends.

### Functions

```typescript
// Wrap puzzle with singleton layer
withSingletonLayer(
  innerPuzzle: PuzzleBuilder | TreeNode,
  launcherId: string
): PuzzleBuilder

// Create launcher for new singleton
createSingletonLauncher(
  singletonPuzzleHash: string | Uint8Array,
  amount: number | bigint
): PuzzleBuilder

// Helper to create singleton structure
createSingletonStruct(launcherId: string): TreeNode

// Get singleton template (uncurried)
createSingletonTemplate(): PuzzleBuilder
```

### Usage Example
```typescript
const singletonPuzzle = withSingletonLayer(
  myPuzzle,
  '0x1234...' // launcher ID
);

// Solution format:
const solution = createSolution()
  .add(lineageProof)    // (parent_info parent_inner_puzzle_hash parent_amount)
  .add(myAmount)        // Current coin amount (must be odd)
  .add(innerSolution)   // Solution for wrapped puzzle
  .build();
```

### Key Properties
- Amount must always be odd (enforced by layer)
- Tracks lineage through parent references
- Launcher creates initial singleton coin
- Cannot be duplicated or destroyed

## State Layer

Provides persistent state across coin spends.

### Functions

```typescript
// Wrap puzzle with state layer
withStateLayer(
  innerPuzzle: PuzzleBuilder | TreeNode,
  options: StateLayerOptions
): PuzzleBuilder

interface StateLayerOptions {
  initialState: TreeNode | Record<string, unknown>;
  stateUpdaterPuzzleHash?: string | Expression;
  allowedUpdaters?: string[]; // Authorized updater pubkeys
}
```

### Usage Example
```typescript
const statefulPuzzle = withStateLayer(myPuzzle, {
  initialState: {
    counter: 0,
    owner: '0xabcd...',
    active: true
  },
  stateUpdaterPuzzleHash: updaterHash
});

// Solution format:
const solution = createSolution()
  .add(innerSolution)   // Solution for inner puzzle
  .add(stateUpdate)     // Optional state update
  .build();
```

## Ownership Layer

Manages ownership and transfer rules (NFT functionality).

### Functions

```typescript
// Wrap puzzle with ownership layer
withOwnershipLayer(
  innerPuzzle: PuzzleBuilder | TreeNode,
  options: OwnershipLayerOptions
): PuzzleBuilder

interface OwnershipLayerOptions {
  owner: string | Expression;
  transferProgram?: PuzzleBuilder | TreeNode;
  royaltyAddress?: string;
  tradePricePercentage?: number; // Basis points (500 = 5%)
}
```

### Usage Example
```typescript
const nftPuzzle = withOwnershipLayer(myPuzzle, {
  owner: ownerPubkey,
  royaltyAddress: artistAddress,
  tradePricePercentage: 500 // 5% royalty
});

// Solution format:
const solution = createSolution()
  .add(innerSolution)      // Solution for inner puzzle
  .add(newOwner)          // Optional: new owner if transferring
  .add(transferSolution)   // Optional: solution for transfer program
  .build();
```

## Notification Layer

Enables cross-puzzle messaging and announcements.

### Functions

```typescript
// Wrap puzzle with notification layer
withNotificationLayer(
  innerPuzzle: PuzzleBuilder | TreeNode,
  options: NotificationLayerOptions
): PuzzleBuilder

interface NotificationLayerOptions {
  notificationId?: string;
  targetPuzzleHash?: string;
  allowedSenders?: string[];
}
```

## Action Layer

Provides action-based state machines with merkle tree validation.

### Functions

```typescript
// Wrap puzzle with action layer
withActionLayer(
  innerPuzzle: PuzzleBuilder | TreeNode,
  options: ActionLayerOptions
): PuzzleBuilder

interface ActionLayerOptions {
  actions: BaseAction[];
  initialState?: Record<string, unknown>;
}

// Base action class
abstract class BaseAction<R extends Registry> {
  abstract curryTreeHash(): string;
  abstract constructPuzzle(builder: PuzzleBuilder): PuzzleBuilder;
  abstract spend(registry: R, params: Record<string, unknown>): SpendResult;
}
```

### Built-in Actions
```typescript
// Mint new tokens
class MintAction extends BaseAction
// Transfer ownership
class TransferAction extends BaseAction
// Update state values
class UpdateAction extends BaseAction
// Execute oracle price updates
class OracleAction extends BaseAction
// Delegated state changes
class DelegatedStateAction extends BaseAction
```

## Slot Machine Layer

Implements the slot machine pattern for stateful puzzles with action routing.

### Functions

```typescript
// Wrap puzzle with slot machine layer
withSlotMachineLayer(
  innerPuzzle: PuzzleBuilder | TreeNode,
  options: SlotMachineOptions
): PuzzleBuilder

interface SlotMachineOptions {
  actionMerkleRoot: string;
  initialState: TreeNode | Record<string, unknown>;
}
```

### Usage Example
```typescript
const slotMachine = withSlotMachineLayer(myPuzzle, {
  actionMerkleRoot: calculateActionMerkleRoot(actions),
  initialState: {
    balance: 1000,
    paused: false
  }
});

// Solution includes action proof
const solution = createSolution()
  .add(currentState)       // Current state
  .add(actionName)         // Action to execute
  .add(actionParams)       // Action parameters
  .add(merkleProof)        // Proof action is valid
  .build();
```

## Layer Composition

### High-Level Composition Functions

```typescript
// Apply multiple layers at once
applyLayers(
  innerPuzzle: PuzzleBuilder | TreeNode,
  layers: LayerConfig
): PuzzleBuilder

interface LayerConfig {
  singleton?: { launcherId: string };
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
```

### Pre-built Compositions

```typescript
// Create standard NFT with all layers
createLayeredNFT(
  innerPuzzle: PuzzleBuilder,
  config: {
    launcherId: string;
    metadata: Record<string, unknown>;
    owner: string;
    royaltyAddress?: string;
    royaltyPercentage?: number;
    metadataUpdater?: string;
  }
): PuzzleBuilder

// Create DID with layers
createLayeredDID(
  innerPuzzle: PuzzleBuilder,
  config: {
    launcherId: string;
    recoveryDids: string[];
    numVerificationsRequired: number;
    metadata?: Record<string, unknown>;
  }
): PuzzleBuilder

// Create layered smart contract
createLayeredContract(
  logic: PuzzleBuilder,
  config: {
    singleton?: boolean;
    launcherId?: string;
    hasState?: boolean;
    initialState?: Record<string, unknown>;
    hasNotifications?: boolean;
    notificationChannels?: string[];
  }
): PuzzleBuilder
```

### Custom Layer Composition

```typescript
// Compose layers with custom ordering
composeLayers(
  innerPuzzle: PuzzleBuilder,
  ...layers: Array<(puzzle: PuzzleBuilder) => PuzzleBuilder>
): PuzzleBuilder

// Example:
const customLayered = composeLayers(
  basePuzzle,
  p => withStateLayer(p, stateOptions),
  p => withOwnershipLayer(p, ownerOptions),
  p => withSingletonLayer(p, launcherId)
);
```

## Metadata Layer

Stores and manages metadata for NFTs and other assets.

### Functions

```typescript
// Wrap puzzle with metadata layer
withMetadataLayer(
  innerPuzzle: PuzzleBuilder | TreeNode,
  options: MetadataLayerOptions
): PuzzleBuilder

interface MetadataLayerOptions {
  metadata: Record<string, unknown>;
  updaterPuzzleHash?: string;
  metadataFormat?: 'CHIP-0007' | 'CHIP-0015' | 'custom';
}
```

## Royalty Layer

Enforces royalty payments on transfers.

### Functions

```typescript
// Wrap puzzle with royalty layer
withRoyaltyLayer(
  innerPuzzle: PuzzleBuilder | TreeNode,
  options: RoyaltyLayerOptions
): PuzzleBuilder

interface RoyaltyLayerOptions {
  royaltyAddress: string;
  tradePricePercentage: number; // Basis points
  minimumRoyaltyAmount?: number;
}
```

## Transfer Program Layer

Manages complex transfer logic and rules.

### Functions

```typescript
// Wrap puzzle with transfer program layer
withTransferProgramLayer(
  innerPuzzle: PuzzleBuilder | TreeNode,
  options: TransferProgramOptions
): PuzzleBuilder

interface TransferProgramOptions {
  transferProgram: PuzzleBuilder | TreeNode;
  requiresApproval?: boolean;
  allowedTransferees?: string[];
}
```

## Layer Inspection

### Utility Functions

```typescript
// Extract inner puzzle from layers
extractInnerPuzzle(
  layeredPuzzle: TreeNode,
  layerTypes: Array<'singleton' | 'ownership' | 'state' | 'notification'>
): TreeNode

// Get information about applied layers
inspectLayers(puzzle: TreeNode): {
  layers: string[];
  innerPuzzle?: TreeNode;
  metadata?: Record<string, unknown>;
}
```

## Common Patterns

### Basic NFT
```typescript
const nft = createLayeredNFT(
  puzzle().payToConditions(),
  {
    launcherId: generateLauncherId(),
    metadata: {
      name: "My NFT",
      image: "https://...",
      attributes: []
    },
    owner: ownerAddress,
    royaltyAddress: artistAddress,
    royaltyPercentage: 500 // 5%
  }
);
```

### Stateful Smart Contract
```typescript
const contract = applyLayers(
  contractLogic,
  {
    singleton: { launcherId },
    state: {
      initialState: {
        totalSupply: 1000000,
        paused: false
      }
    },
    notification: {
      notificationId: "contract_events"
    }
  }
);
```

### Multi-Layer DID
```typescript
const did = createLayeredDID(
  innerPuzzle,
  {
    launcherId: didId,
    recoveryDids: [recoveryDid1, recoveryDid2],
    numVerificationsRequired: 1,
    metadata: {
      name: "My Identity",
      publicKey: pubkey
    }
  }
);
```

## Best Practices

1. **Layer Order**: Apply layers from inner to outer based on dependencies
2. **Solution Structure**: Each layer expects specific solution parameters
3. **State Management**: Use state layer for data that changes over time
4. **Singleton Usage**: Apply singleton layer last for uniqueness
5. **Testing**: Test each layer individually before composition
6. **Gas Optimization**: Minimize layer count for efficiency

## Technical Details

### Mod Hashes
Each layer has a standardized mod hash:
- `SINGLETON_TOP_LAYER_MOD_HASH`
- `STATE_LAYER_MOD_HASH`
- `OWNERSHIP_LAYER_MOD_HASH`
- `METADATA_LAYER_MOD_HASH`

### Solution Routing
Solutions are structured to provide parameters for each layer:
1. Outermost layer parameters
2. Next layer parameters
3. ...continuing inward...
4. Inner puzzle solution

### Currying Structure
Layers use currying to embed parameters:
```
(layer_mod (curry params) inner_puzzle)
```

This allows efficient on-chain verification while maintaining flexibility. 