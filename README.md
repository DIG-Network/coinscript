# Chia Puzzle Framework

A TypeScript framework for building Chia blockchain puzzles with a fluent, type-safe API and CoinScript - a high-level language for Chia smart coins.

## Overview

The Chia Puzzle Framework provides two ways to create Chia puzzles:

1. **CoinScript** - A Solidity-inspired high-level language that compiles to ChiaLisp
2. **PuzzleBuilder API** - A fluent, type-safe TypeScript API for direct puzzle construction

Both approaches compile to efficient ChiaLisp code that runs on the Chia blockchain.

## Installation

```bash
npm install chia-puzzle-framework
```

## Quick Start

### Using CoinScript

```javascript
// payment.coins
coin SimplePayment {
    storage {
        address owner = 0xabcd...;
    }
    
    action pay(address recipient, uint256 amount) {
        require(msg.sender == owner);
        send(recipient, amount);
    }
}
```

```javascript
import { compileCoinScript } from 'chia-puzzle-framework';

// Compile CoinScript to ChiaLisp
const puzzle = compileCoinScript(coinScriptSource);
console.log(puzzle.serialize());
```

### Using PuzzleBuilder API

```typescript
import { createPuzzle, amount } from 'chia-puzzle-framework';

// Simple payment puzzle
const puzzle = createPuzzle()
  .requireSignature(publicKey)
  .createCoin(recipientPuzzleHash, amount)
  .build();

// Serialize to ChiaLisp
console.log(puzzle.serialize());
```

## CoinScript

CoinScript is a high-level language that compiles to ChiaLisp using the PuzzleBuilder API. It provides a Solidity-like syntax that's familiar to smart contract developers.

### Basic Syntax

```coinscript
coin PaymentContract {
  storage {
    address owner = 0xabcd...;
    uint256 balance = 0;
  }
  
  action transfer(address to, uint256 amount) {
    require(msg.sender == owner, "Only owner");
    require(amount <= balance, "Insufficient balance");
    
    balance -= amount;
    send(to, amount);
    emit Transfer(msg.sender, to, amount);
  }
  
  event Transfer(address from, address to, uint256 amount);
}
```

### Layer System

CoinScript supports all PuzzleBuilder layers through explicit declarations:

```coinscript
coin NFTContract {
  // Layer declarations
  layer singleton(launcherId: 0x1234...);
  layer state();
  layer ownership(owner: 0xabcd..., transferProgram: 0xdef0...);
  layer royalty(address: 0x5678..., percentage: 5);
  layer metadata(metadata: {name: "My NFT", uri: "https://..."});
  layer notification(notificationId: "nft-updates");
  layer transfer(transferProgram: 0x9abc...);
  
  // Rest of contract...
}
```

### Data Types

- `uint256` - Unsigned 256-bit integer
- `address` - 32-byte address/puzzle hash
- `bool` - Boolean value
- `bytes32` - 32-byte value
- `string` - String value
- `mapping(KeyType => ValueType)` - Key-value mapping

### Built-in Variables

- `msg.sender` - The address sending the transaction
- `msg.value` - The amount being sent
- `this` - The current contract instance

### Built-in Functions

- `require(condition, message)` - Assert a condition
- `send(address, amount)` - Send coins to an address
- `emit EventName(args...)` - Emit an event (creates announcement)
- `sha256(value)` - Compute SHA256 hash
- `pubkey(value)` - Get public key

### Decorators

Decorators modify action behavior:

- `@onlyAddress(address1, address2, ...)` - Restrict action to specific addresses
- `@stateful` - Mark action as stateful (uses slot-machine pattern)

Example:
```coinscript
@onlyAddress(owner)
action transferOwnership(address newOwner) {
  // Only owner can execute this
}

@stateful
action updateCounter() {
  state.counter += 1;  // State member access supported!
}
```

### Stateful Coins (Slot-Machine Pattern)

