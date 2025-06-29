# ChiaLisp Syntax and Development Patterns Reference

This reference documents ChiaLisp syntax patterns and best practices discovered from analyzing professional ChiaLisp code in the Chia ecosystem.

## Table of Contents
1. [Module Structure](#module-structure)
2. [Include System](#include-system)
3. [Function Definitions](#function-definitions)
4. [Common Patterns](#common-patterns)
5. [Condition Codes](#condition-codes)
6. [Currying and Tree Hashing](#currying-and-tree-hashing)
7. [State Management](#state-management)
8. [Security Patterns](#security-patterns)
9. [Best Practices](#best-practices)

## Module Structure

### Basic Module Definition
```lisp
(mod (parameter1 parameter2 ...)
    ; includes
    (include condition_codes.clib)
    
    ; function definitions
    (defun function_name (params) body)
    
    ; main logic
    (main_expression)
)
```

### Parameter Patterns

#### Simple Parameters
```lisp
(mod (PUBKEY AMOUNT solution)
    ; ...
)
```

#### Curried Parameters (Convention: UPPERCASE)
```lisp
(mod (
    MOD_HASH                 ; curried into puzzle
    TAIL_PROGRAM_HASH        ; curried into puzzle
    INNER_PUZZLE             ; curried into puzzle
    inner_puzzle_solution    ; runtime parameter
)
    ; ...
)
```

#### Destructured Parameters with @ Binding
```lisp
(mod (
    (@ DID_SINGLETON_STRUCT (SINGLETON_MOD_HASH DID_LAUNCHER_ID . SINGLETON_LAUNCHER_HASH))
    NFT_STATE_LAYER_MOD_HASH
    (@ Current_State (total_reserves active_shares Reward_Info Round_Time_Info))
)
    ; ...
)
```

## Include System

### Standard Library Includes
```lisp
; Core condition codes for spend conditions
(include condition_codes.clib)

; SHA256 tree hashing utilities
(include sha256tree.clib)

; Currying and puzzle hash calculation
(include curry-and-treehash.clinc)

; Common macros (assert, or, and)
(include utility_macros.clib)

; Singleton-specific utilities
(include singleton_truths.clib)

; CAT-specific utilities
(include cat_truths.clib)

; Opcode constants
(include opcodes.clib)
```

### Custom Library Includes (Project-Specific)
```lisp
; Currying utilities
(include curry.clib)

; Slot management utilities
(include slots.clib)

; Merkle tree utilities
(include merkle_utils.clib)

; Handle registration utilities
(include xchandles.clib)

; NFT security utilities
(include secure_nft.clib)
```

## Function Definitions

### Basic Function
```lisp
(defun function_name (param1 param2)
    (+ param1 param2)
)
```

### Inline Function (Optimization)
```lisp
(defun-inline calculate_hash (value)
    (sha256 1 value)
)
```

### Recursive Function
```lisp
(defun flatten_list (((@ first_thing (first_cond . remaining_conds)) . the_rest))
    (if first_thing
        (c first_cond (flatten_list (c remaining_conds the_rest)))
        (if the_rest
            (flatten_list the_rest)
            ()
        )
    )
)
```

### Function with Complex Destructuring
```lisp
(defun check_messages_from_identities (
    SINGLETON_STRUCT 
    num_verifications_required 
    identities 
    my_id  
    new_puz 
    parent_innerpuzhash_amounts_for_recovery_ids 
    pubkey 
    num_verifications
)
    ; function body
)
```

## Common Patterns

### Conditional Logic
```lisp
; Simple if-then-else
(if condition
    then_expression
    else_expression
)

; Multiple conditions with assert macro
(assert condition1 condition2 condition3
    final_expression
)

; Nested conditions
(if (= mode 0)
    (handle_mode_0)
    (if (= mode 1)
        (handle_mode_1)
        (x) ; raise exception
    )
)
```

### List Construction
```lisp
; Creating conditions list
(list
    (list CREATE_COIN puzzle_hash amount)
    (list AGG_SIG_ME pubkey message)
    (list ASSERT_MY_COIN_ID my_id)
)

; Cons cell construction
(c first_element rest_of_list)

; Quoted list
(q . (1 2 3))
```

### Pattern Matching with Destructuring
```lisp
; Destructuring in function parameters
(defun process_payment ((puzzle_hash amount . rest))
    (list CREATE_COIN puzzle_hash amount)
)

; @ binding for complex structures
(@ structure_name (field1 field2 . rest))
```

## Condition Codes

### Common Spend Conditions
```lisp
; Create a new coin
(list CREATE_COIN puzzle_hash amount)
(list CREATE_COIN puzzle_hash amount hint_list)

; Signature requirements
(list AGG_SIG_ME pubkey message)
(list AGG_SIG_UNSAFE pubkey message)

; Announcements
(list CREATE_COIN_ANNOUNCEMENT message)
(list ASSERT_COIN_ANNOUNCEMENT announcement_id)
(list CREATE_PUZZLE_ANNOUNCEMENT message)
(list ASSERT_PUZZLE_ANNOUNCEMENT announcement_id)

; Self-assertions
(list ASSERT_MY_COIN_ID coin_id)
(list ASSERT_MY_PARENT_ID parent_id)
(list ASSERT_MY_PUZZLEHASH puzzle_hash)
(list ASSERT_MY_AMOUNT amount)

; Time locks
(list ASSERT_SECONDS_RELATIVE seconds)
(list ASSERT_SECONDS_ABSOLUTE timestamp)
(list ASSERT_HEIGHT_RELATIVE blocks)
(list ASSERT_HEIGHT_ABSOLUTE height)

; Special: melt coin
(list CREATE_COIN () -113)
```

### Custom Condition Codes (Negative Numbers)
```lisp
(defconstant NEW_OWNER_CONDITION -10)
(defconstant METADATA_UPDATE_CONDITION -24)
```

## Currying and Tree Hashing

### Puzzle Hash Calculation
```lisp
; Using curry_hashes for efficient currying
(curry_hashes MOD_HASH
    (sha256tree param1)
    (sha256 1 param2)
    param3_hash
)

; Inline currying
(curry_hashes_inline MOD_HASH
    (sha256tree SINGLETON_STRUCT)
    inner_puzzle_hash
)

; Tree hashing
(sha256tree any_clvm_structure)
(sha256tree1 structure) ; Alternative implementation
```

### Calculating Coin IDs
```lisp
(coinid parent_id puzzle_hash amount)

; Or manually:
(sha256 parent_id puzzle_hash amount)
```

## State Management

### State Structure Pattern
```lisp
; Common state tuple structure
(mod (
    (Ephemeral_State . Current_State)
    action_solution
)
    ; Return ((new_ephemeral_state . new_state) . conditions)
)
```

### Singleton State Pattern
```lisp
; State stored in singleton
(@ Current_State 
    (
        total_reserves
        active_shares
        (@ Reward_Info (cumulative_payout . remaining_rewards))
        (@ Round_Time_Info (last_update . epoch_end))
    )
)
```

### State Update Pattern
```lisp
; Creating new state
(list
    (+ Ephemeral_State 1)  ; increment ephemeral counter
    total_reserves         ; unchanged
    (+ active_shares 1)    ; increment shares
    Reward_Info           ; unchanged
    Round_Time_Info       ; unchanged
)
```

## Security Patterns

### Announcement Security
```lisp
; Create unique announcement with security prefix
(defconstant ANNOUNCEMENT_PREFIX 0xad4c)

(list CREATE_PUZZLE_ANNOUNCEMENT 
    (concat ANNOUNCEMENT_PREFIX (sha256tree data))
)

; Assert announcement with verification
(list ASSERT_PUZZLE_ANNOUNCEMENT
    (sha256 source_puzzle_hash announcement_data)
)
```

### Singleton Security
```lisp
; Verify parent is a singleton
(defun is_parent_cat (cat_mod_struct parent_id lineage_proof)
    (= parent_id
        (calculate_coin_id 
            (f lineage_proof)
            (cat_puzzle_hash cat_mod_struct (f (r lineage_proof)))
            (f (r (r lineage_proof)))
        )
    )
)
```

### Amount Validation
```lisp
; Ensure odd amounts for singletons
(assert (logand my_amount 1)
    ; main logic
)

; Validate positive amounts
(assert (> amount 0)
    ; continue
)
```

## Best Practices

### 1. **Naming Conventions**
- UPPERCASE for curried/constant parameters
- lowercase for runtime parameters
- snake_case for functions
- Descriptive names for complex structures

### 2. **Documentation**
```lisp
; module_name.clsp by author
;; High-level description of puzzle functionality
;; Warning: Important security considerations

(mod (params)
    ; Implementation
)
```

### 3. **Error Handling**
```lisp
; Explicit error with (x)
(if invalid_condition
    (x)  ; raise exception
    ; continue
)

; Assert pattern for multiple validations
(assert 
    (> amount 0)
    (= (strlen pubkey) 48)
    (not (= sender receiver))
    ; main logic if all pass
)
```

### 4. **Efficient Condition List Building**
```lisp
; Use helper functions to build conditions
(defun add_announcement_assert_and_create_security_condition (ann conditions)
    (c
        (list ASSERT_PUZZLE_ANNOUNCEMENT ann)
        (c
            (list CREATE_PUZZLE_ANNOUNCEMENT ann)
            conditions
        )
    )
)
```

### 5. **Constants Definition**
```lisp
(defconstant TEN_THOUSAND 10000)
(defconstant RING_MORPH_BYTE 0xcb)
(defconstant MAX_UINT64 0xffffffffffffffff)
```

### 6. **Puzzle Composition**
```lisp
; Layer puzzles using curry pattern
(defun-inline calculate_full_puzzle_hash (OUTER_MOD inner_puzzle_hash)
    (puzzle-hash-of-curried-function 
        OUTER_MOD
        inner_puzzle_hash
        (sha256tree additional_params)
    )
)
```

### 7. **Truth Structures**
```lisp
; Pass contextual information as "truths"
(defun-inline truth_data_to_truth_struct (my_id full_puzhash innerpuzhash my_amount lineage_proof singleton_struct)
    (c (c my_id full_puzhash) 
       (c (c innerpuzhash my_amount) 
          (c lineage_proof singleton_struct)))
)
```

### 8. **Macro Usage**
```lisp
; Define reusable macros for common patterns
(defmacro assert items
    (if (r items)
        (list if (f items) (c assert (r items)) (q . (x)))
        (f items)
    )
)
```

### 9. **Optimization Techniques**
- Use `defun-inline` for small, frequently called functions
- Pre-calculate hashes when possible
- Minimize tree traversals
- Use efficient list construction with cons cells

### 10. **Testing Patterns**
```lisp
; Include test conditions in development
(if DEBUG_MODE
    (list (list REMARK (concat "State: " (sha256tree state))))
    ()
)
```

## Common Design Patterns

### 1. **Singleton Pattern**
Used for unique on-chain entities (NFTs, DIDs, etc.)

### 2. **Layer Pattern**
Composing functionality through nested puzzles

### 3. **Offer/Settlement Pattern**
Atomic swaps and complex transactions

### 4. **Oracle Pattern**
External data verification on-chain

### 5. **Delegation Pattern**
Allowing authorized parties to perform actions

### 6. **Time-Lock Pattern**
Conditions based on time or block height

### 7. **Multi-Sig Pattern**
Requiring multiple signatures for operations

### 8. **State Machine Pattern**
Managing complex state transitions in puzzles

This reference guide represents patterns and practices observed across professional ChiaLisp development. These patterns form the foundation for building secure and efficient Chia blockchain applications. 