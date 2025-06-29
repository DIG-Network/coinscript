# Chia Puzzle Framework - Architectural Knowledge Base

## Executive Summary

The Chia Puzzle Framework is a comprehensive TypeScript framework for building smart contracts (puzzles) on the Chia blockchain. It provides multiple abstraction levels from low-level ChiaLisp manipulation to a high-level CoinScript DSL, with a sophisticated layer system for composable functionality.

## System Architecture

### Abstraction Hierarchy

```
Level 5: CoinScript DSL (Solidity-like syntax)
         ↓ Compiles to
Level 4: PuzzleBuilder API (Fluent builder pattern)
         ↓ Generates
Level 3: TreeNode AST (Abstract syntax tree)
         ↓ Serializes to
Level 2: ChiaLisp Source (Lisp syntax)
         ↓ Compiles to
Level 1: CLVM Bytecode (Virtual machine code)
```

### Core Architectural Components

## 1. Core Module (`/src/core/`)

The foundation layer providing data structures and fundamental operations.

### Data Model
- **TreeNode**: Union type of Atom | List | Cons
- **Atom**: Leaf nodes containing values (numbers, strings, bytes)
- **List**: Proper lists (nil-terminated sequences)
- **Cons**: Improper lists (pairs)

### Key Design Decisions:
- **Immutable AST**: All tree operations create new nodes
- **Type Guards**: Runtime type checking with TypeScript predicates
- **Flexible Values**: Atoms support multiple primitive types
- **Error Hierarchy**: Specialized error classes with context

### Core Operations:
- **Parsing**: Recursive descent parser for ChiaLisp syntax
- **Serialization**: Configurable output with formatting options
- **Tree Hashing**: SHA-256 based merkle tree hashing
- **Substitution**: Variable replacement in AST

## 2. Builder Pattern Implementation (`/src/builder/`)

### PuzzleBuilder Architecture

**Design Pattern**: Fluent Builder with Method Chaining
```typescript
class PuzzleBuilder {
  private nodes: TreeNode[] = [];
  private curriedParams: Map<string, TreeNode> = new Map();
  private isModStructure: boolean = true;
  
  someMethod(): this {
    this.addNode(/*...*/);
    return this;
  }
}
```

**Key Features**:
- **Context Tracking**: Maintains if/then/else context
- **Auto-Includes**: Tracks feature usage and adds required libraries
- **Comment Preservation**: Associates comments with nodes
- **Multi-Format Output**: ChiaLisp, CLVM, hex, modhash

### SolutionBuilder Architecture

**Purpose**: Construct solutions (spending scripts) for puzzles
- Supports various structure types (list, cons, raw)
- Specialized condition list builder
- State encoding for stateful contracts

## 3. CoinScript Compiler (`/src/coinscript/`)

### Compilation Pipeline

1. **Tokenization** (`Tokenizer` class)
   - Character stream → Token stream
   - Supports 40+ token types
   - Preserves position information

2. **Parsing** (`Parser` class)
   - Recursive descent parser
   - Builds CoinScript AST
   - Validates syntax structure

3. **Code Generation** (`CodeGenerator` class)
   - CoinScript AST → PuzzleBuilder calls
   - Storage variable substitution
   - State management code generation
   - Feature tracking for auto-includes

### Language Features Implementation

**Storage Variables**: Curried into puzzle at creation
```typescript
// CoinScript: storage address owner = 0x...;
// Generates: puzzle.withCurriedParams({ owner: '0x...' })
```

**State Variables**: Slot machine pattern
```typescript
// CoinScript: state { uint256 counter; }
// Generates: Merkle tree of stateful actions
```

**Actions**: Entry points with routing
```typescript
// Multiple actions generate if/else routing based on ACTION parameter
if (ACTION == 'transfer') { /* transfer logic */ }
else if (ACTION == 'approve') { /* approve logic */ }
```

**Decorators**: Modify compilation behavior
- `@singleton`: Wraps with singleton layer
- `@stateful`: Enables state access, adds state parameter
- `@inner_puzzle`: Routes to curried inner puzzle

## 4. Layer System (`/src/layers/`)

### Layer Architecture Pattern

