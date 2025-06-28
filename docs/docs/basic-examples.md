---
sidebar_position: 4
title: Basic Examples
---

# Basic CoinScript Examples

This page contains a collection of basic CoinScript examples to help you understand common patterns and use cases.

## Simple Payment

The most basic contract - send coins with authorization:

```coinscript
coin SimplePayment {
  // Storage is immutable - part of the puzzle
  storage address authorized = 0x1234...;
  
  action pay(address recipient, uint256 amount) {
    require(msg.sender == authorized, "Not authorized");
    send(recipient, amount);
  }
}
```

**Key Concepts:**
- `storage` variables are constants curried into the puzzle
- `require` with `msg.sender` creates signature verification
- `send` creates a CREATE_COIN condition

**ChiaLisp Output:**
```clsp
(mod (action recipient amount)
  (include condition_codes.clib)
  
  (defconstant AUTHORIZED 0x1234...)
  
  (if (= action "pay")
    (if (= (f @) AUTHORIZED)  ; Check sender
      (list (list CREATE_COIN recipient amount))
      (x "Not authorized")
    )
    (x "Unknown action")
  )
)
```

## Multi-Signature (2 of 3)

Require multiple signatures before spending:

```coinscript
coin MultiSig2of3 {
  storage address signer1 = 0x1111...;
  storage address signer2 = 0x2222...;
  storage address signer3 = 0x3333...;
  
  action spend(address to, uint256 amount, address sig1, address sig2) {
    // Verify we have exactly 2 different valid signers
    uint8 validCount = 0;
    
    if (sig1 == signer1 || sig1 == signer2 || sig1 == signer3) {
      requireSignature(sig1);
      validCount += 1;
    }
    
    if (sig2 == signer1 || sig2 == signer2 || sig2 == signer3) {
      require(sig2 != sig1, "Duplicate signer");
      requireSignature(sig2);
      validCount += 1;
    }
    
    require(validCount == 2, "Need exactly 2 signatures");
    send(to, amount);
  }
}
```

**Key Concepts:**
- Multiple signature requirements
- Duplicate signature prevention
- Fixed set of authorized signers

## Time-Locked Vault

Release funds only after a certain time:

```coinscript
coin TimeLock {
  storage address beneficiary = 0xAAAA...;
  storage uint256 unlockTime = 1735689600; // Jan 1, 2025
  storage address earlyRelease = 0xBBBB...; // Emergency key
  
  action withdraw() {
    require(msg.sender == beneficiary, "Not beneficiary");
    require(currentTime() >= unlockTime, "Still locked");
    
    send(beneficiary, coinAmount());
  }
  
  // Emergency withdrawal requires both keys
  action emergencyWithdraw() {
    requireSignature(beneficiary);
    requireSignature(earlyRelease);
    
    // 10% penalty for early withdrawal
    uint256 penalty = coinAmount() / 10;
    uint256 withdrawal = coinAmount() - penalty;
    
    send(beneficiary, withdrawal);
    send(earlyRelease, penalty);  // Penalty goes to emergency key holder
  }
}
```

**Key Concepts:**
- Time-based conditions with `currentTime()`
- `coinAmount()` to get the coin's value
- Penalty mechanisms
- Multi-signature for override

## Escrow Contract

Three-party escrow with dispute resolution:

```coinscript
coin Escrow {
  storage address buyer = 0x1111...;
  storage address seller = 0x2222...;
  storage address arbiter = 0x3333...;
  storage bytes32 dealHash = 0xABCD...; // Hash of deal terms
  
  event EscrowComplete(address recipient);
  event DisputeResolved(address winner);
  
  // Buyer confirms receipt, releases to seller
  action confirmDelivery() {
    require(msg.sender == buyer, "Only buyer can confirm");
    send(seller, coinAmount());
    emit EscrowComplete(seller);
  }
  
  // Seller cancels, refunds buyer
  action cancelDeal() {
    require(msg.sender == seller, "Only seller can cancel");
    send(buyer, coinAmount());
    emit EscrowComplete(buyer);
  }
  
  // Arbiter resolves dispute
  action resolveDispute(bool buyerWins) {
    require(msg.sender == arbiter, "Only arbiter can resolve");
    
    if (buyerWins) {
      send(buyer, coinAmount());
      emit DisputeResolved(buyer);
    } else {
      send(seller, coinAmount());
      emit DisputeResolved(seller);
    }
  }
  
  // Both parties agree to cancel
  action mutualCancel() {
    requireSignature(buyer);
    requireSignature(seller);
    
    // Split 50/50 on mutual cancel
    uint256 half = coinAmount() / 2;
    send(buyer, half);
    send(seller, coinAmount() - half);
  }
}
```

**Key Concepts:**
- Multi-party authorization
- Event emission with CREATE_COIN_ANNOUNCEMENT
- Conditional logic in actions
- Different resolution paths

## Hash Time-Locked Contract (HTLC)

Used for atomic swaps and payment channels:

```coinscript
coin HTLC {
  storage address sender = 0x1111...;
  storage address recipient = 0x2222...;
  storage bytes32 hashlock = 0xHASH...;  // sha256(secret)
  storage uint256 timeout = 1735689600;
  
  // Recipient claims with secret
  action claim(bytes32 secret) {
    require(sha256(secret) == hashlock, "Invalid secret");
    require(msg.sender == recipient, "Not recipient");
    
    send(recipient, coinAmount());
  }
  
  // Sender reclaims after timeout
  action refund() {
    require(currentTime() >= timeout, "Not expired");
    require(msg.sender == sender, "Not sender");
    
    send(sender, coinAmount());
  }
}
```

**Key Concepts:**
- Hash verification with `sha256()`
- Time-based refund mechanism
- Atomic swap building block

## Payment Splitter

Split payments between multiple recipients with fixed ratios:

```coinscript
coin PaymentSplitter {
  // Recipients and their shares (out of 100)
  storage address recipient1 = 0x1111...;
  storage uint8 share1 = 60;  // 60%
  
  storage address recipient2 = 0x2222...;
  storage uint8 share2 = 30;  // 30%
  
  storage address recipient3 = 0x3333...;
  storage uint8 share3 = 10;  // 10%
  
  action split() {
    uint256 total = coinAmount();
    
    // Calculate amounts
    uint256 amount1 = (total * share1) / 100;
    uint256 amount2 = (total * share2) / 100;
    uint256 amount3 = total - amount1 - amount2; // Remainder to avoid dust
    
    // Send to recipients
    send(recipient1, amount1);
    send(recipient2, amount2);
    send(recipient3, amount3);
  }
}
```

**Key Concepts:**
- Fixed payment ratios in storage
- Integer division for shares
- Remainder handling to avoid dust

## Commit-Reveal Pattern

Two-phase commit for hidden values:

```coinscript
coin CommitReveal {
  storage address player = 0x1111...;
  storage bytes32 commitment = 0xCOMMIT...; // sha256(value + nonce)
  storage uint256 revealDeadline = 1735689600;
  storage address beneficiary = 0x2222...;
  
  // Reveal the committed value
  action reveal(uint256 value, bytes32 nonce) {
    require(sha256(concat(value, nonce)) == commitment, "Invalid reveal");
    require(currentTime() < revealDeadline, "Reveal period ended");
    require(msg.sender == player, "Not player");
    
    // Example: If value is even, player wins
    if (value % 2 == 0) {
      send(player, coinAmount());
    } else {
      send(beneficiary, coinAmount());
    }
  }
  
  // Timeout claim if not revealed
  action timeoutClaim() {
    require(currentTime() >= revealDeadline, "Still in reveal period");
    send(beneficiary, coinAmount());
  }
}
```

**Key Concepts:**
- Commit-reveal for hidden information
- Hash commitment verification
- Timeout protection

## State Machine Example (Using Slot-Machine Pattern)

For contracts that need mutable state:

```coinscript
coin StatefulCounter {
  // Immutable configuration
  storage address owner = 0x1111...;
  storage uint256 maxCount = 100;
  
  // Mutable state (requires slot-machine pattern)
  state {
    uint256 counter;
    address lastIncrementer;
  }
  
  @stateful
  action increment() {
    require(state.counter < maxCount, "Max count reached");
    
    state.counter += 1;
    state.lastIncrementer = msg.sender;
    
    // Recreate coin with new state
    recreateSelf();
  }
  
  @stateful
  action reset() {
    require(msg.sender == owner, "Only owner can reset");
    
    state.counter = 0;
    state.lastIncrementer = owner;
    
    recreateSelf();
  }
  
  // Read-only action
  action getCount() view returns (uint256) {
    return state.counter;
  }
}
```

**Key Concepts:**
- `state` block for mutable values
- `@stateful` decorator for state-modifying actions
- State passed in solution, not curried
- Coin recreation for state persistence

## Using These Examples

### Compilation

Each example can be compiled using:

```javascript
const { compileCoinScript } = require('chia-puzzle-framework');

const source = `
  coin SimplePayment {
    storage address authorized = 0x1234...;
    action pay(address to, uint256 amount) {
      require(msg.sender == authorized);
      send(to, amount);
    }
  }
`;

const result = compileCoinScript(source);
console.log('ChiaLisp:', result.chialisp);
console.log('Puzzle Hash:', result.puzzleHash);
```

### Creating Solutions

Interact with the contracts:

```javascript
const { createSolution } = require('chia-puzzle-framework');

// For SimplePayment
const solution = createSolution()
  .addAction('pay')
  .addParam('to', recipientAddress)
  .addParam('amount', 1000);

console.log(solution.serialize());
// Output: ("pay" 0xRECIPIENT 1000)
```

### Important Notes

1. **Storage is Immutable** - All `storage` variables are curried into the puzzle and cannot change
2. **No Arrays/Mappings in Storage** - Use fixed variables or the state pattern
3. **State Requires Slot-Machine** - Mutable state needs special handling with `@stateful`
4. **Events are Announcements** - Events compile to CREATE_COIN_ANNOUNCEMENT conditions
5. **Actions are Entry Points** - Each action represents a different way to spend the coin

## Next Steps

- Learn more in the [CoinScript Reference](./coinscript/reference) for complete language details
- Explore [CoinScript Examples](./coinscript/examples) for more complex patterns
- Understand [PuzzleBuilder](./coinscript/puzzle-solution-builder) for programmatic puzzle creation
- See how it all works with the [AST Engine](./coinscript/ast-engine) 