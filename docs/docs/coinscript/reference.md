---
sidebar_position: 6
title: CoinScript Reference
description: Complete reference guide for the CoinScript language
---

# CoinScript Language Reference

This is the complete reference guide for CoinScript, covering all language features, syntax, and patterns.

## Language Overview

CoinScript is a high-level language for writing Chia smart coins. It compiles to ChiaLisp and provides:

- **Familiar syntax** similar to Solidity and JavaScript
- **Type safety** with compile-time type checking
- **High-level abstractions** for common blockchain patterns
- **Seamless integration** with the Chia ecosystem

## Basic Structure

### Coin Definition

Every CoinScript file defines a coin contract:

```coinscript
coin MyContract {
  // Storage variables
  // Constants
  // Functions
  // Actions
  // Modifiers
  // Events
}
```

### File Extension

CoinScript files use the `.coins` extension:
- `payment.coins`
- `token.coins`
- `multisig.coins`

## Data Types

### Primitive Types

| Type | Description | Example |
|------|-------------|---------|
| `uint256` | Unsigned 256-bit integer | `1000`, `0xFF` |
| `int256` | Signed 256-bit integer | `-100`, `42` |
| `bytes32` | 32-byte value | `0xabc...` |
| `address` | Chia address (32 bytes) | `0x123...` |
| `bool` | Boolean value | `true`, `false` |
| `string` | UTF-8 string | `"Hello"` |
| `bytes` | Variable-length bytes | `0xdeadbeef` |

### Type Aliases

```coinscript
type PuzzleHash = bytes32;
type CoinID = bytes32;
type Amount = uint256;
```

## Variables and Constants

### Storage Variables

Storage variables persist across coin spends and become constants in the compiled puzzle:

```coinscript
storage address owner = 0x1234...;
storage uint256 minAmount = 1000;
storage string tokenName = "MyToken";
```

### State Variables

State variables are updated between spends (requires singleton pattern):

```coinscript
state uint256 balance = 0;
state mapping(address => uint256) balances;
state address[] authorized;
```

### Constants

Constants are compile-time values that cannot be changed:

```coinscript
const uint256 MAX_SUPPLY = 1000000;
const address TREASURY = 0xabc...;
const uint256 FEE_PERCENTAGE = 3; // 3%
```

### Local Variables

Declared within functions or actions:

```coinscript
action transfer(address to, uint256 amount) {
  uint256 fee = amount * FEE_PERCENTAGE / 100;
  uint256 netAmount = amount - fee;
  // ...
}
```

## Actions

Actions are entry points for spending coins. They define the parameters needed from the solution:

```coinscript
action transfer(address recipient, uint256 amount) {
  // Action logic
}

action mintTokens(address to, uint256 quantity) {
  // Minting logic  
}

action burn(uint256 amount) {
  // Burning logic
}
```

### Action Dispatch

CoinScript automatically generates an action dispatcher that routes to the correct action based on the solution:

```javascript
// Solution specifies which action to execute
solution.addParam('action', 'transfer');
solution.addParam('recipient', '0xabc...');
solution.addParam('amount', 1000);
```

## Functions

Functions provide reusable logic within the contract:

```coinscript
function calculateFee(uint256 amount) returns uint256 {
  return amount * FEE_PERCENTAGE / 100;
}

function validateAmount(uint256 amount) {
  require(amount > 0, "Amount must be positive");
  require(amount <= MAX_AMOUNT, "Amount too large");
}

// Pure functions don't read contract state
function add(uint256 a, uint256 b) pure returns uint256 {
  return a + b;
}

// View functions read but don't modify state
function getBalance(address account) view returns uint256 {
  return balances[account];
}
```

## Modifiers

Modifiers wrap actions with additional checks or logic:

```coinscript
modifier onlyOwner() {
  requireSignature(owner);
  _;  // Action body executes here
}

modifier validAmount(uint256 amount) {
  require(amount > 0, "Invalid amount");
  require(amount <= MAX_AMOUNT, "Exceeds maximum");
  _;
}

action withdraw(uint256 amount) onlyOwner validAmount(amount) {
  sendCoins(owner, amount);
}
```

## Control Flow

### If Statements

```coinscript
if (amount > threshold) {
  sendCoins(recipient, amount);
} else if (amount > minAmount) {
  sendCoins(recipient, amount - fee);
} else {
  fail("Amount too small");
}
```

### Ternary Operator

```coinscript
uint256 finalAmount = includesFee ? amount + fee : amount;
```

### Loops

**Note:** Loops should be used carefully due to computational cost.