Each layer follows this pattern:
```typescript
export function withXLayer(
  innerPuzzle: PuzzleBuilder | TreeNode,
  options: XLayerOptions
): PuzzleBuilder {
  // 1. Create wrapper puzzle
  // 2. Process inner puzzle conditions
  // 3. Add layer-specific logic
  // 4. Return wrapped puzzle
}
```

### Layer Implementations

**Singleton Layer**:
- Ensures single instance via launcher coin
- Tracks lineage through parent proofs
- Validates coin recreation

**State Layer**:
- Key-value state management
- State updater puzzle for validation
- Merkle tree state representation

**Ownership Layer**:
- NFT-style ownership
- Transfer program abstraction
- NEW_OWNER_CONDITION (-10) processing

**Slot Machine Layer**:
- Complex state machines
- Action merkle tree
- State transition validation

### Layer Composition

Layers can be stacked:
```typescript
let puzzle = basePuzzle;
puzzle = withSingletonLayer(puzzle, { launcherId });
puzzle = withOwnershipLayer(puzzle, { owner });
puzzle = withStateLayer(puzzle, { initialState });
```

## 5. Operator Wrappers (`/src/operators/`)

### Design Philosophy
- Type-safe wrappers for all CLVM operators
- Consistent parameter ordering
- Descriptive function names
- Tree node input/output

### Categories:
- **Arithmetic**: Basic math operations
- **Comparison**: Equality and ordering
- **Logic**: Boolean operations
- **Lists**: List manipulation
- **Crypto**: Hashing functions
- **BLS**: Signature operations
- **Control**: Flow control

## 6. Condition System (`/src/conditions/`)

### Condition Code Abstraction

Each condition is wrapped with type safety:
```typescript
export function createCoin(
  puzzleHash: PuzzleHash,
  amount: Amount,
  hint?: PuzzleHash
): TreeNode {
  const args = [toHashNode(puzzleHash), toAmountNode(amount)];
  if (hint) args.push(toHashNode(hint));
  return list([int(ConditionOpcode.CREATE_COIN), ...args]);
}
```

### Condition Categories:
- **Spend Conditions**: Coin creation, fees
- **Time Conditions**: Time locks
- **Signature Conditions**: Authentication
- **Message Conditions**: Announcements

## 7. Pattern Library (`/src/patterns/`)

### Common Patterns

**Payment Patterns**:
- Pay to conditions
- Pay to public key
- Multi-payment
- Split payment

**Delegation Patterns**:
- Delegated puzzles
- Graftroot/Taproot
- Time-locked delegation
- Multi-authority

## 8. Runtime Support (`/src/runtime/`)

### State Management Infrastructure

**StateManager**:
- Encodes/decodes state to/from TreeNode
- Validates state structure
- Computes state diffs

**ActionMerkleTree**:
- Builds merkle tree of action puzzles
- Generates merkle proofs
- Verifies action inclusion

**StatefulCoinManager**:
- Orchestrates stateful contracts
- Prepares solutions with state
- Validates state transitions

## Implementation Patterns

### 1. Builder Pattern
Used throughout for fluent APIs:
- Method chaining
- Immutable builders
- Lazy evaluation
- Context preservation

### 2. Factory Pattern
Creation functions for common objects:
- `createSolution()`
- `createConditions()`
- `puzzle()`

### 3. Visitor Pattern
Tree traversal and transformation:
- AST walking
- Node transformation
- Serialization

### 4. Strategy Pattern
Pluggable behaviors:
- Serialization strategies
- Include resolution
- State encoding

### 5. Decorator Pattern
Layer system implementation:
- Wraps inner puzzles
- Adds functionality
- Preserves interface

## Security Architecture

### Compile-Time Security
- Type checking
- Syntax validation
- Access control verification
- State integrity checks

### Runtime Security
- Signature verification (AGG_SIG_ME)
- Merkle proof validation
- Condition satisfaction
- State transition validation

### Security Patterns
- Owner-only actions
- Time-locked operations
- Multi-signature requirements
- Announcement coordination

## Performance Optimizations

### Compilation
- Constant folding
- Dead code elimination
- Include deduplication
- Expression simplification

