---
sidebar_position: 3
title: CoinScript Examples
description: Learn CoinScript through practical examples from basic to advanced
---

# CoinScript Examples

This guide presents three CoinScript examples of increasing complexity, showing the CoinScript source, generated ChiaLisp, and compiled CLVM for each.

## Example 1: Basic Payment with Signature

A simple contract that requires a signature to spend coins.

### CoinScript

```coinscript
// basic-payment.coins
coin BasicPayment {
  storage address owner = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
  
  action pay(address recipient, uint256 amount) {
    requireSignature(owner);
    sendCoins(recipient, amount);
  }
}
```

### Generated ChiaLisp

```clsp
(mod (action recipient amount)
  (include condition_codes.clib)
  
  ; Constants
  (defconstant OWNER 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef)
  
  ; Action: pay
  (defun-inline pay (recipient amount)
    (list
      (list AGG_SIG_ME OWNER (sha256 recipient amount))
      (list CREATE_COIN recipient amount)
    )
  )
  
  ; Action dispatcher
  (if (= action "pay")
    (pay recipient amount)
    (x)  ; Unknown action
  )
)
```

### Compiled CLVM (Hex)

```
ff02ffff01ff02ffff03ffff09ff0580ffff01ff04ffff02ff08ffff04ff02ffff04ff05ffff04ff0bff80808080ff0180ffff01ff088080ff0180ffff04ffff01ff02ffff01ff04ffff02ff05ffff04ff17ffff04ffff0bff27ff2f80ff808080ffff02ff16ffff04ff02ffff04ff09ffff04ff2fffff04ffff02ff3effff04ff02ffff04ff05ff80808080ff808080808080ff0180ffff01ff32ff1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef018080
```

### Usage Example

```javascript
const solution = new SolutionBuilder()
  .addParam('action', 'pay')
  .addParam('recipient', '0xabcd...')
  .addParam('amount', 1000)
  .build();
```

## Example 2: Multi-Signature Wallet

A wallet that requires multiple signatures and supports partial payments.

### CoinScript

```coinscript
// multi-sig-wallet.coins
coin MultiSigWallet {
  storage address owner1 = 0x1111111111111111111111111111111111111111111111111111111111111111;
  storage address owner2 = 0x2222222222222222222222222222222222222222222222222222222222222222;
  storage uint256 dailyLimit = 10000;
  
  action transfer(address recipient, uint256 amount, uint256 remaining) {
    // Require both signatures
    requireSignature(owner1);
    requireSignature(owner2);
    
    // Enforce daily limit
    require(amount <= dailyLimit, "Amount exceeds daily limit");
    
    // Send the payment
    sendCoins(recipient, amount);
    
    // Return change if any
    if (remaining > 0) {
      sendCoins(puzzleHash(), remaining);
    }
  }
  
  action emergencyWithdraw(address recipient) {
    // In emergency, both owners must sign
    requireSignature(owner1);
    requireSignature(owner2);
    
    // Send all funds
    sendCoins(recipient, coinAmount());
  }
}
```

### Generated ChiaLisp

```clsp
(mod (action recipient amount remaining)
  (include condition_codes.clib)
  
  ; Constants
  (defconstant OWNER1 0x1111111111111111111111111111111111111111111111111111111111111111)
  (defconstant OWNER2 0x2222222222222222222222222222222222222222222222222222222222222222)
  (defconstant DAILY_LIMIT 10000)
  
  ; Helper: Get puzzle hash
  (defun-inline puzzle-hash () 
    (sha256tree 1)
  )
  
  ; Helper: Get coin amount
  (defun-inline coin-amount ()
    (f (r (r (f @))))
  )
  
  ; Action: transfer
  (defun-inline transfer (recipient amount remaining)
    (if (> amount DAILY_LIMIT)
      (x "Amount exceeds daily limit")
      (c
        (list AGG_SIG_ME OWNER1 (sha256 action recipient amount remaining))
        (c
          (list AGG_SIG_ME OWNER2 (sha256 action recipient amount remaining))
          (c
            (list CREATE_COIN recipient amount)
            (if (> remaining 0)
              (list (list CREATE_COIN (puzzle-hash) remaining))
              ()
            )
          )
        )
      )
    )
  )
  
  ; Action: emergencyWithdraw
  (defun-inline emergency-withdraw (recipient)
    (list
      (list AGG_SIG_ME OWNER1 (sha256 action recipient))
      (list AGG_SIG_ME OWNER2 (sha256 action recipient))
      (list CREATE_COIN recipient (coin-amount))
    )
  )
  
  ; Action dispatcher
  (if (= action "transfer")
    (transfer recipient amount remaining)
    (if (= action "emergencyWithdraw")
      (emergency-withdraw recipient)
      (x)  ; Unknown action
    )
  )
)
```

### Compiled CLVM (Hex)

