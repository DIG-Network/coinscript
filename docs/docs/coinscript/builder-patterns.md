---
sidebar_position: 7
title: PuzzleBuilder Patterns
description: Advanced patterns and techniques for using PuzzleBuilder
---

# PuzzleBuilder Patterns

This guide covers advanced patterns and techniques for using PuzzleBuilder effectively to create sophisticated Chia smart coins.

## Core Concepts

PuzzleBuilder provides a fluent JavaScript API for constructing ChiaLisp puzzles. It operates through method chaining and functional composition.

### Builder Chain

```javascript
const puzzle = new PuzzleBuilder()
  .constant('OWNER', ownerAddress)
  .parameter('action')
  .parameter('amount')
  .if(/* condition */, /* then */, /* else */)
  .compile();
```

## Common Patterns

### Pattern 1: Action Dispatcher

A fundamental pattern for creating multi-function smart coins:

```javascript
const actionDispatcher = new PuzzleBuilder()
  .constant('OWNER', ownerAddress)
  .parameter('action')
  .parameter('params')
  
  // Define actions as functions
  .function('transfer', ['to', 'amount'],
    b => b.addCondition(requireSignature('OWNER'))
          .addCondition(sendCoins('to', 'amount'))
  )
  
  .function('mint', ['to', 'amount'],
    b => b.addCondition(requireSignature('OWNER'))
          .addCondition(sendCoins('to', 'amount'))
          .addCondition(createAnnouncement(b => b.sha256('mint', 'amount')))
  )
  
  .function('burn', ['amount'],
    b => b.addCondition(requireSignature('OWNER'))
          .addCondition(createAnnouncement(b => b.sha256('burn', 'amount')))
  )
  
  // Dispatch to appropriate action
  .if(b => b.equals('action', '"transfer"'),
      b => b.apply('transfer', b => b.first('params'), b => b.rest('params')))
  .if(b => b.equals('action', '"mint"'),
      b => b.apply('mint', b => b.first('params'), b => b.rest('params')))
  .if(b => b.equals('action', '"burn"'),
      b => b.apply('burn', 'params'))
  .fail('Unknown action');
```

### Pattern 2: Access Control List (ACL)

Implement role-based access control:

```javascript
const aclPattern = new PuzzleBuilder()
  .constant('ADMIN', adminAddress)
  .constant('OPERATORS', [op1, op2, op3])
  .constant('USERS', [user1, user2])
  
  .parameter('caller')
  .parameter('action')
  
  // Role checking functions
  .function('hasRole', ['address', 'role'],
    b => b.if(
      b => b.equals('role', '"admin"'),
      b => b.equals('address', 'ADMIN'),
      b => b.if(
        b => b.equals('role', '"operator"'),
        b => b.contains('OPERATORS', 'address'),
        b => b.if(
          b => b.equals('role', '"user"'),
          b => b.contains('USERS', 'address'),
          b => b.value(false)
        )
      )
    )
  )
  
  // Require specific role
  .function('requireRole', ['address', 'role'],
    b => b.if(
      b => b.call('hasRole', ['address', 'role']),
      b => b.value(true),
      b => b.fail(b => b.concat('Unauthorized: requires ', 'role'))
    )
  )
  
  // Action with role requirement
  .if(b => b.equals('action', '"admin_action"'),
      b => b.call('requireRole', ['caller', '"admin"'])
           .addCondition(/* admin action */))
  .if(b => b.equals('action', '"operator_action"'),
      b => b.call('requireRole', ['caller', '"operator"'])
           .addCondition(/* operator action */));
```

### Pattern 3: State Machine

Implement a state machine with valid transitions:

```javascript
const stateMachine = new PuzzleBuilder()
  // State definitions
  .constant('STATES', {
    CREATED: 0,
    INITIALIZED: 1,
    ACTIVE: 2,
    PAUSED: 3,
    COMPLETED: 4,
    CANCELLED: 5
  })
  
  // Valid transitions map
  .constant('TRANSITIONS', {
    0: [1],           // CREATED -> INITIALIZED
    1: [2],           // INITIALIZED -> ACTIVE
    2: [3, 4],        // ACTIVE -> PAUSED or COMPLETED
    3: [2, 5],        // PAUSED -> ACTIVE or CANCELLED
    4: [],            // COMPLETED -> (terminal)
    5: []             // CANCELLED -> (terminal)
  })
  
  .parameter('current_state')
  .parameter('new_state')
  .parameter('operator')
  
  // Validate state transition
  .function('isValidTransition', ['from', 'to'],
    b => b.if(
      b => b.equals('from', 0),
      b => b.contains([1], 'to'),
      b => b.if(
        b => b.equals('from', 1),
        b => b.contains([2], 'to'),
        b => b.if(
          b => b.equals('from', 2),
          b => b.contains([3, 4], 'to'),
          b => b.if(
            b => b.equals('from', 3),
            b => b.contains([2, 5], 'to'),
            b => b.value(false)
          )
        )
      )
    )
  )
  
  // Execute transition
  .if(
    b => b.call('isValidTransition', ['current_state', 'new_state']),
    b => b.addCondition(requireSignature('operator'))
          .addCondition(createAnnouncement(
            b => b.sha256('StateTransition', 'current_state', 'new_state')
          )),
    b => b.fail('Invalid state transition')
  );
```

### Pattern 4: Timelock with Emergency Exit

Combine timelocks with emergency mechanisms:

```javascript
const timelockWithExit = new PuzzleBuilder()
  .constant('BENEFICIARY', beneficiaryAddress)
  .constant('EMERGENCY_KEY', emergencyAddress)
  .constant('UNLOCK_TIME', unlockTimestamp)
  
  .parameter('action')
  .parameter('withdrawer')
  
  // Normal withdrawal after timelock
  .function('normalWithdraw', [],
    b => b.if(
      b => b.greaterThanOrEqual(b => b.timestamp(), 'UNLOCK_TIME'),
      b => b.addCondition(requireSignature('BENEFICIARY'))
            .addCondition(sendCoins('BENEFICIARY', b => b.coinAmount())),
      b => b.fail('Timelock not expired')
    )
  )
  
  // Emergency withdrawal (2-of-2 multisig)
  .function('emergencyWithdraw', ['recipient'],
    b => b.addCondition(requireSignature('BENEFICIARY'))
          .addCondition(requireSignature('EMERGENCY_KEY'))
          .addCondition(sendCoins('recipient', b => b.coinAmount()))
          .addCondition(createAnnouncement('Emergency withdrawal executed'))
  )
  
  // Route actions
  .if(b => b.equals('action', '"withdraw"'),
      b => b.call('normalWithdraw'))
  .if(b => b.equals('action', '"emergency"'),
      b => b.call('emergencyWithdraw', ['withdrawer']))
  .fail('Invalid action');
```

### Pattern 5: Batch Operations

Process multiple operations in a single transaction:

```javascript
const batchProcessor = new PuzzleBuilder()
  .constant('OWNER', ownerAddress)
  .parameter('operations')  // Array of operations
  
  // Process a single operation
  .function('processOp', ['op'],
    b => b.if(
      b => b.equals(b => b.first('op'), '"transfer"'),
      b => b.addCondition(sendCoins(
        b => b.nth('op', 1),  // recipient
        b => b.nth('op', 2)   // amount
      )),
      b => b.if(
        b => b.equals(b => b.first('op'), '"announce"'),
        b => b.addCondition(createAnnouncement(b => b.nth('op', 1))),
        b => b.fail('Unknown operation')
      )
    )
  )
  
  // Process all operations recursively
  .function('processBatch', ['ops'],
    b => b.if(
      b => b.isNil('ops'),
      b => b.value(true),  // Done
      b => b.call('processOp', [b => b.first('ops')])
            .call('processBatch', [b => b.rest('ops')])
    )
  )
  
  // Require owner signature and process batch
  .addCondition(requireSignature('OWNER'))
  .call('processBatch', ['operations']);
```

