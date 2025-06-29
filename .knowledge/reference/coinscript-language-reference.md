# CoinScript Language Reference

## Overview
CoinScript is a high-level domain-specific language for writing Chia smart coins. It compiles to ChiaLisp and provides familiar smart contract patterns with built-in safety and composability features.

## Basic Syntax

### Coin Declaration
```typescript
coin MyCoin {
  // Coin contents
}
```

### Decorators
Apply decorators to add functionality:
```typescript
@singleton
coin MySingleton {
  // Singleton coin logic
}

@owned
coin MyOwnedCoin {
  // NFT-like ownership
}
```

## Includes

Import library functions:
```typescript
include "condition_codes.clib"
include "curry-and-treehash.clinc" 

coin MyCoin {
  // Can now use imported functions
}
```

## Layers

### Built-in Layers
```typescript
coin LayeredCoin {
  // Singleton layer with launcher ID
  layer singleton(launcher_id: "0x1234...")
  
  // State management layer
  layer state
  
  // Ownership layer for NFT-like behavior
  layer ownership(owner_pubkey: "0xabcd...")
  
  // Royalty payments
  layer royalty(recipient: "0xdead...", percentage: 5)
  
  // Metadata storage
  layer metadata(uri: "https://...")
  
  // Cross-puzzle messaging
  layer notification
  
  // Transfer program support
  layer transfer
  
  // Action-based state machine
  layer action
}
```

## State Management

### State Block
Define state variables in a block:
```typescript
coin StatefulCoin {
  state {
    uint256 balance = 0
    address owner = 0xabcd...
    bool is_active = true
    string name = "Token"
    bytes32 merkle_root
  }
}
```

### Single State Variables
```typescript
coin SimpleCoin {
  state uint256 counter = 0
  state address admin
}
```

### Accessing State
Only `@stateful` or `view` actions can access state:
```typescript
@stateful
action increment() {
  state.counter += 1
}

action getCounter() view returns (uint256) {
  return state.counter
}
```

## Storage Variables

Immutable storage set at deployment:
```typescript
coin TokenContract {
  storage {
    string name = "MyToken"
    string symbol = "MTK"
    uint8 decimals = 18
    uint256 total_supply = 1000000
  }
}
```

## Constants

Compile-time constants:
```typescript
coin MyCoin {
  const uint256 MAX_SUPPLY = 1000000
  const address TREASURY = 0x1234...
  const uint8 FEE_PERCENTAGE = 3
}
```

## Constructor

Initialize curried parameters:
```typescript
coin MyCoin {
  constructor(address owner, uint256 initial_balance) {
    // Parameters are curried into the puzzle
  }
}
```

## Actions (Spend Functions)

### Basic Actions
```typescript
coin PaymentCoin {
  action pay(address recipient, uint256 amount) {
    send(recipient, amount)
  }
  
  action default() {
    // Default action when no action specified
    return conditions
  }
}
```

### Decorated Actions
```typescript
@stateful
action updateBalance(uint256 new_balance) {
  state.balance = new_balance
}

@onlyAddress(0x1234..., 0x5678...)
action adminFunction() {
  // Only specified addresses can call
}

@inner_puzzle
action delegated_spend(conditions: list) {
  // Validates delegated conditions
  return conditions
}
```

### View Functions
Read-only functions that don't modify state:
```typescript
action getBalance() view returns (uint256) {
  return state.balance
}

action calculateFee(uint256 amount) pure returns (uint256) {
  return amount * FEE_PERCENTAGE / 100
}
```

## Control Flow

### If Statements
```typescript
action transfer(address to, uint256 amount) {
  if (amount > state.balance) {
    fail("Insufficient balance")
  }
  
  if (to == address(0)) {
    fail("Invalid recipient")
  } else if (to == state.owner) {
    // Self-transfer logic
  } else {
    // Normal transfer
  }
}
```

### Require Statements
```typescript
action withdraw(uint256 amount) {
  require(amount > 0, "Amount must be positive")
  require(state.balance >= amount, "Insufficient funds")
  require(msg.sender == state.owner, "Only owner")
  
  // Withdraw logic
}
```

### Loops
CoinScript unrolls loops at compile time:
```typescript
action batchTransfer(address[3] recipients, uint256[3] amounts) {
  for (uint8 i = 0; i < 3; i++) {
    send(recipients[i], amounts[i])
  }
}
```

## Built-in Functions

### Coin Operations
```typescript
// Create a new coin
send(address recipient, uint256 amount)
send(address recipient, uint256 amount, bytes memo)

// Require signatures
requireSignature(bytes32 pubkey)
requireSignature(bytes32 pubkey, bytes message)

// Time locks
requireAfterHeight(uint256 height)
requireAfterSeconds(uint256 seconds)
requireBeforeHeight(uint256 height)
requireBeforeSeconds(uint256 seconds)

// Announcements
createAnnouncement(bytes message)
assertAnnouncement(bytes32 announcement_id)

// Assertions
assertMyCoinId(bytes32 coin_id)
assertMyPuzzleHash(bytes32 puzzle_hash)
assertMyAmount(uint256 amount)
```

