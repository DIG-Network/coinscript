# CoinScript Examples

This directory contains examples demonstrating various features of the CoinScript language.

## Running Examples

Each example consists of:
- A `.coins` file containing the CoinScript source
- A `.js` file that compiles and demonstrates the puzzle

To run an example:
```bash
node 01-basic-payment.js
```

## Examples Overview

### Basic Examples
- **01-basic-payment.coins** - The simplest possible coin that accepts and returns conditions
- **02-pay-to-pubkey.coins** - Standard Chia coin requiring a signature from a specific public key
- **03-escrow.coins** - Two-party escrow with multiple spend paths and time-based refunds

### Advanced Features
- **06-multi-action-coin.coins** - Demonstrates coins with multiple spend paths using actions
- **07-storage-vs-state.coins** - Shows the difference between immutable storage and mutable state
- **09-transfer-example.coins** - Examples of using send() with and without memos
- **10-access-control.coins** - Demonstrates @onlyAddress decorator for access control

### Special Examples
- **solution-builder-guide.js** - Comprehensive guide to using the SolutionBuilder API

## Using the SolutionBuilder

The SolutionBuilder provides a fluent API for creating solutions to spend CoinScript coins:

```javascript
const { createSolution } = require('@chia/puzzle-framework');

// Basic solution with conditions
const solution = createSolution()
  .addConditions(conditions => {
    conditions
      .createCoin('0xRECIPIENT_HASH', 1000)
      .reserveFee(50);
  });

// Solution for multi-action coin
const actionSolution = createSolution()
  .addAction('transfer')
  .add('0xRECIPIENT')
  .add(500);

// Solution with state management
const statefulSolution = createSolution()
  .addAction('updateCounter')
  .addState({
    counter: 42,
    owner: '0xOWNER_ADDRESS'
  });
```

## Key Concepts

### Storage vs State

**Storage** - Immutable values curried into the puzzle:
```coinscript
storage {
    address ADMIN = "xch1...";  // Part of puzzle hash
    uint256 MAX_SUPPLY = 1000000;  // Cannot change
}
```

**State** - Mutable values stored in coin memo/hints:
```coinscript
state {
    uint256 balance = 0;  // Can be updated
    bool isPaused = false;  // Changes between spends
}
```

### Actions

Every coin must have at least one action that defines how it can be spent:

```coinscript
action spend(bytes32 conditions) {
    // Logic here
    conditions;  // Return conditions
}
```

For multiple spend paths:
```coinscript
action default(bytes32 conditions) {
    // Runs when no ACTION specified
}

action transfer(address to, bytes32 conditions) {
    // Runs when ACTION="transfer"
}
```

### Creating Solutions

Every CoinScript puzzle needs a corresponding solution to be spent. Here are common patterns:

#### 1. Simple Payment
```javascript
const solution = createSolution()
  .addConditions(conditions => {
    conditions.createCoin(recipientHash, amount);
  });
```

#### 2. Multi-Action Coin
```javascript
// For default action (no action name needed)
const defaultSolution = createSolution()
  .addConditions(conditions => { /* ... */ });

// For named action
const namedSolution = createSolution()
  .addAction('actionName')
  .add(param1)
  .add(param2);
```

#### 3. Access-Controlled Actions
```javascript
// The @onlyAddress decorator is checked automatically
// Just provide the action and parameters
const ownerSolution = createSolution()
  .addAction('ownerOnlyAction')
  .add(parameter);
```

#### 4. Stateful Coins
```javascript
const statefulSolution = createSolution()
  .addAction('updateState')
  .addState({
    counter: currentCounter + 1,
    lastUpdated: Date.now()
  })
  .add(additionalParam);
```

### Important Rules

1. **Every coin MUST implement a spend function** - either `action spend()` or `action default()` plus other named actions
2. **Actions must return conditions** - use a standalone identifier like `conditions;` at the end
3. **Storage values are immutable** - they become part of the puzzle hash
4. **State values are mutable** - they're stored in coin memos and can change
5. **Solutions must match action signatures** - provide parameters in the correct order

## Complete Example

Here's a complete example showing puzzle creation and solution:

```javascript
// 1. Create the coin (in .coins file)
/*
coin PaymentCoin {
    storage address owner = "xch1...";
    
    action pay(address to, uint256 amount) {
        require(msg.sender == owner, "Not owner");
        send(to, amount);
    }
}
*/

// 2. Compile the coin
const puzzle = parseCoinScriptFile('./payment.coins');

// 3. Create a solution
const solution = createSolution()
  .addAction('pay')
  .add('0xRECIPIENT_ADDRESS')
  .add(1000);

// 4. Execute the spend
// (In practice, this would be submitted to the Chia network)
```

## Running All Examples

To test all examples at once:

```bash
node test-all.js
```

## Learn More

- See `solution-builder-guide.js` for comprehensive SolutionBuilder documentation
- Check individual example files for specific use cases
- Refer to the main documentation for language specification 