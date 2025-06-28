# ChiaLisp Include Functions Reference

This document lists all functions available from ChiaLisp include files that can be used in CoinScript and the Chia Puzzle Framework.

## sha256tree.clib

### sha256tree
Calculate the tree hash of a value. This is used to calculate puzzle hashes.

**ChiaLisp:** `(sha256tree value)`  
**CoinScript:** `sha256tree(value)`

```javascript
// Example in CoinScript
bytes32 puzzle_hash = sha256tree(my_puzzle);
```

## curry-and-treehash.clinc

### puzzle-hash-of-curried-function
Calculate the hash of a curried puzzle without actually performing the curry operation.

**ChiaLisp:** `(puzzle-hash-of-curried-function function-hash param1 param2 ...)`  
**CoinScript:** `puzzle_hash_of_curried_function(function_hash, param1, param2, ...)`

### tree-hash-of-apply
Calculate the tree hash of applying a function to an environment.

**ChiaLisp:** `(tree-hash-of-apply function-hash environment-hash)`  
**CoinScript:** `tree_hash_of_apply(function_hash, environment_hash)`

### update-hash-for-parameter-hash
Update an environment hash with a new parameter (used internally by currying).

**ChiaLisp:** `(update-hash-for-parameter-hash parameter-hash environment-hash)`  
**CoinScript:** `update_hash_for_parameter_hash(parameter_hash, environment_hash)`

### build-curry-list
Build a curry list from reversed parameter hashes (used internally).

**ChiaLisp:** `(build-curry-list reversed-curry-parameter-hashes environment-hash)`  
**CoinScript:** `build_curry_list(reversed_params, env_hash)`

## singleton_truths.clib

Functions for extracting data from singleton truth structures.

### truth_data_to_truth_struct
Create a truth struct from individual components.

**ChiaLisp:** `(truth-data-to-truth-struct my-id full-puzhash innerpuzhash my-amount lineage-proof singleton-struct)`  
**CoinScript:** `truth_data_to_truth_struct(my_id, full_puzhash, innerpuzhash, my_amount, lineage_proof, singleton_struct)`

### Extraction Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `my_id_truth(truths)` | Extract coin ID | bytes32 |
| `my_full_puzzle_hash_truth(truths)` | Extract full puzzle hash | bytes32 |
| `my_inner_puzzle_hash_truth(truths)` | Extract inner puzzle hash | bytes32 |
| `my_amount_truth(truths)` | Extract amount | uint256 |
| `my_lineage_proof_truth(truths)` | Extract lineage proof | proof structure |
| `singleton_struct_truth(truths)` | Extract singleton struct | struct |
| `singleton_mod_hash_truth(truths)` | Extract singleton mod hash | bytes32 |
| `singleton_launcher_id_truth(truths)` | Extract launcher ID | bytes32 |
| `singleton_launcher_puzzle_hash_truth(truths)` | Extract launcher puzzle hash | bytes32 |

### Lineage Proof Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `parent_info_for_lineage_proof(proof)` | Extract parent info | bytes32 |
| `puzzle_hash_for_lineage_proof(proof)` | Extract puzzle hash | bytes32 |
| `amount_for_lineage_proof(proof)` | Extract amount | uint256 |
| `is_not_eve_proof(proof)` | Check if not eve proof | bool |
| `parent_info_for_eve_proof(proof)` | Extract parent for eve | bytes32 |
| `amount_for_eve_proof(proof)` | Extract amount for eve | uint256 |

## cat_truths.clib

Functions for CAT (Chia Asset Token) truth structures.

### cat_truth_data_to_truth_struct
Create a CAT truth struct.

**ChiaLisp:** `(cat-truth-data-to-truth-struct innerpuzhash cat-struct my-id this-coin-info)`  
**CoinScript:** `cat_truth_data_to_truth_struct(innerpuzhash, cat_struct, my_id, this_coin_info)`