```
ff02ffff01ff02ffff03ffff09ff0580ffff01ff04ffff02ff10ffff04ff02ffff04ff05ffff04ff0bffff04ff17ff80808080ff0180ffff01ff02ffff03ffff09ff0580ffff01ff08ffff02ff14ffff04ff02ffff04ff05ff8080ff0180ffff01ff088080ff018080ff0180ffff04ffff01ffff02ffff01ff02ffff03ffff15ff0bff82271080ffff01ff088080ffff01ff04ffff02ff05ffff04ff82011fffff04ffff0bff34ff0580ff808080ffff04ffff02ff05ffff04ff82011fffff04ffff0bff34ff0b80ff808080ffff04ffff02ff16ffff04ff02ffff04ff09ffff04ff0bff808080ffff02ffff03ffff15ff17ff0180ffff01ff02ffff01ff02ff16ffff04ff02ffff04ffff0bff3cff3480ffff04ff17ff80808080ff018080ffff01ff80ff01808080808080ffff04ffff01ff32ff1111111111111111111111111111111111111111111111111111111111111111ffff04ffff01ff32ff2222222222222222222222222222222222222222222222222222222222222222ffff04ffff01ff822710ffff01ff0bff34ff0bff3cff1780ff0580ff018080
```

### Usage Example

```javascript
// Regular transfer
const transferSolution = new SolutionBuilder()
  .addParam('action', 'transfer')
  .addParam('recipient', '0xabcd...')
  .addParam('amount', 5000)
  .addParam('remaining', 1000)  // Change back
  .build();

// Emergency withdrawal
const emergencySolution = new SolutionBuilder()
  .addParam('action', 'emergencyWithdraw')
  .addParam('recipient', '0xsafe...')
  .build();
```

## Example 3: Stateful Token with Events

An advanced example showing a token contract with state management, access control, and event emission.

### CoinScript

```coinscript
// stateful-token.coins
coin StatefulToken {
  // State variables
  storage string name = "MyToken";
  storage string symbol = "MTK";
  storage uint256 totalSupply = 1000000;
  storage address admin = 0x3333333333333333333333333333333333333333333333333333333333333333;
  
  // Access control modifier
  modifier onlyAdmin() {
    requireSignature(admin);
  }
  
  // Minting action - only admin can mint new tokens
  action mint(address recipient, uint256 amount, uint256 newTotal) {
    onlyAdmin();
    
    // Validate new total supply
    require(newTotal == totalSupply + amount, "Invalid total supply");
    require(amount > 0, "Amount must be positive");
    
    // Create new tokens
    sendCoins(recipient, amount);
    
    // Update state with new total supply
    setState("totalSupply", newTotal);
    
    // Emit minting event
    emit TokensMinted(recipient, amount, newTotal);
  }
  
  // Transfer action - anyone can transfer their tokens
  action transfer(address from, address to, uint256 amount, uint256 remaining) {
    requireSignature(from);
    
    // Validate transfer
    require(amount > 0, "Amount must be positive");
    require(to != 0x0, "Invalid recipient");
    
    // Send tokens
    sendCoins(to, amount);
    
    // Return remaining balance to sender
    if (remaining > 0) {
      sendCoins(from, remaining);
    }
    
    // Emit transfer event
    emit Transfer(from, to, amount);
  }
  
  // Burn action - destroy tokens
  action burn(address from, uint256 burnAmount, uint256 newTotal) {
    requireSignature(from);
    
    // Validate burn
    require(burnAmount > 0, "Burn amount must be positive");
    require(newTotal == totalSupply - burnAmount, "Invalid total supply");
    
    // Update total supply
    setState("totalSupply", newTotal);
    
    // Emit burn event
    emit TokensBurned(from, burnAmount, newTotal);
  }
  
  // View function to check if address is admin
  function isAdmin(address addr) view returns bool {
    return addr == admin;
  }
}
```

### Generated ChiaLisp

