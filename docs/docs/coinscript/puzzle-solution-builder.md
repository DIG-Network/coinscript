---
sidebar_position: 4
title: PuzzleBuilder & SolutionBuilder
description: Learn how to use PuzzleBuilder and SolutionBuilder to create and interact with Chia smart coins
---

# PuzzleBuilder & SolutionBuilder

The Chia Puzzle Framework provides two powerful builder classes that form the foundation for creating and interacting with smart coins. This guide covers both builders in detail.

## Overview

- **PuzzleBuilder**: Creates puzzle (smart contract) logic
- **SolutionBuilder**: Creates solutions to spend puzzles

These builders provide a fluent, type-safe API for constructing Chia smart coins without writing ChiaLisp directly.

## PuzzleBuilder

The PuzzleBuilder is your primary tool for creating smart coin logic. It can load CoinScript files or build puzzles programmatically.

### Basic Usage

#### Loading CoinScript

```javascript
import { PuzzleBuilder } from 'chia-puzzle-framework';

// Load a CoinScript file
const puzzle = new PuzzleBuilder();
await puzzle.load('./my-contract.coins');

// Compile to different formats
const chialisp = puzzle.toChiaLisp();
const clvm = puzzle.toCLVM();
const puzzleHash = puzzle.hash();
```

#### Building Programmatically

```javascript
const puzzle = new PuzzleBuilder()
  .constant('OWNER', '0x1234...')
  .parameter('action')
  .parameter('amount')
  .if(
    b => b.equals('action', '"transfer"'),
    b => b.addCondition(requireSignature('OWNER'))
         .addCondition(sendCoins('recipient', 'amount'))
  );
```

### Core Methods

#### Constants and Parameters

```javascript
// Define constants (compile-time values)
puzzle.constant('OWNER', '0x1234...');
puzzle.constant('FEE', 1000);
puzzle.constant('VERSION', 1);

// Define parameters (runtime values from solution)
puzzle.parameter('action');
puzzle.parameter('recipient');
puzzle.parameter('amount');
```

#### Conditions

```javascript
// Signature requirements
puzzle.addCondition(requireSignature('0x1234...'));
puzzle.addCondition(requireSignature('OWNER'));  // Using constant

// Coin creation
puzzle.addCondition(sendCoins('recipient', 1000));
puzzle.addCondition(sendCoins('0xabcd...', 'amount'));  // Using parameter

// Announcements
puzzle.addCondition(createAnnouncement('Hello World'));
puzzle.addCondition(assertAnnouncement('expected_hash'));

// Time locks
puzzle.addCondition(requireTimeAbsolute(1234567890));
puzzle.addCondition(requireTimeRelative(3600));  // 1 hour
```

#### Control Flow

```javascript
// If-else statements
puzzle.if(
  b => b.equals('action', '"transfer"'),
  b => b.addCondition(sendCoins('recipient', 'amount')),
  b => b.fail('Invalid action')
);

// Multiple conditions
puzzle.if(
  b => b.and(
    b => b.greaterThan('amount', 0),
    b => b.lessThan('amount', 'MAX_AMOUNT')
  ),
  b => b.addCondition(sendCoins('recipient', 'amount'))
);

// Switch-like pattern
puzzle
  .if(b => b.equals('action', '"transfer"'),
      b => b.call('handleTransfer'))
  .if(b => b.equals('action', '"mint"'),
      b => b.call('handleMint'))
  .if(b => b.equals('action', '"burn"'),
      b => b.call('handleBurn'))
  .fail('Unknown action');
```

#### Functions

```javascript
// Define reusable functions
puzzle.function('validateAmount', ['amount'], 
  b => b.if(
    b => b.greaterThan('amount', 0),
    b => b.value(true),
    b => b.fail('Amount must be positive')
  )
);

// Call functions
puzzle.call('validateAmount', ['transfer_amount']);

// Inline functions for simple operations
puzzle.function('calculateFee', ['amount'],
  b => b.multiply('amount', 0.01)  // 1% fee
);
```

### Advanced Features

#### Currying

```javascript
// Create a curried puzzle
const curriedPuzzle = puzzle.curry({
  OWNER: '0x1234...',
  FEE: 1000
});

// Get curried puzzle hash
const curriedHash = curriedPuzzle.hash();
```

#### Inner Puzzles

```javascript
// Create a puzzle that wraps another puzzle
const wrapper = new PuzzleBuilder()
  .parameter('inner_puzzle')
  .parameter('inner_solution')
  .addCondition(runInnerPuzzle('inner_puzzle', 'inner_solution'))
  .addCondition(requireSignature('WRAPPER_KEY'));
```

#### Custom ChiaLisp

