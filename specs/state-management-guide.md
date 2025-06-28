# Complete State Management in CoinScript

This document describes the complete implementation of state management in CoinScript using the slot-machine pattern.

## Overview

CoinScript now supports true state management through the slot-machine pattern, allowing smart coins to maintain mutable state across spends while keeping that state hidden until the coin is spent.

## Key Components

### 1. State Declaration

```coinscript
coin StatefulToken {
    // Immutable storage (curried into puzzle)
    storage uint256 maxSupply = 1000000;
    
    // Mutable state (stored in action layer)
    state {
        uint256 totalSupply;
        mapping(address => uint256) balances;
        bool paused;
    }
}
```

### 2. State Access in Actions

```coinscript
@stateful
action transfer(address to, uint256 amount) {
    // Direct state member access
    require(state.balances[msg.sender] >= amount, "Insufficient");
    
    // State updates
    state.balances[msg.sender] -= amount;
    state.balances[to] += amount;
}
```

### 3. Solution Builder

The framework includes a `SolutionBuilder` for constructing puzzle solutions:

```javascript
const { createSolution } = require('chia-puzzle-framework');

// Build a solution with state
const solution = createSolution()
  .addAction('transfer', ['0xrecipient', 1000])
  .addState({
    totalSupply: 100000,
    balances: new Map([['0xsender', 5000]]),
    paused: false,
    owner: '0xowner'
  })
  .addMerkleProof(['0xhash1', '0xhash2']);
```

## Runtime Support

The framework provides runtime utilities for managing stateful coins:

```javascript
const { StatefulCoinManager, StateHelpers } = require('chia-puzzle-framework');

// Create a coin manager
const manager = new StatefulCoinManager(
  stateStructure,
  actionDefinitions
);

// Prepare a solution
const solution = manager.prepareSolution(
  'transfer',
  currentState,
  [recipientAddress, amount]
);
```

## How State is Represented in ChiaLisp

State is curried into the action layer puzzle:

```lisp
(mod (action_spends finalizer_solution)
  (defun-inline STATE () 
    ; State as ChiaLisp list
    (1000000  ; totalSupply
     ((0x02 . 500000) (0x03 . 500000))  ; balances
     ()  ; paused = false
     0x01))  ; owner
  
  ; Process actions and recreate coin
  (a FINALIZER (c new_state finalizer_solution))
)
```

## Complete Example

See `examples/16-complete-stateful-token.coins` for a full implementation of a stateful ERC20-like token using the slot-machine pattern.

## Benefits

1. **Privacy**: State hidden until spend
2. **Upgradeable**: Change actions via merkle root
3. **Efficient**: Pay only for state changes
4. **Atomic**: All-or-nothing state transitions
5. **Composable**: Works with CATs, offers, etc.

## Next Steps

- Build your own stateful coins using the `state { }` block
- Use `@stateful` decorator for actions that modify state
- Leverage `SolutionBuilder` for creating complex solutions
- Explore the runtime utilities for state management