CoinScript now supports stateful coins using the slot-machine pattern:

```coinscript
coin StatefulToken {
    storage address admin = 0x...;
    
    // State block defines mutable state
    state {
        uint256 totalSupply;
        mapping(address => uint256) balances;
        bool paused;
    }
    
    @stateful
    action mint(address to, uint256 amount) {
        require(state.paused == false, "Contract is paused");
        state.totalSupply += amount;
        state.balances[to] += amount;
    }
}
```

Features:
- State is hidden while coin is unspent
- Actions compiled as separate puzzles with merkle tree
- Runtime support with `StateManager` and `StatefulCoinManager`
- Merkle proof generation using `merkletreejs`

### Control Flow

```coinscript
if (condition) {
  // statements
} else if (otherCondition) {
  // statements
} else {
  // statements
}
```

### Exception Handling

```coinscript
// Fail with a descriptive message
if (balance < requiredAmount) {
    exception("Insufficient balance");
}

// Fail without a message
if (address == 0x0) {
    exception;
}
```

The `exception` keyword compiles to ChiaLisp's `(x)` operator, causing immediate failure.

### Operators

- Arithmetic: `+`, `-`, `*`, `/`, `%`
- Comparison: `>`, `<`, `>=`, `<=`, `==`, `!=`
- Logical: `&&`, `||`, `!`
- Assignment: `=`, `+=`, `-=`

### Compiling CoinScript

```javascript
const { compileCoinScript, parseCoinScriptFile } = require('chia-puzzle-framework');

// From string
const puzzle = compileCoinScript(`
  coin SimplePayment {
    action pay(address recipient) {
      send(recipient, msg.value);
    }
  }
`);

// From file
const puzzle2 = parseCoinScriptFile('./contract.coins');

// Convert to ChiaLisp
console.log(puzzle.toChiaLisp());
```

### Multiple Puzzle Generation

CoinScript can generate multiple puzzles when needed:

```javascript
const result = compileCoinScript(`
  @singleton
  coin NFT {
    storage address owner = "xch1...";
    
    @stateful
    action transfer(address newOwner) {
      require(msg.sender == owner);
      owner = newOwner;
    }
  }
`);

// Access different puzzles
const mainPuzzle = result.mainPuzzle;          // The NFT logic
const launcherPuzzle = result.launcherPuzzle;  // Creates the singleton
const actionPuzzles = result.additionalPuzzles; // Stateful actions

// Metadata about the compilation
console.log(result.metadata); 
// { coinName: 'NFT', hasSingleton: true, hasStatefulActions: true, ... }
```

See the [Multiple Puzzles Guide](docs/multiple-puzzles-guide.md) for details.

## Key Features

### 🔨 Fluent Builder API

The `PuzzleBuilder` provides an intuitive, chainable API for constructing puzzles:

```typescript
const puzzle = createPuzzle()
  .if(amount.greaterThan(1000000))
    .then(b => b
      .createCoin(addr1, amount.divide(2))
      .createCoin(addr2, amount.divide(2))
    )
    .else(b => b
      .createCoin(addr3, amount)
    )
  .reserveFee(50)
  .build();
```

### 🎯 Decorators for Access Control

CoinScript now supports decorators to add metadata and behavior to actions:

```coinscript
@onlyAddress(owner, admin)
action withdraw(address recipient, uint256 amount) {
  require(amount > 0, "Invalid amount");
  send(recipient, amount);
}
```

The `@onlyAddress` decorator automatically generates validation logic to ensure only authorized addresses can execute the action.

### 💾 Stateful Smart Coins

Full support for stateful coins using the slot-machine pattern:

```coinscript
coin GameContract {
    state {
        uint256 score;
        address winner;
        mapping(address => uint256) playerScores;
    }
    
    @stateful
    action play(uint256 points) {
        state.playerScores[msg.sender] += points;
        if (state.playerScores[msg.sender] > state.score) {
            state.score = state.playerScores[msg.sender];
            state.winner = msg.sender;
        }
    }
}
```