```javascript
// Include raw ChiaLisp when needed
puzzle.raw(`
  (defun custom-function (x y)
    (+ (* x x) (* y y))
  )
`);

// Use the custom function
puzzle.value(b => b.raw('(custom-function 3 4)'));  // Returns 25
```

### Compilation Options

```javascript
// Compile with different options
const chialisp = puzzle.toChiaLisp({
  includeComments: true,
  optimize: true
});

// Get puzzle reveal (for spending)
const reveal = puzzle.getReveal();

// Get puzzle hash (for creating coins)
const hash = puzzle.hash();

// Get tree hash (for announcements)
const treeHash = puzzle.treeHash();
```

## SolutionBuilder

The SolutionBuilder creates solutions that provide runtime values to puzzles.

### Basic Usage

```javascript
import { SolutionBuilder } from 'chia-puzzle-framework';

const solution = new SolutionBuilder()
  .addParam('action', 'transfer')
  .addParam('recipient', '0xabcd...')
  .addParam('amount', 1000)
  .build();
```

### Parameter Types

```javascript
// String parameters
solution.addParam('action', 'transfer');
solution.addParam('message', 'Hello World');

// Number parameters
solution.addParam('amount', 1000);
solution.addParam('timestamp', Date.now());

// Hex/Address parameters
solution.addParam('recipient', '0xabcd...');
solution.addParam('puzzle_hash', Buffer.from('...').toString('hex'));

// Boolean parameters
solution.addParam('is_active', true);
solution.addParam('requires_approval', false);

// Nested structures
solution.addParam('data', {
  owner: '0x1234...',
  amount: 1000,
  metadata: {
    name: 'Token',
    symbol: 'TKN'
  }
});
```

### Advanced Solutions

#### Conditional Parameters

```javascript
const solution = new SolutionBuilder();

// Add parameters conditionally
if (isTransfer) {
  solution.addParam('action', 'transfer')
          .addParam('recipient', recipientAddress);
} else {
  solution.addParam('action', 'mint')
          .addParam('amount', mintAmount);
}

const built = solution.build();
```

#### Array Parameters

```javascript
// Pass arrays as parameters
solution.addParam('recipients', [
  '0xaddr1...',
  '0xaddr2...',
  '0xaddr3...'
]);

solution.addParam('amounts', [100, 200, 300]);
```

#### Complex Solutions

```javascript
// Building solutions for complex puzzles
const complexSolution = new SolutionBuilder()
  // Action routing
  .addParam('action', 'batch_transfer')
  
  // Multiple recipients
  .addParam('recipients', recipients.map(r => r.address))
  .addParam('amounts', recipients.map(r => r.amount))
  
  // Metadata
  .addParam('nonce', Date.now())
  .addParam('memo', 'Batch payment')
  
  // Signature data
  .addParam('signature_data', {
    signer: signerAddress,
    timestamp: Date.now(),
    hash: payloadHash
  })
  
  .build();
```

### Solution Validation

```javascript
// Validate solution matches puzzle requirements
const puzzle = new PuzzleBuilder()
  .parameter('action')
  .parameter('amount')
  .parameter('recipient');

const solution = new SolutionBuilder()
  .addParam('action', 'transfer')
  .addParam('amount', 1000)
  .addParam('recipient', '0xabcd...');

// Check if solution provides all required parameters
const isValid = solution.matchesPuzzle(puzzle);
```

## Common Patterns

### Pattern 1: Multi-Action Contract

```javascript
// Puzzle with multiple actions
const multiActionPuzzle = new PuzzleBuilder()
  .constant('OWNER', ownerAddress)
  .parameter('action')
  .parameter('params')
  
  // Transfer action
  .function('transfer', ['recipient', 'amount'],
    b => b.addCondition(requireSignature('OWNER'))
          .addCondition(sendCoins('recipient', 'amount'))
  )
  
  // Mint action
  .function('mint', ['recipient', 'amount'],
    b => b.addCondition(requireSignature('OWNER'))
          .addCondition(sendCoins('recipient', 'amount'))
          .addCondition(createAnnouncement(b => b.list('Minted', 'amount')))
  )
  
  // Action dispatcher
  .if(b => b.equals('action', '"transfer"'),
      b => b.call('transfer', ['params']))
  .if(b => b.equals('action', '"mint"'),
      b => b.call('mint', ['params']))
  .fail('Unknown action');

// Solutions for different actions
const transferSolution = new SolutionBuilder()
  .addParam('action', 'transfer')
  .addParam('params', {
    recipient: '0xabcd...',
    amount: 1000
  })
  .build();

const mintSolution = new SolutionBuilder()
  .addParam('action', 'mint')
  .addParam('params', {
    recipient: '0xdefg...',
    amount: 5000
  })
  .build();
```

### Pattern 2: State Machine

