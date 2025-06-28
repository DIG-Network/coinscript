# Automatic Include Files in ChiaLisp Generation

The Chia Puzzle Framework now automatically detects which ChiaLisp features you're using and includes the necessary `.clib` files. This makes the generated ChiaLisp cleaner, more readable, and follows standard patterns used in the Chia ecosystem.

## Overview

When generating ChiaLisp output, the framework:
1. **Tracks feature usage** - Detects which opcodes, functions, and macros you use
2. **Auto-includes required files** - Automatically adds necessary include statements
3. **Uses symbolic constants** - When includes are present, uses names like `CREATE_COIN` instead of numeric opcodes like `51`

## Available Include Files

### `condition_codes.clib`
Provides symbolic names for all condition opcodes:
- `CREATE_COIN` (51)
- `AGG_SIG_ME` (50)
- `RESERVE_FEE` (52)
- `ASSERT_MY_PUZZLEHASH` (72)
- And many more...

### `utility_macros.clib`
Provides useful macros:
- `assert` - Clean assertion syntax
- `or` - Logical OR macro
- `and` - Logical AND macro

### `sha256tree.clib`
Provides:
- `sha256tree` - Calculate puzzle hash from a tree

### `curry-and-treehash.clinc`
Provides currying utilities:
- `puzzle-hash-of-curried-function`
- `tree-hash-of-apply`
- And related functions

### `singleton_truths.clib`
Provides singleton-related functions for working with singleton coins.

### `cat_truths.clib`
Provides CAT (Chia Asset Token) related functions.

## Usage Examples

### Basic Example - Auto-Include
```javascript
const puzzle = new PuzzleBuilder()
  .withMod()
  .withSolutionParams('recipient', 'amount')
  .createCoin('recipient', 'amount')  // Auto-detects CREATE_COIN usage
  .requireSignature('0xpubkey')       // Auto-detects AGG_SIG_ME usage
  .reserveFee(100);                   // Auto-detects RESERVE_FEE usage

// Generated ChiaLisp:
// (mod (recipient amount)
//   (include condition_codes.clib)
//   (c (CREATE_COIN recipient amount) 
//      (c (AGG_SIG_ME 0xpubkey (sha256tree1 "1")) 
//         (c (RESERVE_FEE 100) "()"))))
```

### Using Assert Macro
```javascript
const puzzle = new PuzzleBuilder()
  .withMod()
  .withSolutionParams('amount')
  .includeUtilityMacros()  // Manual include for assert macro
  .require(puzzle().param('amount').greaterThan(100))
  .createCoin('0xrecipient', 'amount');

// Generated ChiaLisp:
// (mod amount
//   (include utility_macros.clib)
//   (include condition_codes.clib)
//   (c (assert (> amount 100)) 
//      (c (CREATE_COIN 0xrecipient amount) "()")))
```

### Manual Include Override
You can manually include files, which ensures they're included even if not auto-detected:

```javascript
const puzzle = new PuzzleBuilder()
  .withMod()
  .includeConditionCodes()    // Manual include
  .includeUtilityMacros()     // Manual include
  .withSolutionParams('amount')
  // ... rest of puzzle logic
```

## Benefits

1. **Cleaner Output** - Uses symbolic constants instead of magic numbers
2. **Standard Patterns** - Follows conventions used in official Chia puzzles
3. **Automatic Detection** - No need to remember which includes you need
4. **Override Control** - Can still manually include files when needed
5. **Smaller Code** - Reuses standard macros and functions instead of reimplementing

## Implementation Details

The framework maintains an index of all available includes and their exports:
- Constants (e.g., `CREATE_COIN = 51`)
- Functions (e.g., `sha256tree`)
- Macros (e.g., `assert`)

During code generation, it tracks which features are used and determines the minimal set of includes needed.

## Best Practices

1. **Let auto-detection work** - In most cases, you don't need manual includes
2. **Use symbolic names** - When writing custom ChiaLisp, use names like `CREATE_COIN` instead of `51`
3. **Include utility macros for complex logic** - The `assert`, `or`, and `and` macros make code cleaner
4. **Check generated output** - Verify the includes and symbolic names are as expected

## CoinScript Integration

When compiling CoinScript to ChiaLisp, the auto-include functionality works seamlessly:

```javascript
// CoinScript
coin PaymentCoin {
  action send(address recipient, uint256 amount) {
    sendCoins(recipient, amount);     // Auto-includes condition_codes.clib
    requireSignature(OWNER_PUBKEY);   // Uses AGG_SIG_ME
  }
}

// Generated ChiaLisp will automatically include condition_codes.clib
// and use CREATE_COIN and AGG_SIG_ME symbolic names
```

## Troubleshooting

If symbolic names aren't being used:
1. Check if the feature is being tracked (see `featuresUsed` in code generation)
2. Verify the include file path is correct
3. Ensure the opcode is in the condition code mapping

If includes are missing:
1. Check if the feature detection is working
2. You can always manually include files as a fallback
3. Verify the include file exists in the expected location 