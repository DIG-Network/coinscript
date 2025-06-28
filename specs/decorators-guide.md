# CoinScript Decorators Guide

## Overview

CoinScript now supports decorators for actions, allowing you to add metadata and behavior modifiers to your smart coin actions. The first implemented decorator is `@onlyAddress` for access control.

## Access Control with @onlyAddress

The `@onlyAddress` decorator restricts who can execute a specific action by validating the sender's address.

### Syntax

```coinscript
@onlyAddress(address1[, address2, ...])
action myAction() {
    // Action body
}
```

### Features

- **Single Address Control**: Restrict action to one specific address
- **Multiple Address Control**: Allow multiple addresses to execute the action
- **Storage Variable Support**: Use storage variables containing addresses
- **Automatic Validation**: Generates `require()` statements that check the sender

### Examples

#### Single Address
```coinscript
storage address owner = 0x0000000000000000000000000000000000000000000000000000000000000001;

@onlyAddress(owner)
action transferOwnership(address newOwner) {
    // Only the owner can execute this
}
```

#### Multiple Addresses
```coinscript
storage address owner = 0x0000000000000000000000000000000000000000000000000000000000000001;
storage address admin = 0x0000000000000000000000000000000000000000000000000000000000000002;

@onlyAddress(owner, admin)
action withdraw(address recipient, uint256 amount) {
    // Both owner and admin can execute this
}
```

### Generated ChiaLisp

The decorator generates validation logic before the action body:

```lisp
; For single address
(assert (= sender "0x0000...0001"))

; For multiple addresses  
(assert (any 
  (= sender "0x0000...0001")
  (= sender "0x0000...0002")
))
```

If the sender doesn't match any allowed address, the transaction fails with "Unauthorized: sender not in allowed addresses".

## How It Works

1. **Parsing**: The parser recognizes `@` symbols before actions and parses decorators
2. **AST Enhancement**: Decorators are stored in the action's AST node
3. **Code Generation**: During compilation, decorators inject validation code
4. **Runtime Check**: When the action is called, sender validation happens first

## Implementation Details

### Parser Changes

- Added `AT` token type for `@` symbol
- Added `Decorator` interface to AST
- Updated `parseActionDeclaration` to handle decorators
- Added `parseDecorator` and `parseDecorators` methods

### Code Generator Changes

The `buildActionChain` function now:
1. Checks for decorators on each action
2. For `@onlyAddress`, generates address validation logic
3. Uses OR logic for multiple addresses
4. Places validation before action body execution

## Future Decorators

The decorator system is extensible. Potential future decorators include:

- `@requireBalance(amount)` - Ensure minimum balance
- `@timelock(seconds)` - Add time-based restrictions  
- `@nonReentrant` - Prevent reentrancy attacks
- `@pausable` - Allow pausing/unpausing actions
- `@emitEvent(eventName)` - Automatic event emission

## Best Practices

1. **Use Storage Variables**: Store addresses in storage for easier updates
2. **Combine with Events**: Emit events in restricted actions for transparency
3. **Document Access**: Clearly document who can execute each action
4. **Test Thoroughly**: Test both authorized and unauthorized access attempts

## Example: Complete Access-Controlled Coin

```coinscript
coin AccessControlledCoin {
    storage address owner = 0x0000000000000000000000000000000000000000000000000000000000000001;
    storage address treasury = 0x0000000000000000000000000000000000000000000000000000000000000002;
    
    event OwnershipTransferred(address previousOwner, address newOwner);
    event Withdrawal(address recipient, uint256 amount);
    
    @onlyAddress(owner)
    action transferOwnership(address newOwner) {
        require(newOwner != 0x0, "Invalid address");
        emit OwnershipTransferred(owner, newOwner);
    }
    
    @onlyAddress(owner, treasury)
    action withdraw(address recipient, uint256 amount) {
        require(amount > 0, "Invalid amount");
        send(recipient, amount);
        emit Withdrawal(recipient, amount);
    }
    
    // Public action - no decorator
    action deposit() {
        // Anyone can deposit
    }
}
```

This creates a coin where:
- Only the owner can transfer ownership
- Both owner and treasury can withdraw funds
- Anyone can deposit funds 

## Coin-Level Decorators

### @singleton

The `@singleton` decorator automatically wraps the entire coin in a singleton layer, ensuring only one instance of the coin can exist on the blockchain.

#### Syntax

```coinscript
// Auto-generated launcher ID
@singleton
coin MySingleton {
    // ... coin definition ...
}

// Specific launcher ID
@singleton(0x1234567890123456789012345678901234567890123456789012345678901234)
coin MySingleton {
    // ... coin definition ...
}
```

#### Example

```coinscript
@singleton
coin UniqueToken {
    storage address owner = "xch1...";
    
    action transfer(address newOwner) {
        require(msg.sender == owner, "Not owner");
        // Transfer logic
        conditions;
    }
}
```

#### Benefits

1. **Cleaner Syntax**: No need to explicitly declare `layer singleton(...);`
2. **Clear Intent**: Immediately obvious that the coin is a singleton
3. **Automatic Setup**: Handles launcher ID generation if not provided
4. **Composable**: Works alongside action-level decorators

## Combining Decorators

Decorators can be combined for more complex behavior:

```coinscript
@singleton
coin SecureSingleton {
    storage address owner = "xch1...";
    
    @onlyAddress(owner)
    @stateful
    action updateState(uint256 newValue) {
        state.value = newValue;
        conditions;
    }
}
```

## Future Decorators

Potential decorators that could be added:

- `@payable` - Requires payment to execute action
- `@nonReentrant` - Prevents reentrancy attacks
- `@pausable` - Can be paused/unpaused
- `@upgradeable` - Allows puzzle upgrades
- `@timelocked` - Adds time-based restrictions
- `@multisig(n, m)` - Requires n of m signatures

## Best Practices

1. **Use Sparingly**: Only add decorators that provide clear value
2. **Document Intent**: Comment why a decorator is used
3. **Test Thoroughly**: Decorators add complexity - test all paths
4. **Consider Gas**: Each decorator adds checks that cost compute

## Implementation Notes

Decorators are processed at compile time and generate appropriate validation code. They don't exist at runtime - they're purely a development convenience that makes code more readable and maintainable. 