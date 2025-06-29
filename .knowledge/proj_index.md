# Project Architecture Index

## Overview
The Chia Puzzle Framework is a comprehensive TypeScript framework for building smart coins on the Chia blockchain. It provides high-level abstractions, a domain-specific language (CoinScript), and extensive tooling for puzzle development.

## Core Architecture

### Entry Points
- **`src/index.ts`** - Main module exports and public API
  - Exports PuzzleBuilder factory
  - Re-exports core types and utilities
  - Provides `createPuzzle()` convenience function

## Module Hierarchy

### 1. Core Module (`src/core/`)
**Purpose**: Low-level ChiaLisp/CLVM operations and data structures

- **`types.ts`** - Fundamental types (TreeNode, Atom, List, Cons)
- **`builders.ts`** - Tree construction helpers (atom, list, cons, int, hex, etc.)
- **`serializer.ts`** - ChiaLisp serialization with comment support
- **`parser.ts`** - ChiaLisp source code parser
- **`opcodes.ts`** - CLVM opcode constants and definitions
- **`converters.ts`** - Conversions between tree formats and Program objects
- **`curry.ts`** - Currying and substitution operations
- **`utils.ts`** - Utility functions (hashing, etc.)
- **`clspFormatter.ts`** - ChiaLisp code formatter
- **`index.ts`** - Module exports

**Dependencies**: None (foundational module)

### 2. Builder Module (`src/builder/`)
**Purpose**: High-level fluent API for constructing puzzles and solutions

- **`PuzzleBuilder.ts`** - Main puzzle construction API
  - Condition builders
  - Control flow helpers
  - Mod structure generation
  - Serialization options
- **`SolutionBuilder.ts`** - Solution construction API
  - Parameter handling
  - State encoding
  - Action support
- **`index.ts`** - Module exports

**Dependencies**: 
- Core module (for tree operations)
- ChiaLisp module (for includes)
- Conditions module (for opcodes)

### 3. CoinScript Module (`src/coinscript/`)
**Purpose**: High-level domain-specific language for smart coins

- **`ast.ts`** - Abstract syntax tree types
- **`tokenizer.ts`** - CoinScript lexical analysis
- **`parser.ts`** - CoinScript parser and code generator
  - Tokenization
  - AST construction
  - ChiaLisp compilation
  - Layer integration
- **`includeFeatureTracker.ts`** - Tracks feature usage for auto-includes
- **`treeValidation.ts`** - Validates tree function calls
- **`index.ts`** - Module exports

**Dependencies**:
- Builder module (for puzzle generation)
- Layers module (for decorators)
- Core module (for tree operations)

### 4. Layers Module (`src/layers/`)
**Purpose**: Composable puzzle layers for common functionality

- **`singletonLayer.ts`** - Singleton (unique coin) implementation
- **`ownershipLayer.ts`** - NFT ownership management
- **`stateLayer.ts`** - State persistence layer
- **`metadataLayer.ts`** - Metadata storage layer
- **`royaltyLayer.ts`** - Royalty payment layer
- **`notificationLayer.ts`** - Cross-puzzle messaging
- **`actionLayer.ts`** - Action-based state machines
- **`slotMachineLayer.ts`** - Slot machine pattern
- **`transferProgramLayer.ts`** - Transfer program support
- **`layerComposition.ts`** - Layer composition utilities
- **`index.ts`** - Module exports

**Dependencies**:
- Builder module (for puzzle construction)
- ChiaLisp module (for standard puzzles)

### 5. Conditions Module (`src/conditions/`)
**Purpose**: Chia blockchain condition helpers

- **`opcodes.ts`** - Condition opcode enums
- **`spend.ts`** - Coin creation and spend conditions
- **`signatures.ts`** - Signature requirement conditions
- **`time.ts`** - Time lock conditions
- **`messages.ts`** - Announcement conditions

**Dependencies**:
- Core module (for tree operations)

### 6. Operators Module (`src/operators/`)
**Purpose**: CLVM operator wrappers

