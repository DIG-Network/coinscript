---
sidebar_position: 8
title: State Management
description: Complete guide to managing mutable state in CoinScript using the slot-machine pattern
---

# State Management in CoinScript

CoinScript provides powerful state management capabilities that allow smart coins to maintain mutable state across spends while keeping that state hidden until the coin is spent.

## Overview

Unlike traditional smart contracts where state is stored on-chain, Chia's UTXO model requires a different approach:

- **Immutable Storage**: Variables declared with `storage` are curried into the puzzle and cannot change
- **Mutable State**: Variables declared in `state {}` blocks can be modified between spends
- **Hidden State**: State is passed as part of the solution, not visible until the coin is spent
- **State Persistence**: The coin recreates itself with updated state after each spend

## Basic State Management

### Declaring State

Use the `state {}` block to declare mutable state variables:

```coinscript
coin StatefulCounter {
  storage address owner = 0x1234...;
  
  state {
    uint256 counter;
    address lastUpdater;
    bool isActive;
  }
}
```

### Accessing State

State can only be accessed in actions marked with the `@stateful` decorator:

```coinscript
@stateful
action increment() {
  state.counter += 1;
  state.lastUpdater = msg.sender;
}

@stateful
action getCounter() view returns (uint256) {
  return state.counter;
}

// This will fail - state access without @stateful
action invalidAccess() {
  return state.counter; // Compilation error!
}
```

### State Persistence

State is automatically persisted between spends. The framework handles:
- Serializing state into the solution
- Validating state integrity
- Creating a new coin with the same puzzle hash
- Passing updated state to the new coin

## Advanced State Structures

### Mappings

Store key-value pairs:

```coinscript
state {
  mapping(address => uint256) balances;
  mapping(address => mapping(address => uint256)) allowances;
  mapping(uint256 => address) tokenOwners;
}

@stateful
action transfer(address to, uint256 amount) {
  require(state.balances[msg.sender] >= amount, "Insufficient balance");
  
  state.balances[msg.sender] -= amount;
  state.balances[to] += amount;
}
```

### Arrays

Dynamic arrays for lists:

```coinscript
state {
  address[] validators;
  uint256[] stakes;
  string[] names;
}

@stateful
action addValidator(address validator, uint256 stake, string name) {
  state.validators.push(validator);
  state.stakes.push(stake);
  state.names.push(name);
}

@stateful
action removeValidator(uint256 index) {
  require(index < state.validators.length, "Invalid index");
  
  // Remove by swapping with last element
  uint256 lastIndex = state.validators.length - 1;
  state.validators[index] = state.validators[lastIndex];
  state.stakes[index] = state.stakes[lastIndex];
  state.names[index] = state.names[lastIndex];
  
  // Remove last element
  state.validators.pop();
  state.stakes.pop();
  state.names.pop();
}
```

### Structs

Define complex data structures:

```coinscript
state {
  struct User {
    address addr;
    uint256 balance;
    uint256 nonce;
    bool active;
  }
  
  struct Game {
    uint256 id;
    address player1;
    address player2;
    uint256 stake;
    uint8 status; // 0=pending, 1=active, 2=complete
  }
  
  User admin;
  mapping(address => User) users;
  Game[] activeGames;
}

@stateful
action createUser(address userAddr) {
  state.users[userAddr] = User({
    addr: userAddr,
    balance: 0,
    nonce: 0,
    active: true
  });
}

@stateful
action createGame(address opponent, uint256 stake) {
  state.activeGames.push(Game({
    id: state.activeGames.length,
    player1: msg.sender,
    player2: opponent,
    stake: stake,
    status: 0
  }));
}
```

## State Validation

### Integrity Checks

Validate state hasn't been tampered with:

```coinscript
coin ValidatedState {
  storage bytes32 stateRoot = 0xABCD...;
  
  state {
    uint256 nonce;
    uint256 value;
    bytes32 merkleRoot;
  }
  
  @stateful
  action updateValue(uint256 newValue, bytes32 proof) {
    // Validate state integrity
    bytes32 expectedRoot = sha256(concat(
      bytes32(state.nonce),
      bytes32(state.value),
      state.merkleRoot
    ));
    require(expectedRoot == stateRoot, "Invalid state");
    
    // Update state
    state.value = newValue;
    state.nonce += 1;
    state.merkleRoot = sha256(concat(state.merkleRoot, proof));
  }
}
```

### Access Control with State

Combine state with access control:

```coinscript
coin AccessControlled {
  storage address admin = 0x1234...;
  
  state {
    mapping(address => bool) operators;
    bool paused;
  }
  
  modifier onlyAdmin() {
    require(msg.sender == admin, "Not admin");
    _;
  }
  
  modifier onlyOperator() {
    require(state.operators[msg.sender] || msg.sender == admin, "Not operator");
    _;
  }
  
  modifier whenNotPaused() {
    require(!state.paused, "Contract paused");
    _;
  }
  
  @stateful
  action addOperator(address operator) onlyAdmin {
    state.operators[operator] = true;
  }
  
  @stateful
  action pause() onlyAdmin {
    state.paused = true;
  }
  
  @stateful
  action doOperation() onlyOperator whenNotPaused {
    // Operation logic
  }
}
```

## State Machine Pattern

Implement complex state machines:

```coinscript
coin StateMachine {
  storage address owner = 0x1234...;
  
  // State constants
  const uint8 STATE_IDLE = 0;
  const uint8 STATE_ACTIVE = 1;
  const uint8 STATE_PROCESSING = 2;
  const uint8 STATE_COMPLETE = 3;
  const uint8 STATE_ERROR = 4;
  
  state {
    uint8 currentState;
    uint256 processedItems;
    uint256 totalItems;
    bytes32 lastError;
    uint256 stateChangedAt;
  }
  
  modifier inState(uint8 requiredState) {
    require(state.currentState == requiredState, "Invalid state");
    _;
  }
  
  modifier canTransition(uint8 fromState, uint8 toState) {
    require(state.currentState == fromState, "Invalid current state");
    require(isValidTransition(fromState, toState), "Invalid transition");
    _;
  }
  
  function isValidTransition(uint8 from, uint8 to) pure returns (bool) {
    if (from == STATE_IDLE && to == STATE_ACTIVE) return true;
    if (from == STATE_ACTIVE && to == STATE_PROCESSING) return true;
    if (from == STATE_PROCESSING && (to == STATE_COMPLETE || to == STATE_ERROR)) return true;
    if (from == STATE_ERROR && to == STATE_IDLE) return true;
    return false;
  }
  
  @stateful
  action activate(uint256 itemCount) inState(STATE_IDLE) {
    state.currentState = STATE_ACTIVE;
    state.totalItems = itemCount;
    state.processedItems = 0;
    state.stateChangedAt = currentTime();
  }
  
  @stateful
  action startProcessing() canTransition(STATE_ACTIVE, STATE_PROCESSING) {
    state.currentState = STATE_PROCESSING;
    state.stateChangedAt = currentTime();
  }
  
  @stateful
  action processItem() inState(STATE_PROCESSING) {
    state.processedItems += 1;
    
    if (state.processedItems >= state.totalItems) {
      state.currentState = STATE_COMPLETE;
      state.stateChangedAt = currentTime();
    }
  }
  
  @stateful
  action handleError(bytes32 errorCode) {
    require(state.currentState != STATE_IDLE && state.currentState != STATE_COMPLETE, "Cannot error in this state");
    
    state.currentState = STATE_ERROR;
    state.lastError = errorCode;
    state.stateChangedAt = currentTime();
  }
  
  @stateful
  action reset() inState(STATE_ERROR) {
    require(msg.sender == owner, "Only owner can reset");
    
    state.currentState = STATE_IDLE;
    state.processedItems = 0;
    state.totalItems = 0;
    state.lastError = 0x0;
    state.stateChangedAt = currentTime();
  }
}
```