```javascript
// Puzzle implementing a state machine
const stateMachine = new PuzzleBuilder()
  .constant('STATES', {
    IDLE: 0,
    ACTIVE: 1,
    PAUSED: 2,
    COMPLETE: 3
  })
  .parameter('current_state')
  .parameter('new_state')
  .parameter('operator')
  
  // State transition validation
  .function('validateTransition', ['from', 'to'],
    b => b.if(
      b => b.and(
        b => b.equals('from', 'STATES.IDLE'),
        b => b.equals('to', 'STATES.ACTIVE')
      ),
      b => b.value(true),
      b => b.if(
        b => b.and(
          b => b.equals('from', 'STATES.ACTIVE'),
          b => b.equals('to', 'STATES.PAUSED')
        ),
        b => b.value(true),
        b => b.fail('Invalid state transition')
      )
    )
  )
  
  // Main logic
  .call('validateTransition', ['current_state', 'new_state'])
  .addCondition(requireSignature('operator'))
  .addCondition(createAnnouncement(
    b => b.list('StateChange', 'current_state', 'new_state')
  ));
```

### Pattern 3: Access Control

```javascript
// Reusable access control pattern
const accessControlled = new PuzzleBuilder()
  .constant('ADMIN', adminAddress)
  .constant('OPERATORS', [op1Address, op2Address])
  .parameter('caller')
  .parameter('action')
  
  // Check if caller is admin
  .function('isAdmin', ['address'],
    b => b.equals('address', 'ADMIN')
  )
  
  // Check if caller is operator
  .function('isOperator', ['address'],
    b => b.contains('OPERATORS', 'address')
  )
  
  // Require admin
  .function('requireAdmin', ['address'],
    b => b.if(
      b => b.call('isAdmin', ['address']),
      b => b.value(true),
      b => b.fail('Not authorized: admin required')
    )
  )
  
  // Require operator or admin
  .function('requireOperator', ['address'],
    b => b.if(
      b => b.or(
        b => b.call('isAdmin', ['address']),
        b => b.call('isOperator', ['address'])
      ),
      b => b.value(true),
      b => b.fail('Not authorized: operator required')
    )
  );
```

## Best Practices

### 1. **Use Constants for Fixed Values**
```javascript
// Good
puzzle.constant('FEE', 1000);
puzzle.constant('OWNER', ownerAddress);

// Bad - hardcoding values
puzzle.addCondition(sendCoins('recipient', 1000));
```

### 2. **Validate Input Parameters**
```javascript
// Always validate parameters
puzzle.if(
  b => b.and(
    b => b.greaterThan('amount', 0),
    b => b.notEquals('recipient', '0x0')
  ),
  b => b.addCondition(sendCoins('recipient', 'amount')),
  b => b.fail('Invalid parameters')
);
```

### 3. **Use Functions for Reusable Logic**
```javascript
// Define once, use multiple times
puzzle.function('validateAndSend', ['recipient', 'amount'],
  b => b.if(
    b => b.greaterThan('amount', 0),
    b => b.addCondition(sendCoins('recipient', 'amount')),
    b => b.fail('Invalid amount')
  )
);
```

### 4. **Clear Parameter Names in Solutions**
```javascript
// Good - descriptive names
solution.addParam('transfer_recipient', address);
solution.addParam('transfer_amount', amount);

// Bad - ambiguous names
solution.addParam('addr', address);
solution.addParam('val', amount);
```

### 5. **Test with Simulator**
```javascript
import { Simulator } from 'chia-puzzle-framework/simulator';

async function test() {
  const sim = new Simulator();
  const coin = await sim.createCoin(puzzle.hash(), 1000);
  
  const result = await sim.spend(coin, puzzle, solution);
  console.assert(result.success, 'Spend should succeed');
}
```

## Integration with CoinScript

PuzzleBuilder seamlessly integrates with CoinScript:

```javascript
// Load CoinScript
const puzzle = new PuzzleBuilder();
await puzzle.load('./token.coins');

// Extend with additional logic
puzzle.function('customValidation', ['amount'],
  b => b.greaterThan('amount', 'MIN_AMOUNT')
);

// Create solution for CoinScript contract
const solution = new SolutionBuilder()
  .addParam('action', 'transfer')
  .addParam('from', senderAddress)
  .addParam('to', recipientAddress)
  .addParam('amount', 1000)
  .build();
```

## Next Steps

Now that you understand PuzzleBuilder and SolutionBuilder:

1. Explore the [AST Engine](./ast-engine.md) that powers these builders
2. Review the [CoinScript Reference](./reference.md) for language details
3. Check out [PuzzleBuilder Patterns](./builder-patterns.md) for advanced techniques

These builders provide the foundation for all smart coin development in the Chia ecosystem!