### CAT Truth Extraction Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `my_inner_puzzle_hash_cat_truth(truths)` | Extract inner puzzle hash | bytes32 |
| `cat_struct_truth(truths)` | Extract CAT struct | struct |
| `my_id_cat_truth(truths)` | Extract coin ID | bytes32 |
| `my_coin_info_truth(truths)` | Extract coin info | info structure |
| `my_amount_cat_truth(truths)` | Extract amount | uint256 |
| `my_full_puzzle_hash_cat_truth(truths)` | Extract full puzzle hash | bytes32 |
| `my_parent_cat_truth(truths)` | Extract parent | bytes32 |

### CAT Mod Structure Functions

| Function | Description | Returns |
|----------|-------------|---------|
| `cat_mod_hash_truth(truths)` | Extract CAT mod hash | bytes32 |
| `cat_mod_hash_hash_truth(truths)` | Extract CAT mod hash hash | bytes32 |
| `cat_tail_program_hash_truth(truths)` | Extract TAIL program hash | bytes32 |

## utility_macros.clib

Utility macros for cleaner ChiaLisp code.

### assert
Assert that a condition is true, otherwise fail.

**ChiaLisp:** `(assert condition)`  
**CoinScript:** `assert(condition)` or `require(condition)`

```javascript
// CoinScript example
assert(amount > 0);
require(recipient != 0x0, "Invalid recipient");
```

### or
Logical OR macro - returns 1 if any argument is true, 0 otherwise.

**ChiaLisp:** `(or arg1 arg2 ...)`  
**CoinScript:** Not directly supported - use `||` operator

### and
Logical AND macro - returns 1 if all arguments are true, () otherwise.

**ChiaLisp:** `(and arg1 arg2 ...)`  
**CoinScript:** Not directly supported - use `&&` operator

## Usage in CoinScript

To use these functions in CoinScript:

1. **Include the library** (can be automatic or manual):
   ```coinscript
   include "sha256tree.clib"
   include "singleton_truths.clib"
   ```

2. **Call the function** using snake_case naming:
   ```coinscript
   coin MyContract {
     action process(bytes32 truths) {
       // Extract values from singleton truths
       address coin_id = my_id_truth(truths);
       uint256 amount = my_amount_truth(truths);
       bytes32 inner_hash = my_inner_puzzle_hash_truth(truths);
       
       // Use sha256tree to calculate hash
       bytes32 hash = sha256tree(some_data);
     }
   }
   ```

3. **Automatic includes**: The framework will automatically include necessary files when it detects function usage.

## Best Practices

1. **Use descriptive variable names** when extracting from truth structures
2. **Check return values** - some functions may return nil/empty values
3. **Include files explicitly** if you want to ensure functions are available
4. **Use assert macro** for cleaner validation code instead of manual if/x patterns
5. **Prefer built-in CoinScript features** when available (e.g., `require()` over manual `assert()`)

## Naming Conventions

- **ChiaLisp**: Uses kebab-case (e.g., `my-id-truth`)
- **CoinScript**: Uses snake_case (e.g., `my_id_truth`)
- The framework automatically converts between naming styles

## Common Patterns

### Singleton Processing
```coinscript
action processSingleton(bytes32 truths, address recipient) {
  uint256 amount = my_amount_truth(truths);
  bytes32 launcher = singleton_launcher_id_truth(truths);
  
  require(amount > MIN_AMOUNT, "Amount too small");
  sendCoins(recipient, amount - FEE);
}
```

### Hash Verification
```coinscript
action verifyPuzzle(bytes32 puzzle_data, bytes32 expected_hash) {
  bytes32 actual_hash = sha256tree(puzzle_data);
  require(actual_hash == expected_hash, "Hash mismatch");
}
```

### CAT Token Handling
```coinscript
action processCAT(bytes32 cat_truths) {
  uint256 amount = my_amount_cat_truth(cat_truths);
  bytes32 tail_hash = cat_tail_program_hash_truth(cat_truths);
  
  // Validate and process CAT token
  require(tail_hash == APPROVED_TAIL, "Invalid CAT");
  sendCoins(TREASURY, amount);
}
``` 