Features:
- Hidden state until spend
- Merkle tree of actions
- State member access (`state.field`)
- Runtime state management with merkle proofs

### 🧮 Type-Safe Expressions

Build complex calculations with the `Expression` class:

```typescript
const fee = expr(50);
const commission = amount.multiply(0.01); // 1% commission
const netAmount = amount.subtract(fee).subtract(commission);

const puzzle = createPuzzle()
  .createCoin(recipient, netAmount)
  .createCoin(feeCollector, commission)
  .build();
```

### 🔒 Built-in Security Patterns

Common security patterns are built-in:

```typescript
// Time-locked payment
const timeLocked = createPuzzle()
  .requireAfterSeconds(3600) // 1 hour
  .createCoin(recipient, amount)
  .build();

// Multi-signature
const multiSig = createPuzzle()
  .requireSignature(pubkey1)
  .requireSignature(pubkey2)
  .createCoin(recipient, amount)
  .build();
```

### 🔄 Reusable Components

Compose and reuse puzzle components:

```typescript
const authComponent = puzzle()
  .requireSignature(authPubkey);

const feeComponent = puzzle()
  .reserveFee(50);

const finalPuzzle = createPuzzle()
  .merge(authComponent)
  .merge(feeComponent)
  .createCoin(recipient, amount)
  .build();
```

## Common Patterns

### Payment Puzzles

```typescript
// Pay to public key
const p2pk = createPuzzle()
  .payToPublicKey(publicKey)
  .build();

// Pay to conditions
const p2c = createPuzzle()
  .payToConditions()
  .build();

// Delegated puzzle
const delegated = createPuzzle()
  .delegatedPuzzle()
  .build();
```

### Conditional Logic

```typescript
// If/else conditions
const conditional = createPuzzle()
  .if(amount.greaterThan(threshold))
    .then(b => b.createCoin(addrA, amount))
    .else(b => b.createCoin(addrB, amount))
  .build();

// Multiple conditions
const multiCondition = createPuzzle()
  .if(amount.greaterThan(highThreshold))
    .then(b => b.requireSignature(adminKey))
  .elseIf(amount.greaterThan(medThreshold), b => b
    .requireSignature(userKey)
  )
  .else(b => b)
  .createCoin(recipient, amount)
  .build();
```

### Loops and Iteration

```typescript
// Split payment equally
const recipients = [addr1, addr2, addr3, addr4];

const splitPayment = createPuzzle()
  .forEach(recipients, (recipient, index, builder) => {
    builder.createCoin(recipient, amount.divide(recipients.length));
  })
  .build();

// Repeat pattern
const repeated = createPuzzle()
  .repeat(3, (index, builder) => {
    builder.createCoin(`addr${index}`, 1000 * (index + 1));
  })
  .build();
```

### Advanced Patterns

```typescript
// Escrow with timeout
const escrow = createPuzzle()
  .if(variable('released').equals(1))
    .then(b => b
      .requireSignature(sellerKey)
      .createCoin(buyerAddr, amount)
    )
    .else(b => b
      .requireAfterHeight(timeoutHeight)
      .requireSignature(sellerKey)
      .createCoin(sellerAddr, amount) // Refund
    )
  .build();

// Atomic swap
const atomicSwap = createPuzzle()
  .assertAnnouncement(swapCommitmentHash)
  .createCoin(recipient, amount)
  .build();
```

## Layer Abstractions

The framework provides built-in support for Chia's covenant layers:

### CAT (Colored Coins) Layer
```typescript
// Fixed supply CAT (no minting/melting)
const fixedSupplyCat = createPuzzle()
  .createCoin(recipient, amount)
  .withCATLayer(TAIL_PROGRAMS.NONE().toModHash());

// CAT with minting authority
const mintableCat = createPuzzle()
  .createCoin(recipient, amount)
  .withCATLayer(TAIL_PROGRAMS.EVERYTHING_WITH_SIGNATURE(pubkey).toModHash());

// One-time mint from genesis coin
const genesisCat = createPuzzle()
  .createCoin(recipient, amount)
  .withCATLayer(TAIL_PROGRAMS.GENESIS_BY_COIN_ID(genesisCoinId).toModHash());
```

### NFT Layers
```typescript
const nftPuzzle = createPuzzle()
  .createCoin(recipient, 1)
  .asNFT({
    metadata: '{"name": "My NFT", "image": "ipfs://..."}',
    metadataUpdaterPuzzleHash: '0x...',
    currentOwner: '0x...',
    royaltyAddress: '0x...',
    tradePricePercentage: 500 // 5%
  });
```

### Singleton Layer
```typescript
const singletonPuzzle = createPuzzle()
  .createCoin(newState, 1) // Odd amount required
  .withSingletonLayer(launcherId);
```

### Custom Layers
```typescript
const customLayer = createPuzzle()
  .withLayer({
    name: 'Rate Limiter',
    modHash: '0x...',
    curriedParams: { MAX_SPEND: 1000 },
    solutionParams: ['current_amount']
  });
```

## Layer System

The framework provides a generic layer system for composing functionality:

### Available Layers

- **Singleton Layer**: Ensures coin uniqueness and trackability
- **Ownership Layer**: Manages ownership and transfer rules  
- **State Layer**: Maintains mutable state across spends
- **Notification Layer**: Enables inter-coin communication
- **Royalty Layer**: Enforces royalty payments on trades
- **Metadata Layer**: Stores and manages structured metadata
- **Action Layer**: Enables composable actions that modify state (based on slot-machine design)

### Using Layers

```javascript
const { withSingletonLayer, withOwnershipLayer, applyLayers } = require('chia-puzzle-framework');

// Apply individual layers
const singletonPuzzle = withSingletonLayer(innerPuzzle, launcherId);

// Compose multiple layers
const nftPuzzle = applyLayers(innerPuzzle, {
  singleton: { launcherId: '0x...' },
  ownership: { owner: '0x...', royaltyAddress: '0x...' },
  state: { initialState: { name: 'My NFT' } }
});
```

### Pre-built Layer Patterns

```javascript
// Create a fully-featured NFT
const nft = createLayeredNFT(innerPuzzle, {
  launcherId: '0x...',
  metadata: { name: 'Cool NFT', image: 'ipfs://...' },
  owner: '0x...',
  royaltyAddress: '0x...',
  royaltyPercentage: 250 // 2.5%
});

// Create a DID
const did = createLayeredDID(innerPuzzle, {
  launcherId: '0x...',
  recoveryDids: ['0x...', '0x...'],
  numVerificationsRequired: 1
});

// Create a layered smart contract
const contract = createLayeredContract(logic, {
  singleton: true,
  launcherId: '0x...',
  hasState: true,
  initialState: { totalSupply: 1000000 }
});
```

## API Reference

### PuzzleBuilder

The main interface for building puzzles. See the [full API documentation](docs/puzzle-builder-guide.md).

Key methods:
- `createCoin(puzzleHash, amount)` - Create a coin
- `requireSignature(pubkey)` - Require signature
- `requireAfterSeconds(seconds)` - Time lock
- `if(condition).then().else()` - Conditional logic
- `forEach(items, callback)` - Iteration
- `merge(other)` - Composition
- `build()` - Build the puzzle
- `serialize(options?)` - Convert to ChiaLisp

### Serialization

The framework generates proper ChiaLisp with formatting that matches official Chia puzzle conventions:

```typescript
// Complex puzzle with includes and many parameters
const catLikePuzzle = createPuzzle()
  .includeConditionCodes()
  .includeCurryAndTreehash()
  .withCurriedParams({
    MOD_HASH: 'abcd' + '00'.repeat(30),
    TAIL_PROGRAM_HASH: 'beef' + '00'.repeat(30),
    INNER_PUZZLE: 'deadbeef'
  })
  .withSolutionParams('inner_solution', 'prev_coin_id', 'this_coin_info', 'extra_delta')
  .assertMyCoinId(createPuzzle().param('this_coin_info'))
  .createCoin(createPuzzle().param('INNER_PUZZLE'), createPuzzle().param('extra_delta'));

// Formatted output matching ChiaLisp conventions
console.log(catLikePuzzle.serialize({ indent: true }));
```

Output:
```clojure
(mod (
    MOD_HASH                 ;; curried into puzzle
    TAIL_PROGRAM_HASH        ;; curried into puzzle  
    INNER_PUZZLE             ;; curried into puzzle
    inner_solution    
    prev_coin_id             
    this_coin_info           ;; verified with ASSERT_MY_COIN_ID
    extra_delta
  )

  (include condition_codes.clvm)
  (include curry-and-treehash.clinc)
  (74 this_coin_info)
  (51 INNER_PUZZLE extra_delta)
)
```

The serializer provides:
- ChiaLisp-standard formatting matching official puzzles
- Multi-line parameter lists with aligned comments
- Proper grouping of include directives
- Smart decisions about single vs multi-line formatting
- Correct indentation for nested structures

### Comments

Add comments to make your puzzles more readable:

```typescript
const puzzle = createPuzzle()
  .withSolutionParams('amount', 'recipient')
  .blockComment('This puzzle demonstrates basic payment')
  .blockComment('with signature verification')
  .comment('Require signature from the puzzle owner')
  .requireSignature('0xpubkey...')
  .comment('Create the payment output')
  .createCoin(
    createPuzzle().param('recipient'), 
    createPuzzle().param('amount')
  );
```

Output:
```clojure
(mod (amount recipient)

  ;; This puzzle demonstrates basic payment
  ;; with signature verification

  (
    c
    (50 0xpubkey... (sha256tree1 "1")) ;; Require signature from the puzzle owner
    (c (51 recipient amount) ;; Create the payment output "()")
  )
)
```

Types of comments:
- `comment(text)` - Adds an inline comment to the next condition
- `blockComment(text)` - Adds a standalone comment line before the body
- `toModHash()` - Calculate SHA256 tree hash of the puzzle

### TAIL Programs

Built-in TAIL programs for CATs:
- `TAIL_PROGRAMS.NONE()` - No minting/melting allowed (fixed supply)
- `TAIL_PROGRAMS.EVERYTHING_WITH_SIGNATURE(pubkey)` - Mint/melt with signature
- `TAIL_PROGRAMS.GENESIS_BY_COIN_ID(coinId)` - One-time mint from specific coin
- `TAIL_PROGRAMS.DELEGATED_TAIL(innerPuzzle)` - Delegate to custom logic

### Expression

For building calculations and conditions:

### State Management

CoinScript distinguishes between two types of state:

1. **Storage Variables** - Immutable values that are part of the puzzle definition
   ```coinscript
   storage address admin = "xch1...";  // Cannot change
   storage uint256 maxSupply = 1000000;
   ```

2. **State Variables** - Mutable values stored in the coin's memo
   ```coinscript
   state uint256 totalSupply = 0;  // Can be updated
   state bool paused = false;
   ```

When spending a coin with state variables, the current state is read from the coin's memo, can be modified during the spend, and new coins are created with the updated state.

### Events

Events in CoinScript compile directly to Chia coin announcements:

```coinscript
event Transfer(address from, address to, uint256 amount);

action transfer(address to, uint256 amount) {
    // ... transfer logic ...
    emit Transfer(msg.sender, to, amount);
}
```

The `emit` statement creates a coin announcement that can be observed by other coins or external systems.