## Events with State Changes

Emit events when state changes:

```coinscript
coin EventfulState {
  event StateChanged(string field, bytes32 oldValue, bytes32 newValue);
  event UserAdded(address user, uint256 balance);
  event BalanceUpdated(address user, uint256 oldBalance, uint256 newBalance);
  
  state {
    mapping(address => uint256) balances;
    uint256 totalSupply;
  }
  
  @stateful
  action addUser(address user, uint256 initialBalance) {
    require(state.balances[user] == 0, "User already exists");
    
    state.balances[user] = initialBalance;
    state.totalSupply += initialBalance;
    
    emit UserAdded(user, initialBalance);
    emit StateChanged("totalSupply", bytes32(state.totalSupply - initialBalance), bytes32(state.totalSupply));
  }
  
  @stateful
  action updateBalance(address user, uint256 newBalance) {
    uint256 oldBalance = state.balances[user];
    require(oldBalance != newBalance, "Balance unchanged");
    
    state.balances[user] = newBalance;
    state.totalSupply = state.totalSupply - oldBalance + newBalance;
    
    emit BalanceUpdated(user, oldBalance, newBalance);
  }
}
```

## Best Practices

### 1. Minimize State Size

State is passed in every solution, so keep it minimal:

```coinscript
// Good - compact state
state {
  uint256 packed; // Pack multiple values
  bytes32 merkleRoot; // Store root of larger data
}

// Bad - large state
state {
  address[1000] users; // Too large!
  mapping(address => string) names; // Strings can be large
}
```

### 2. Use State Versioning

Plan for upgrades:

```coinscript
state {
  uint16 version;
  // v1 fields
  uint256 value;
  // v2 fields (added later)
  address owner;
  uint256 timestamp;
}

@stateful
action migrate() {
  require(state.version == 1, "Already migrated");
  state.version = 2;
  state.owner = msg.sender;
  state.timestamp = currentTime();
}
```

### 3. Validate State Transitions

Always validate state changes:

```coinscript
@stateful
action updateValue(uint256 newValue) {
  uint256 oldValue = state.value;
  
  // Validate transition
  require(newValue > oldValue, "Value must increase");
  require(newValue <= oldValue * 2, "Value can at most double");
  
  state.value = newValue;
}
```

### 4. Handle Concurrent Spends

Consider race conditions:

```coinscript
state {
  uint256 nonce;
  uint256 value;
}

@stateful
action update(uint256 newValue, uint256 expectedNonce) {
  require(state.nonce == expectedNonce, "State has changed");
  
  state.value = newValue;
  state.nonce += 1;
}
```

## Technical Details

### How It Works

1. **Compilation**: Actions marked `@stateful` are compiled as separate puzzles
2. **Merkle Tree**: All action puzzles are arranged in a merkle tree
3. **State Passing**: Current state is passed in the solution
4. **Action Execution**: The specific action puzzle validates and updates state
5. **Recreation**: A new coin is created with the same puzzle hash
6. **State Persistence**: Updated state is passed to the new coin's solution

### Solution Structure

For a stateful coin, solutions include:
- Action name
- Action parameters
- Current state
- Merkle proof for the action

```javascript
// Creating a solution for a stateful action
const solution = createSolution()
  .addAction('transfer', ['0xrecipient', 1000])
  .addState({
    balances: { '0xsender': 5000, '0xrecipient': 0 },
    totalSupply: 5000
  })
  .addMerkleProof(['0xhash1', '0xhash2'])
  .build();
```

## Summary

State management in CoinScript provides:

1. **True Mutability** - State that persists across spends
2. **Privacy** - State hidden until spend time
3. **Flexibility** - Complex data structures supported
4. **Security** - Built-in validation and access control
5. **Efficiency** - Only needed actions are loaded

By leveraging the slot-machine pattern, CoinScript brings familiar state management patterns to Chia's UTXO model while maintaining the security and privacy benefits of the blockchain! 