```coinscript
// For loop
for (uint256 i = 0; i < recipients.length; i++) {
  sendCoins(recipients[i], amounts[i]);
}

// While loop  
while (remainingAmount > 0) {
  uint256 payment = min(remainingAmount, maxPayment);
  sendCoins(nextRecipient(), payment);
  remainingAmount -= payment;
}
```

## Operators

### Arithmetic Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `+` | Addition | `a + b` |
| `-` | Subtraction | `a - b` |
| `*` | Multiplication | `a * b` |
| `/` | Division | `a / b` |
| `%` | Modulo | `a % b` |
| `**` | Exponentiation | `a ** b` |

### Comparison Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `==` | Equal | `a == b` |
| `!=` | Not equal | `a != b` |
| `<` | Less than | `a < b` |
| `>` | Greater than | `a > b` |
| `<=` | Less or equal | `a <= b` |
| `>=` | Greater or equal | `a >= b` |

### Logical Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `&&` | Logical AND | `a && b` |
| `||` | Logical OR | `a || b` |
| `!` | Logical NOT | `!a` |

### Bitwise Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `&` | Bitwise AND | `a & b` |
| `|` | Bitwise OR | `a | b` |
| `^` | Bitwise XOR | `a ^ b` |
| `~` | Bitwise NOT | `~a` |
| `<<` | Left shift | `a << b` |
| `>>` | Right shift | `a >> b` |

## Built-in Functions

### Signature Requirements

```coinscript
// Require a specific signature
requireSignature(signerAddress);

// Require multiple signatures
requireSignatures([addr1, addr2, addr3]);

// Require M of N signatures
requireMofN(2, [addr1, addr2, addr3]);
```

### Coin Operations

```coinscript
// Send coins to an address
sendCoins(recipient, amount);

// Get current coin amount
uint256 total = coinAmount();

// Get current coin ID
bytes32 id = coinID();

// Get puzzle hash
bytes32 ph = puzzleHash();

// Create coin with specific puzzle hash
createCoin(puzzleHash, amount, memos);
```

### Announcements

```coinscript
// Create announcements
createAnnouncement(message);
assertAnnouncement(expectedHash);

// Puzzle announcements
createPuzzleAnnouncement(data);
assertPuzzleAnnouncement(hash);
```

### Time Locks

```coinscript
// Absolute time lock (Unix timestamp)
requireTimeAbsolute(1234567890);

// Relative time lock (seconds)
requireTimeRelative(3600); // 1 hour

// Block height requirements
requireBlockHeight(1000000);
requireBlockHeightRelative(100);
```

### Cryptographic Functions

```coinscript
// SHA256 hash
bytes32 hash = sha256(data);

// Tree hash (puzzle hash calculation)
bytes32 treeHash = sha256tree(structure);

// Verify BLS signature
bool valid = verifySignature(publicKey, message, signature);
```

### State Management

```coinscript
// Set state value (for stateful coins)
setState("balance", newBalance);

// Get state value
uint256 currentBalance = getState("balance");

// Check if state exists
bool hasBalance = hasState("balance");
```

## Events

Events emit information during coin spends:

```coinscript
// Define events
event Transfer(address indexed from, address indexed to, uint256 amount);
event Approval(address indexed owner, address indexed spender, uint256 amount);
event StateChanged(string key, bytes32 oldValue, bytes32 newValue);

// Emit events
emit Transfer(sender, recipient, amount);
emit Approval(msg.sender, spender, allowance);
```

## Require Statements

Validate conditions with custom error messages:

```coinscript
require(amount > 0, "Amount must be positive");
require(recipient != 0x0, "Invalid recipient address");
require(balance >= amount, "Insufficient balance");

// Can also use assert (same as require without message)
assert(isValid);
```

## Special Variables

### Message Context

```coinscript
msg.sender    // Address of the coin being spent
msg.value     // Amount of the coin being spent
msg.puzzle    // Current puzzle hash
msg.solution  // Current solution data
```

### Block Context

```coinscript
block.timestamp  // Current block timestamp
block.height     // Current block height
block.prevhash   // Previous block hash
```

## Decorators

Apply decorators to coins for additional functionality:

```coinscript
@singleton(launcherID)
@ownable(initialOwner)
@pausable
coin MyToken {
  // Singleton coin with ownership and pause functionality
}
```

Common decorators:
- `@singleton` - Makes coin a singleton
- `@ownable` - Adds ownership functionality
- `@pausable` - Adds pause/unpause capability
- `@upgradeable` - Allows puzzle upgrades
- `@mintable` - Adds minting capability

## Inheritance

CoinScript supports contract inheritance:

```coinscript
// Base contract
abstract coin ERC20 {
  storage string name;
  storage string symbol;
  storage uint8 decimals;
  
  function totalSupply() view returns uint256;
  function balanceOf(address account) view returns uint256;
}

// Derived contract
coin MyToken is ERC20 {
  storage uint256 _totalSupply = 1000000;
  
  function totalSupply() view returns uint256 {
    return _totalSupply;
  }
}
```

## Error Handling

### Try-Catch

```coinscript
try {
  riskyOperation();
} catch (string memory error) {
  // Handle error
  emit ErrorOccurred(error);
}
```

### Custom Errors

```coinscript
error InsufficientBalance(uint256 requested, uint256 available);
error Unauthorized(address caller);

action withdraw(uint256 amount) {
  if (balance < amount) {
    revert InsufficientBalance(amount, balance);
  }
}
```

## Include Files

Include ChiaLisp libraries:

```coinscript
include "condition_codes.clib"
include "singleton_truths.clib"

// Auto-includes based on usage
bytes32 hash = sha256tree(data); // Auto-includes sha256tree.clib
```

## Inline ChiaLisp

For advanced use cases, embed ChiaLisp directly:

```coinscript
function customLogic() returns bytes32 {
  return chialisp!{
    (sha256 (concat 0x01 data))
  };
}
```

## Compilation Model

### CoinScript to ChiaLisp

1. **Storage variables** → `defconstant`
2. **Actions** → Functions with dispatcher
3. **Functions** → `defun` or `defun-inline`
4. **Require statements** → Conditional failures
5. **Events** → Announcements

### Solution Structure

Solutions provide parameters for actions:

```javascript
// CoinScript action
action transfer(address to, uint256 amount) { ... }

// Corresponding solution
("transfer" 0xrecipient... 1000)
```

## Best Practices

### 1. Use Descriptive Names

```coinscript
// Good
storage address tokenOwner;
action transferTokens(address recipient, uint256 amount);

// Bad
storage address o;
action t(address r, uint256 a);
```

### 2. Validate Inputs

```coinscript
action transfer(address to, uint256 amount) {
  require(to != 0x0, "Invalid recipient");
  require(amount > 0, "Amount must be positive");
  require(amount <= balance, "Insufficient balance");
  // ... transfer logic
}
```

### 3. Use Modifiers for Access Control

```coinscript
modifier onlyOwner() {
  requireSignature(owner);
  _;
}

modifier whenNotPaused() {
  require(!paused, "Contract is paused");
  _;
}
```

### 4. Emit Events for Important State Changes

```coinscript
action updateOwner(address newOwner) onlyOwner {
  address oldOwner = owner;
  owner = newOwner;
  emit OwnershipTransferred(oldOwner, newOwner);
}
```

### 5. Document Your Code

```coinscript
/**
 * @title MyToken
 * @dev Implementation of a basic token with minting
 */
coin MyToken {
  /**
   * @dev Transfers tokens from sender to recipient
   * @param to The recipient address
   * @param amount The amount to transfer
   */
  action transfer(address to, uint256 amount) {
    // Implementation
  }
}
```

## Common Patterns

### Multi-Signature Wallet

```coinscript
coin MultiSig {
  storage address[] owners;
  storage uint256 required;
  
  modifier onlyOwners() {
    bool isOwner = false;
    for (uint256 i = 0; i < owners.length; i++) {
      if (hasSignature(owners[i])) {
        isOwner = true;
        break;
      }
    }
    require(isOwner, "Not an owner");
    _;
  }
  
  action execute(address to, uint256 amount) onlyOwners {
    uint256 signatureCount = 0;
    for (uint256 i = 0; i < owners.length; i++) {
      if (hasSignature(owners[i])) {
        signatureCount++;
      }
    }
    require(signatureCount >= required, "Not enough signatures");
    sendCoins(to, amount);
  }
}
```

### Time-Locked Vault

```coinscript
coin TimeLock {
  storage address beneficiary;
  storage uint256 releaseTime;
  
  action release() {
    require(block.timestamp >= releaseTime, "Still locked");
    requireSignature(beneficiary);
    sendCoins(beneficiary, coinAmount());
  }
}
```

### Upgradeable Pattern

```coinscript
@upgradeable
coin UpgradeableToken {
  storage address admin;
  storage bytes32 implementation;
  
  action upgrade(bytes32 newImplementation) {
    requireSignature(admin);
    implementation = newImplementation;
    emit Upgraded(newImplementation);
  }
  
  action execute(bytes solution) {
    delegateCall(implementation, solution);
  }
}
```

## Summary

CoinScript provides a comprehensive, type-safe language for Chia smart coin development. By abstracting ChiaLisp's complexity while maintaining its power, CoinScript enables developers to build sophisticated blockchain applications with familiar syntax and modern development practices.