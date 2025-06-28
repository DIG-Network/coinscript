# Using Include Functions in CoinScript

CoinScript provides access to all standard ChiaLisp functions through include files. This allows you to leverage the full power of the Chia ecosystem's standard libraries.

## Quick Start

```coinscript
// Automatic includes - functions are detected and includes added
coin MyContract {
  action hash_data(bytes32 data) {
    bytes32 hash = sha256tree(data);  // Auto-includes sha256tree.clib
    require(hash == EXPECTED_HASH);
    sendCoins(RECIPIENT, 1000);
  }
}

// Manual includes - explicitly include libraries
include "singleton_truths.clib"
include "utility_macros.clib"

coin SingletonProcessor {
  action process(bytes32 truths) {
    // Extract data from singleton truths
    address coin_id = my_id_truth(truths);
    uint256 amount = my_amount_truth(truths);
    
    // Use assert macro
    assert(amount > MIN_AMOUNT);
    
    sendCoins(TREASURY, amount);
  }
}
```

## Available Functions

### Core Hashing
- `sha256tree(value)` - Calculate tree hash (puzzle hash)

### Singleton Operations
- `my_id_truth(truths)` - Extract coin ID
- `my_amount_truth(truths)` - Extract amount
- `my_inner_puzzle_hash_truth(truths)` - Extract inner puzzle hash
- `singleton_launcher_id_truth(truths)` - Extract launcher ID
- And many more...

### CAT Token Operations
- `my_amount_cat_truth(truths)` - Extract CAT amount
- `cat_tail_program_hash_truth(truths)` - Extract TAIL program hash
- And more CAT-specific functions...

### Currying Operations
- `puzzle_hash_of_curried_function(hash, params...)` - Calculate curried puzzle hash
- `tree_hash_of_apply(func_hash, env_hash)` - Calculate application hash

### Utility Macros
- `assert(condition)` - Clean assertion (available via `require()`)
- `or(args...)` - Logical OR
- `and(args...)` - Logical AND

## How It Works

1. **Automatic Detection**: When you use a function like `sha256tree()`, CoinScript detects it and automatically includes the necessary .clib file.

2. **Name Conversion**: CoinScript uses snake_case (`my_id_truth`) which gets converted to ChiaLisp's kebab-case (`my-id-truth`).

3. **Type Safety**: Functions have known return types, enabling type checking in CoinScript.

4. **Compilation**: The functions are compiled as ChiaLisp function calls in the output.

## Example: Singleton State Machine

```coinscript
include "singleton_truths.clib"

coin SingletonStateMachine {
  storage uint256 MIN_AMOUNT = 1000;
  storage address AUTHORIZED_SPENDER = 0xabcdef;
  
  const uint256 FEE = 100;
  
  action update_state(bytes32 truths, bytes32 new_state) {
    // Extract current state from singleton
    address current_id = my_id_truth(truths);
    uint256 current_amount = my_amount_truth(truths);
    bytes32 inner_hash = my_inner_puzzle_hash_truth(truths);
    
    // Validate conditions
    require(current_amount >= MIN_AMOUNT, "Insufficient amount");
    requireSignature(AUTHORIZED_SPENDER);
    
    // Create new singleton with updated state
    sendCoins(inner_hash, current_amount - FEE);
    
    // Emit event with new state
    emit StateUpdated(current_id, new_state);
  }
}
```

## Best Practices

1. **Let auto-detection work** - In most cases, you don't need manual includes
2. **Use manual includes for clarity** - When heavily using functions from a specific library
3. **Check function signatures** - Ensure you're passing the right number and types of arguments
4. **Handle nil returns** - Some functions may return empty values
5. **Use CoinScript features** - Prefer `require()` over manual `assert()` calls

## Troubleshooting

**Function not found**: Ensure the function name is spelled correctly (use snake_case in CoinScript).

**Include not working**: Check that the .clib file path is correct.

**Type errors**: Verify the function returns the expected type.

**Compilation errors**: The function might need specific parameters or context.

## See Also

- [Complete Include Functions Reference](./include-functions-reference.md)
- [Auto-Includes Guide](./auto-includes-guide.md)
- [ChiaLisp Include Index](../src/chialisp/includeIndex.ts) 