### Runtime
- O(log n) merkle proofs
- Minimal solution sizes
- Efficient state encoding
- Lazy evaluation

### Memory
- Node reuse in AST
- Streaming serialization
- Efficient string handling
- GC-friendly patterns

## Testing Infrastructure

### Test Categories
1. **Unit Tests**: Function-level testing
2. **Integration Tests**: Module interaction
3. **Compilation Tests**: CoinScript → ChiaLisp
4. **Execution Tests**: CLVM simulation
5. **E2E Tests**: Complete scenarios

### Test Patterns
- Round-trip serialization
- AST comparison
- Condition verification
- State machine validation

## Extension Points

### Adding Layers
1. Create layer function in `/src/layers/`
2. Define options interface
3. Implement wrapper logic
4. Export from index

### Adding CoinScript Features
1. Add tokens to `TokenType` enum
2. Update parser grammar
3. Implement code generation
4. Add feature tests

### Adding Operators
1. Create wrapper in `/src/operators/`
2. Follow naming convention
3. Add type safety
4. Document usage

## Key Architectural Decisions

1. **TreeNode as Central Abstraction**: All representations convert to/from TreeNode
2. **Builder Pattern Everywhere**: Consistent API across modules
3. **Layer Composability**: Decorators can stack in any order
4. **Type Safety First**: Full TypeScript coverage
5. **Immutable by Default**: Functional programming principles
6. **Feature Detection**: Auto-include based on usage
7. **Multi-Level API**: Different abstractions for different users
8. **Extensible Design**: Easy to add new features

## Module Dependencies

```
index.ts
  ├── builder/
  │     ├── core/
  │     └── chialisp/
  ├── coinscript/
  │     ├── builder/
  │     └── core/
  ├── layers/
  │     └── builder/
  ├── runtime/
  │     └── core/
  └── [operators, conditions, patterns]
        └── core/
```

## Future Architecture Considerations

1. **WASM Compilation**: Direct to WebAssembly
2. **Visual Builder**: Drag-and-drop puzzle creation
3. **Formal Verification**: Mathematical proofs
4. **Optimization Passes**: Advanced compilation
5. **Debugging Support**: Step-through execution
6. **IDE Integration**: Language server protocol

## State Management System

### Overview
The Chia Puzzle Framework implements a sophisticated state management system that enables smart contracts to maintain persistent state across blockchain transactions. This is achieved through a combination of the CoinScript language features and the underlying ChiaLisp state machine pattern.

### Key Components

1. **State Declaration**
   - State variables are declared in the `state {}` block
   - Supports all primitive types: uint256, address, string, bool
   - State is mutable within actions but persisted across spends

2. **Stateful Actions**
   - Actions marked with `@stateful` decorator have access to state
   - State transitions are validated according to contract rules
   - Each action can modify state and trigger coin recreation

3. **State Persistence Mechanism**
   - State is encoded as part of the solution when spending
   - `recreateSelf()` creates a new coin with updated state
   - Each state change creates a new block entry
   - Complete history preserved on blockchain

4. **Security Features**
   - Access control via `require()` statements
   - State validation before transitions
   - Atomic state updates (all or nothing)
   - Rate limiting and balance checks

### Implementation Details

The state management system uses:
- **Merkle Trees**: For efficient state representation
- **Action Routing**: If/else chains for action dispatch
- **Solution Encoding**: State passed as solution parameters
- **Coin Recreation**: CREATE_COIN conditions with state updates

### Real-World Applications

1. **DeFi Protocols**: AMMs, lending pools, yield farming
2. **Gaming**: Character progression, inventories, tournaments
3. **Governance**: Voting, treasury management, delegation
4. **NFTs**: Dynamic metadata, breeding, staking
5. **Supply Chain**: Multi-stage tracking, approvals

### Example Usage

```typescript
coin StatefulContract {
  storage address owner = 0x...;
  
  state {
    uint256 counter;
    address lastUser;
  }
  
  @stateful
  action increment() {
    state.counter += 1;
    state.lastUser = msg.sender;
    recreateSelf();
  }
}
```

This architecture provides a solid foundation for building complex Chia smart contracts while maintaining flexibility, type safety, and composability throughout the stack. 