### Cryptographic Functions
```typescript
// Hashing
bytes32 hash = sha256(data)
bytes32 tree_hash = sha256tree(tree_data)

// Address conversion
bytes32 puzzle_hash = addressToPuzzleHash(address)
```

### Math Operations
```typescript
uint256 sum = a + b
uint256 diff = a - b
uint256 product = a * b
uint256 quotient = a / b
uint256 remainder = a % b

// Comparisons
bool greater = a > b
bool less = a < b
bool equal = a == b
bool not_equal = a != b
bool gte = a >= b
bool lte = a <= b
```

## Events

Emit events for external monitoring:
```typescript
coin EventCoin {
  event Transfer(address from, address to, uint256 amount)
  event Approval(address owner, address spender, uint256 amount)
  
  action transfer(address to, uint256 amount) {
    emit Transfer(msg.sender, to, amount)
    send(to, amount)
  }
}
```

## Modifiers

Reusable access control:
```typescript
coin SecureCoin {
  modifier onlyOwner() {
    require(msg.sender == state.owner, "Not owner")
    _
  }
  
  modifier whenNotPaused() {
    require(!state.paused, "Contract paused")
    _
  }
  
  action withdraw(uint256 amount) onlyOwner whenNotPaused {
    send(state.owner, amount)
  }
}
```

## Data Types

### Basic Types
- `uint8`, `uint16`, `uint32`, `uint64`, `uint256` - Unsigned integers
- `int8`, `int16`, `int32`, `int64`, `int256` - Signed integers
- `bool` - Boolean (true/false)
- `bytes`, `bytes32` - Fixed and dynamic byte arrays
- `address` - Chia address (puzzle hash)
- `string` - UTF-8 string

### Arrays
```typescript
uint256[5] fixed_array
address[] dynamic_array
bytes32[][] nested_array
```

### Mappings
```typescript
mapping(address => uint256) balances
mapping(address => mapping(address => uint256)) allowances
```

### Structs
```typescript
struct Token {
  string name
  uint256 supply
  address owner
}

state Token my_token
```

## Special Variables

### Message Context
- `msg.sender` - Address of the coin being spent
- `msg.amount` - Amount of the coin
- `msg.parent_id` - Parent coin ID
- `msg.puzzle_hash` - Current puzzle hash

### Block Context
- `block.height` - Current block height
- `block.timestamp` - Current block timestamp

## Compilation Output

CoinScript generates multiple outputs:

### Main Puzzle
The primary puzzle with all layers applied

### Launcher Puzzle
For singleton coins, creates the launcher

### Action Puzzles
For `@stateful` actions in state management layer

### Inner Puzzles
For `@inner_puzzle` decorated actions

## Complete Examples

### Simple Payment
```typescript
coin SimplePayment {
  constructor(address owner) {}
  
  action pay(address recipient, uint256 amount) {
    requireSignature(owner)
    send(recipient, amount)
  }
}
```

### Stateful Counter
```typescript
@singleton
coin Counter {
  state {
    uint256 count = 0
    address owner
  }
  
  constructor(address _owner) {
    state.owner = _owner
  }
  
  @stateful
  action increment() {
    require(msg.sender == state.owner)
    state.count += 1
  }
  
  action getCount() view returns (uint256) {
    return state.count
  }
}
```

### Multi-Signature Wallet
```typescript
coin MultiSig {
  storage {
    address[3] signers
    uint8 threshold = 2
  }
  
  action execute(
    address recipient, 
    uint256 amount,
    bytes32[2] signatures
  ) {
    uint8 valid_sigs = 0
    
    for (uint8 i = 0; i < 3; i++) {
      if (verifySignature(signers[i], signatures[i])) {
        valid_sigs += 1
      }
    }
    
    require(valid_sigs >= threshold, "Not enough signatures")
    send(recipient, amount)
  }
}
```

### NFT with Royalties
```typescript
@owned
@singleton
coin NFT {
  layer royalty(recipient: artist_address, percentage: 10)
  layer metadata(uri: "ipfs://...")
  
  state {
    address owner
    bool for_sale
    uint256 price
  }
  
  action transfer(address new_owner) {
    require(msg.sender == state.owner)
    state.owner = new_owner
    state.for_sale = false
  }
  
  action list_for_sale(uint256 _price) {
    require(msg.sender == state.owner)
    state.for_sale = true
    state.price = _price
  }
  
  action buy() {
    require(state.for_sale, "Not for sale")
    require(msg.amount >= state.price, "Insufficient payment")
    
    // Royalty handled by layer
    state.owner = msg.sender
    state.for_sale = false
  }
}
```

## Best Practices

1. **State Access**: Only use `@stateful` for actions that modify state
2. **Access Control**: Use modifiers for reusable security checks
3. **Gas Efficiency**: Minimize state updates and complex computations
4. **Error Messages**: Provide clear failure reasons in require/fail
5. **Type Safety**: Explicitly declare all variable types
6. **Initialization**: Set default values for state variables
7. **Events**: Emit events for important state changes

## Compilation Flags

```bash
# Compile to ChiaLisp
coinscript compile MyContract.coin

# Generate all puzzles (main, launcher, actions)
coinscript compile --all-puzzles MyContract.coin

# Output hex format
coinscript compile --format hex MyContract.coin

# Include debug information
coinscript compile --debug MyContract.coin
```