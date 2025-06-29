# Chia Smart Coins Guide

## Overview

Everything on the Chia blockchain is a **coin**. They are called **smart coins** because every coin has a Chialisp program associated with it. That program, known as a **puzzle**, decides how and when the coin can be spent, and what happens when it is.

**Key Concepts**:
- NFTs, CATs, and standard transactions are all defined using puzzles
- Puzzles can implement complex logic like time locks
- Every coin spend requires solving the puzzle with a valid solution

## Basic Password Example

### Simple Password Check

A basic password-protected coin example:

```clojure
(mod (password)
    (if (= password "hello")
        "Correct!"
        "Incorrect :("
    )
)
```

**Testing**:
```bash
brun "$(run password.clsp)" "(hello)"  # Returns: Correct!
brun "$(run password.clsp)" "(goodbye)" # Returns: Incorrect :(
```

### Currying for Flexibility

Instead of hardcoding passwords, use currying to make reusable puzzles:

```clojure
(mod (CORRECT_PASSWORD provided_password)
    (if (= CORRECT_PASSWORD provided_password)
        "Correct!"
        "Incorrect :("
    )
)
```

**Currying Convention**: Values expected to be curried in are often written in ALL_CAPS.

**Usage**:
```bash
cdv clsp curry password.clsp -a "hello"
# Returns compiled CLVM with password curried in
```

### Hashing for Security

Store password hashes instead of plaintext:

```clojure
(mod (PASSWORD_HASH password)
    (if (= (sha256 password) PASSWORD_HASH)
        "Correct!"
        "Incorrect :("
    )
)
```

**Hash Calculation**:
```bash
cdv hash "hello"
# Returns: 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
```

## Creating and Spending Coins

### Final Password Puzzle

Complete password-protected coin with conditions:

```clojure
(mod (PASSWORD_HASH password conditions)
    (include condition_codes.clib)
    
    (if (= (sha256 password) PASSWORD_HASH)
        conditions
        (x)
    )
)
```

### Key Steps

1. **Curry the Hash**:
   ```bash
   cdv clsp curry password.clsp -a 0x2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
   ```

2. **Get Puzzle Hash**:
   ```bash
   opc -H <curried_puzzle>
   ```

3. **Get Puzzle Reveal**:
   ```bash
   opc -c <curried_puzzle>
   ```

4. **Create the Coin**:
   ```bash
   chia wallet send -t <puzzle_hash> -a 0.01
   ```

### Spending the Coin

To spend, create a solution with:
- Password
- Conditions (e.g., CREATE_COIN to send funds)

**CREATE_COIN Condition**:
```
(51 <puzzle_hash> <amount>)
```

**Solution Format**:
```
('password' ((51 0x<recipient_puzzle_hash> <amount>)))
```

### Spend Bundle Structure

```json
{
  "coin_spends": [
    {
      "coin": {
        "amount": 10000000000,
        "parent_coin_info": "0x...",
        "puzzle_hash": "0x..."
      },
      "puzzle_reveal": "<puzzle_reveal_hex>",
      "solution": "<solution_hex>"
    }
  ],
  "aggregated_signature": "0xc00000..."
}
```

## Security Concerns

### Critical Issues with Password Puzzles

1. **Password is Revealed**
   - When spent, the password is visible in the solution
   - Anyone can see it on the blockchain
   - Compromises any reuse of the same password

2. **Spend Interception**
   - Farmers can modify transactions in the mempool
   - Without signatures, attackers can change the CREATE_COIN destination
   - Funds can be stolen by replacing the recipient address

**Important**: Password-based puzzles are educational only and should never be used for real value on mainnet.

## Chialisp Concepts

### Condition Codes

Common conditions used in puzzles:
- `51` (CREATE_COIN): Create a new coin
- `50` (AGG_SIG_ME): Require signature verification
- `70` (ASSERT_MY_COIN_ID): Assert the coin's ID
- `73` (ASSERT_MY_AMOUNT): Assert the coin's amount

### Solution and Puzzle Separation

- **Puzzle**: The program that defines spending rules
- **Solution**: The input data provided when spending
- **Puzzle Reveal**: The serialized puzzle needed for spending

### Currying Process

1. Original puzzle with parameters
2. Curry in values to create specialized puzzle
3. Calculate puzzle hash from curried puzzle
4. Use puzzle hash as coin address

## Best Practices

1. **Use Signatures**: Always require AGG_SIG_ME for security
2. **Validate Inputs**: Check all solution parameters
3. **Test Thoroughly**: Use simulator before mainnet
4. **Hash Sensitive Data**: Never store plaintext secrets

## Common Commands

### Development Tools

```bash
# Compile Chialisp to CLVM
run <puzzle.clsp>

# Execute CLVM with solution
brun "<puzzle>" "<solution>"

# Curry values into puzzle
cdv clsp curry <puzzle.clsp> -a <value>

# Calculate hash
cdv hash <value>

# Get puzzle hash
opc -H <puzzle>

# Get puzzle reveal  
opc -c <puzzle>

# Disassemble CLVM
opc '<clvm_hex>'
```

### RPC Commands

```bash
# Get coin records by puzzle hash
cdv rpc coinrecords --by puzzlehash "<puzzle_hash>"

# Push spend bundle
cdv rpc pushtx <spendbundle.json>
```

## Important Notes

- Always prefix hex values with `0x` in solutions
- Coin amounts are in mojos (1 XCH = 1,000,000,000,000 mojos)
- Network fees are typically 0.00005 XCH per spend
- Use PowerShell 7.3+ for proper nested quoting support

## References

- [Chia Docs - Smart Coins Guide](https://docs.chia.net/guides/crash-course/smart-coins/)
- Condition codes defined in `condition_codes.clib`
- Standard puzzles in Chia blockchain repository 