### Pattern 6: Merkle Proof Verification

Verify inclusion in a Merkle tree:

```javascript
const merkleVerifier = new PuzzleBuilder()
  .constant('MERKLE_ROOT', merkleRoot)
  
  .parameter('leaf')
  .parameter('proof')  // Array of hashes
  .parameter('path')   // Array of directions (0=left, 1=right)
  
  // Compute parent hash
  .function('hashPair', ['left', 'right'],
    b => b.sha256(b => b.concat('left', 'right'))
  )
  
  // Verify proof recursively
  .function('verifyProof', ['current', 'proof', 'path'],
    b => b.if(
      b => b.isNil('proof'),
      b => b.equals('current', 'MERKLE_ROOT'),  // Reached root
      b => b.if(
        b => b.equals(b => b.first('path'), 0),
        // Current is left child
        b => b.call('verifyProof', [
          b => b.call('hashPair', ['current', b => b.first('proof')]),
          b => b.rest('proof'),
          b => b.rest('path')
        ]),
        // Current is right child
        b => b.call('verifyProof', [
          b => b.call('hashPair', [b => b.first('proof'), 'current']),
          b => b.rest('proof'),
          b => b.rest('path')
        ])
      )
    )
  )
  
  // Verify and execute if valid
  .if(
    b => b.call('verifyProof', ['leaf', 'proof', 'path']),
    b => b.addCondition(/* action if proof is valid */),
    b => b.fail('Invalid Merkle proof')
  );
```

## Advanced Techniques

### Technique 1: Dynamic Function Generation

Generate functions based on configuration:

```javascript
function createMultiSig(owners, threshold) {
  const puzzle = new PuzzleBuilder();
  
  // Add owner constants dynamically
  owners.forEach((owner, i) => {
    puzzle.constant(`OWNER_${i}`, owner);
  });
  
  // Generate signature checking function
  puzzle.function('countSignatures', [],
    b => {
      let count = b.value(0);
      
      owners.forEach((_, i) => {
        count = b.if(
          b => b.hasSignature(`OWNER_${i}`),
          b => b.add(count, 1),
          count
        );
      });
      
      return count;
    }
  );
  
  // Require threshold signatures
  puzzle.if(
    b => b.greaterThanOrEqual(b => b.call('countSignatures'), threshold),
    b => b.addCondition(/* execute action */),
    b => b.fail(`Requires ${threshold} signatures`)
  );
  
  return puzzle;
}
```

### Technique 2: Composable Modifiers

Create reusable modifier patterns:

```javascript
// Modifier factory
function createModifier(name, check) {
  return {
    name,
    apply(builder, action) {
      return builder.if(
        check,
        action,
        b => b.fail(`Modifier ${name} failed`)
      );
    }
  };
}

// Define modifiers
const onlyOwner = createModifier('onlyOwner',
  b => b.hasSignature('OWNER')
);

const notPaused = createModifier('notPaused',
  b => b.not('IS_PAUSED')
);

const validAmount = createModifier('validAmount',
  b => b.and(
    b => b.greaterThan('amount', 0),
    b => b.lessThanOrEqual('amount', 'MAX_AMOUNT')
  )
);

// Apply modifiers
function applyModifiers(builder, modifiers, action) {
  return modifiers.reduceRight(
    (acc, modifier) => modifier.apply(builder, acc),
    action
  );
}

// Use in puzzle
const puzzle = new PuzzleBuilder()
  .constant('OWNER', ownerAddress)
  .constant('IS_PAUSED', false)
  .constant('MAX_AMOUNT', 10000)
  .parameter('amount')
  
  // Action with multiple modifiers
  .if(b => b.equals('action', '"transfer"'),
      b => applyModifiers(b, [onlyOwner, notPaused, validAmount],
        b => b.addCondition(sendCoins('recipient', 'amount'))
      )
  );
```