- **`arithmetic.ts`** - Math operations
- **`comparison.ts`** - Comparison operations
- **`logic.ts`** - Boolean logic operations
- **`control.ts`** - Control flow operations
- **`lists.ts`** - List manipulation
- **`crypto.ts`** - Cryptographic operations
- **`bls.ts`** - BLS signature operations

**Dependencies**:
- Core module (for tree operations and opcodes)

### 7. Patterns Module (`src/patterns/`)
**Purpose**: Common puzzle patterns

- **`payment.ts`** - Payment puzzle patterns
- **`delegation.ts`** - Delegation patterns

**Dependencies**:
- Core module
- Builder module

### 8. ChiaLisp Module (`src/chialisp/`)
**Purpose**: Standard ChiaLisp puzzles and libraries

- **`parser.ts`** - ChiaLisp file parser
- **`puzzleLibrary.ts`** - Standard puzzle loader
- **`includeIndex.ts`** - Include file registry
- **Subdirectories**:
  - `base/` - Core library files (.clib)
  - `standard/` - Standard puzzles
  - `singleton/` - Singleton puzzles
  - `cat/` - CAT puzzles
  - `nft/` - NFT puzzles
  - `did/` - DID puzzles
  - Various other puzzle types

**Dependencies**:
- Core module (for parsing)
- Builder module (for puzzle creation)

### 9. Runtime Module (`src/runtime/`)
**Purpose**: Runtime state management

- **`stateManager.ts`** - State encoding/decoding
  - StateManager class
  - ActionMerkleTree class
  - StatefulCoinManager class
- **`index.ts`** - Module exports

**Dependencies**:
- Core module (for tree operations)

### 10. Puzzles Module (`src/puzzles/`)
**Purpose**: Pre-built puzzle templates

- **`standard/paymentPuzzles.ts`** - Standard payment puzzles
- **`standard/index.ts`** - Module exports

**Dependencies**:
- Builder module
- Core module

### 11. Test Module (`src/__tests__/`)
**Purpose**: Comprehensive test suites

- **Subdirectories**:
  - `unit/` - Unit tests
  - `integration/` - Integration tests with simulator
- Test coverage for all modules

**Dependencies**: All modules

## Key Interfaces and APIs

### Public API (via index.ts)
```typescript
- createPuzzle(): PuzzleBuilder
- PuzzleBuilder class
- SolutionBuilder class
- Tree operations (atom, list, etc.)
- CoinScript compiler
- Layer composers
```

### Internal APIs
- Tree manipulation (core module)
- AST operations (coinscript module)
- State management (runtime module)
- Puzzle composition (layers module)

## Data Flow

1. **CoinScript → AST → PuzzleBuilder → TreeNode → Serialized**
2. **ChiaLisp → TreeNode → PuzzleBuilder → Enhanced Puzzle**
3. **Layers → Wrapped Puzzles → Composed Functionality**

## Module Dependencies Graph

```
index.ts
    ├── builder/
    │   ├── core/
    │   ├── chialisp/
    │   └── conditions/
    ├── coinscript/
    │   ├── builder/
    │   ├── layers/
    │   └── core/
    ├── layers/
    │   ├── builder/
    │   └── chialisp/
    ├── conditions/
    │   └── core/
    ├── operators/
    │   └── core/
    ├── patterns/
    │   ├── core/
    │   └── builder/
    ├── runtime/
    │   └── core/
    └── puzzles/
        └── builder/
```

## Extension Points

1. **New Layers**: Add to `src/layers/`
2. **New Operators**: Add to `src/operators/`
3. **New Patterns**: Add to `src/patterns/`
4. **New Conditions**: Add to `src/conditions/`
5. **CoinScript Features**: Extend parser in `src/coinscript/`

## Build and Configuration

- **TypeScript**: Strict mode with comprehensive type checking
- **Testing**: Jest with integration tests
- **Dependencies**: Minimal external dependencies
  - `clvm-lib` for CLVM operations
  - `@dignetwork/datalayer-driver` for simulator
  - Standard crypto libraries 