```clsp
(mod (action recipient amount new_total from to remaining burn_amount)
  (include condition_codes.clib)
  
  ; Constants
  (defconstant NAME "MyToken")
  (defconstant SYMBOL "MTK")
  (defconstant TOTAL_SUPPLY 1000000)
  (defconstant ADMIN 0x3333333333333333333333333333333333333333333333333333333333333333)
  
  ; Modifier: onlyAdmin
  (defun-inline only-admin ()
    (list AGG_SIG_ME ADMIN (sha256 action))
  )
  
  ; Helper: setState
  (defun-inline set-state (key value)
    (list CREATE_PUZZLE_ANNOUNCEMENT (sha256 key value))
  )
  
  ; Helper: emit event
  (defun-inline emit-event (event-name . args)
    (list CREATE_COIN_ANNOUNCEMENT (sha256 event-name . args))
  )
  
  ; Action: mint
  (defun mint (recipient amount new_total)
    (if (not (= new_total (+ TOTAL_SUPPLY amount)))
      (x "Invalid total supply")
      (if (not (> amount 0))
        (x "Amount must be positive")
        (list
          (only-admin)
          (list CREATE_COIN recipient amount)
          (set-state "totalSupply" new_total)
          (emit-event "TokensMinted" recipient amount new_total)
        )
      )
    )
  )
  
  ; Action: transfer
  (defun transfer (from to amount remaining)
    (if (not (> amount 0))
      (x "Amount must be positive")
      (if (= to 0)
        (x "Invalid recipient")
        (c
          (list AGG_SIG_ME from (sha256 action to amount))
          (c
            (list CREATE_COIN to amount)
            (c
              (if (> remaining 0)
                (list CREATE_COIN from remaining)
                ()
              )
              (list
                (emit-event "Transfer" from to amount)
              )
            )
          )
        )
      )
    )
  )
  
  ; Action: burn
  (defun burn (from burn_amount new_total)
    (if (not (> burn_amount 0))
      (x "Burn amount must be positive")
      (if (not (= new_total (- TOTAL_SUPPLY burn_amount)))
        (x "Invalid total supply")
        (list
          (list AGG_SIG_ME from (sha256 action burn_amount new_total))
          (set-state "totalSupply" new_total)
          (emit-event "TokensBurned" from burn_amount new_total)
        )
      )
    )
  )
  
  ; View function: isAdmin
  (defun is-admin (addr)
    (= addr ADMIN)
  )
  
  ; Action dispatcher
  (if (= action "mint")
    (mint recipient amount new_total)
    (if (= action "transfer")
      (transfer from to amount remaining)
      (if (= action "burn")
        (burn from burn_amount new_total)
        (if (= action "isAdmin")
          (is-admin from)  ; Reusing 'from' parameter for view function
          (x)  ; Unknown action
        )
      )
    )
  )
)
```

### Compiled CLVM (Hex)

```
ff02ffff01ff02ffff03ffff09ff0580ffff01ff04ffff02ff2cffff04ff02ffff04ff05ffff04ff0bffff04ff17ff80808080ff0180ffff01ff02ffff03ffff09ff0580ffff01ff08ffff02ff30ffff04ff02ffff04ff29ffff04ff2dffff04ff0bffff04ff53ff808080ff0180ffff01ff02ffff03ffff09ff0580ffff01ff0affff02ff34ffff04ff02ffff04ff29ffff04ff57ffff04ff17ff808080ff0180ffff01ff02ffff03ffff09ff0580ffff01ff0cffff02ff38ffff04ff02ffff04ff29ff8080ff0180ffff01ff088080ff01808080ff018080ff0180ffff04ffff01ff094d79546f6b656effff04ffff01ff034d544bffff04ffff01ff830f4240ffff04ffff01ff32ff3333333333333333333333333333333333333333333333333333333333333333ff018080
```

### Usage Examples

```javascript
// Minting new tokens (admin only)
const mintSolution = new SolutionBuilder()
  .addParam('action', 'mint')
  .addParam('recipient', '0xuser1...')
  .addParam('amount', 1000)
  .addParam('newTotal', 1001000)
  .build();

// Transferring tokens
const transferSolution = new SolutionBuilder()
  .addParam('action', 'transfer')
  .addParam('from', '0xuser1...')
  .addParam('to', '0xuser2...')
  .addParam('amount', 100)
  .addParam('remaining', 900)
  .build();

// Burning tokens
const burnSolution = new SolutionBuilder()
  .addParam('action', 'burn')
  .addParam('from', '0xuser1...')
  .addParam('burnAmount', 50)
  .addParam('newTotal', 1000950)
  .build();
```

## Key Patterns Demonstrated

### 1. **Progressive Complexity**
- **Basic**: Simple signature and payment
- **Intermediate**: Multiple signatures, conditional logic
- **Advanced**: State management, events, access control

### 2. **Common Patterns**
- **Signature Requirements**: `requireSignature()` → `AGG_SIG_ME`
- **Coin Creation**: `sendCoins()` → `CREATE_COIN`
- **Validation**: `require()` statements with custom messages
- **Events**: `emit` → `CREATE_COIN_ANNOUNCEMENT`
- **State**: `setState()` → `CREATE_PUZZLE_ANNOUNCEMENT`

### 3. **Compilation Insights**
- CoinScript actions become ChiaLisp functions
- Storage variables become constants
- Modifiers are inlined where used
- The action dispatcher routes to the appropriate function

## Best Practices

1. **Start Simple**: Begin with basic contracts and gradually add complexity
2. **Test Thoroughly**: Use the simulator to test all action paths
3. **Optimize Gas**: More complex contracts cost more to execute
4. **Security First**: Always validate inputs and check signatures
5. **Document Well**: Use comments to explain complex logic

## Next Steps

Now that you've seen these examples:

1. Try modifying them to add new features
2. Experiment with different patterns
3. Learn about the [PuzzleBuilder and SolutionBuilder](./puzzle-solution-builder.md)
4. Dive into the [comprehensive CoinScript reference](./reference.md)

Remember: CoinScript compiles to ChiaLisp, so you always have the option to optimize critical sections by hand!