### Technique 3: Lazy Evaluation

Defer computation until needed:

```javascript
const lazyEvaluation = new PuzzleBuilder()
  .parameter('compute_expensive')
  .parameter('simple_check')
  
  // Expensive computation function
  .function('expensiveComputation', [],
    b => b.sha256(
      b => b.sha256(
        b => b.sha256(/* complex nested computation */)
      )
    )
  )
  
  // Only compute if necessary
  .if(
    b => b.and(
      'simple_check',  // Check simple condition first
      'compute_expensive'  // Only then check if we need computation
    ),
    b => b.if(
      b => b.equals(
        b => b.call('expensiveComputation'),
        'EXPECTED_RESULT'
      ),
      b => b.addCondition(/* success */),
      b => b.fail('Computation mismatch')
    ),
    b => b.addCondition(/* skip expensive computation */)
  );
```

### Technique 4: Error Context

Provide detailed error information:

```javascript
const errorContext = new PuzzleBuilder()
  .parameter('operation')
  .parameter('params')
  
  // Error wrapper function
  .function('withContext', ['op', 'context'],
    b => b.if(
      'op',  // If operation succeeds
      b => b.value(true),
      b => b.fail(
        b => b.concat(
          'Error in ',
          'context',
          ': ',
          b => b.toString('params')
        )
      )
    )
  )
  
  // Use error context
  .call('withContext', [
    b => b.greaterThan('amount', 0),
    '"amount validation"'
  ])
  .call('withContext', [
    b => b.hasSignature('signer'),
    '"signature verification"'
  ]);
```

## Performance Optimization

### Optimization 1: Constant Folding

Pre-compute constant expressions:

```javascript
// Before optimization
const unoptimized = new PuzzleBuilder()
  .constant('BASE_FEE', 100)
  .constant('MULTIPLIER', 3)
  .parameter('amount')
  .if(
    b => b.greaterThan('amount', b => b.multiply('BASE_FEE', 'MULTIPLIER')),
    /* ... */
  );

// After optimization
const FEE_THRESHOLD = 100 * 3;  // Pre-computed
const optimized = new PuzzleBuilder()
  .constant('FEE_THRESHOLD', FEE_THRESHOLD)
  .parameter('amount')
  .if(
    b => b.greaterThan('amount', 'FEE_THRESHOLD'),
    /* ... */
  );
```

### Optimization 2: Short-Circuit Evaluation

Order conditions by likelihood and cost:

```javascript
const shortCircuit = new PuzzleBuilder()
  .parameter('amount')
  .parameter('complex_data')
  
  // Check cheap conditions first
  .if(
    b => b.and(
      b => b.greaterThan('amount', 0),  // Cheap check first
      b => b.lessThan('amount', 1000000),  // Then bounds check
      b => b.verifyComplexCondition('complex_data')  // Expensive last
    ),
    b => b.addCondition(/* success */),
    b => b.fail('Invalid conditions')
  );
```

### Optimization 3: Reuse Computations

Store and reuse computed values:

```javascript
const reuseComputations = new PuzzleBuilder()
  .parameter('data')
  
  // Compute once, use multiple times
  .let('data_hash', b => b.sha256('data'))
  .let('double_hash', b => b.sha256('data_hash'))
  
  .if(b => b.equals('data_hash', 'EXPECTED_HASH'),
      b => b.addCondition(createAnnouncement('data_hash')))
  .if(b => b.equals('double_hash', 'EXPECTED_DOUBLE'),
      b => b.addCondition(createAnnouncement('double_hash')));
```

## Testing Patterns

### Pattern 1: Test Harness

Create a test-friendly puzzle structure:

```javascript
function createTestable(production = true) {
  const puzzle = new PuzzleBuilder();
  
  if (!production) {
    // Add test-only bypass
    puzzle.constant('TEST_KEY', testKey)
          .if(b => b.hasSignature('TEST_KEY'),
              b => b.addCondition(/* bypass for testing */));
  }
  
  // Normal puzzle logic
  puzzle.constant('OWNER', ownerAddress)
        .parameter('action')
        /* ... rest of puzzle ... */;
  
  return puzzle;
}
```

### Pattern 2: Assertion Helpers

Build assertion utilities:

```javascript
const assertions = new PuzzleBuilder()
  // Define assertion helpers
  .function('assertEqual', ['actual', 'expected', 'message'],
    b => b.if(
      b => b.equals('actual', 'expected'),
      b => b.value(true),
      b => b.fail(b => b.concat('Assertion failed: ', 'message'))
    )
  )
  
  .function('assertGreaterThan', ['actual', 'expected', 'message'],
    b => b.if(
      b => b.greaterThan('actual', 'expected'),
      b => b.value(true),
      b => b.fail(b => b.concat('Assertion failed: ', 'message'))
    )
  )
  
  // Use in tests
  .call('assertEqual', ['result', 'EXPECTED', '"Result mismatch"'])
  .call('assertGreaterThan', ['balance', 0, '"Balance check"']);
```

## Integration Patterns

### Pattern 1: Oracle Integration

Integrate with external data sources:

```javascript
const oracleIntegration = new PuzzleBuilder()
  .constant('ORACLE_PUBKEY', oraclePublicKey)
  .parameter('price_data')
  .parameter('oracle_signature')
  .parameter('timestamp')
  
  // Verify oracle signature
  .function('verifyOracle', ['data', 'signature'],
    b => b.verifySignature('ORACLE_PUBKEY', 'data', 'signature')
  )
  
  // Check data freshness
  .function('isFresh', ['timestamp'],
    b => b.lessThan(
      b => b.subtract(b => b.currentTime(), 'timestamp'),
      300  // 5 minutes
    )
  )
  
  // Use verified price
  .if(
    b => b.and(
      b => b.call('verifyOracle', ['price_data', 'oracle_signature']),
      b => b.call('isFresh', ['timestamp'])
    ),
    b => b.addCondition(/* use price_data */),
    b => b.fail('Invalid or stale oracle data')
  );
```

### Pattern 2: Cross-Puzzle Communication

Coordinate between multiple puzzles:

```javascript
const coordinator = new PuzzleBuilder()
  .constant('PUZZLE_A_HASH', puzzleAHash)
  .constant('PUZZLE_B_HASH', puzzleBHash)
  .parameter('action')
  .parameter('announcement_data')
  
  // Create coordinated announcements
  .function('coordinate', ['target', 'data'],
    b => b.addCondition(createAnnouncement(
      b => b.sha256('target', 'data')
    ))
    .addCondition(assertAnnouncement(
      b => b.sha256('target', 'data', 'ACK')
    ))
  )
  
  // Coordinate with Puzzle A
  .if(b => b.equals('action', '"sync_a"'),
      b => b.call('coordinate', ['PUZZLE_A_HASH', 'announcement_data']))
  
  // Coordinate with Puzzle B
  .if(b => b.equals('action', '"sync_b"'),
      b => b.call('coordinate', ['PUZZLE_B_HASH', 'announcement_data']));
```

## Summary

PuzzleBuilder patterns enable:

1. **Modular Design** - Reusable components and functions
2. **Complex Logic** - State machines, access control, batch operations
3. **Performance** - Optimization techniques for efficient execution
4. **Testing** - Patterns for testable smart coins
5. **Integration** - Patterns for external data and cross-puzzle communication

By mastering these patterns, you can create sophisticated, efficient, and maintainable Chia smart coins using the PuzzleBuilder API.