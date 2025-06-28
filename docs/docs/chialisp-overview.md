---
sidebar_position: 5
title: ChiaLisp Overview
---

# ChiaLisp Overview

ChiaLisp is the native smart contract language of the Chia blockchain. CoinScript compiles to ChiaLisp, so understanding the basics helps you debug and optimize your contracts.

## What is ChiaLisp?

ChiaLisp is a dialect of Lisp designed specifically for the Chia blockchain. It's:

- **Functional** - No mutable state within a single execution
- **Deterministic** - Same inputs always produce same outputs
- **Sandboxed** - Limited operations for security
- **Cost-tracked** - Every operation has a computational cost

## Basic Syntax

ChiaLisp uses S-expressions (symbolic expressions) with prefix notation:

### Atoms and Lists
```clsp
; Atoms (basic values)
42              ; number
0xdeadbeef      ; hex value
"hello"         ; string
foo             ; symbol

; Lists (everything else)
()              ; empty list (nil)
(1 2 3)         ; list of numbers
(+ 1 2)         ; function call: 1 + 2
```

### Functions
```clsp
; Function definition
(defun square (x)
  (* x x))

; Function call
(square 5)  ; returns 25

; Inline functions (more efficient)
(defun-inline double (x)
  (* x 2))
```

### Control Flow
```clsp
; If statement
(if (> x 10)
  "big"      ; then
  "small"    ; else
)

; Cond (multiple conditions)
(cond
  ((= x 1) "one")
  ((= x 2) "two")
  (1 "other"))  ; default case
```

## Common Operations

### List Operations
```clsp
(f (1 2 3))      ; first: returns 1
(r (1 2 3))      ; rest: returns (2 3)
(c 0 (1 2 3))    ; cons: returns (0 1 2 3)
(l (1 2 3))      ; listp: returns 1 (true)
```

### Arithmetic
```clsp
(+ 1 2 3)        ; addition: 6
(- 10 3)         ; subtraction: 7
(* 4 5)          ; multiplication: 20
(/ 20 4)         ; division: 5
```

### Comparison
```clsp
(= 5 5)          ; equal: 1 (true)
(> 10 5)         ; greater than: 1
(< 3 7)          ; less than: 1
(not 1)          ; logical not: () (false)
```

### Cryptographic
```clsp
(sha256 data)              ; SHA-256 hash
(sha256tree structure)     ; Merkle tree hash
(pubkey_for_exp sk msg)    ; BLS signature
```

## Conditions (Spend Outputs)

ChiaLisp puzzles return a list of conditions that tell the blockchain what to do:

```clsp
; Common conditions
(list
  (list 51 recipient amount)           ; CREATE_COIN
  (list 50 pubkey message)            ; AGG_SIG_ME
  (list 52 fee)                       ; RESERVE_FEE
  (list 72 expected_hash)             ; ASSERT_MY_PUZZLEHASH
  (list 80 timestamp)                 ; ASSERT_SECONDS_ABSOLUTE
)
```

With `condition_codes.clib` included:
```clsp
(list
  (list CREATE_COIN recipient amount)
  (list AGG_SIG_ME pubkey message)
  (list RESERVE_FEE fee)
)
```

## Module Structure

A ChiaLisp module (puzzle) has this structure:

```clsp
(mod (param1 param2 ...)  ; parameters from solution
  ; Includes
  (include condition_codes.clib)
  
  ; Constants
  (defconstant OWNER 0x123...)
  
  ; Functions
  (defun helper (x)
    (* x 2))
  
  ; Main body - returns conditions
  (list
    (list AGG_SIG_ME OWNER (sha256 param1))
    (list CREATE_COIN param1 param2)
  )
)
```

## CoinScript to ChiaLisp Mapping

Understanding how CoinScript compiles helps with debugging:

### Storage → Constants
```coinscript
storage address owner = 0x123...;
```
Becomes:
```clsp
(defconstant OWNER 0x123...)
```

### Actions → Functions
```coinscript
action transfer(address to, uint256 amount) {
  // ...
}
```
Becomes:
```clsp
(defun transfer (to amount)
  ; ...
)
```

### Requirements → Conditions
```coinscript
requireSignature(owner);
sendCoins(recipient, amount);
```
Becomes:
```clsp
(list
  (list AGG_SIG_ME owner message)
  (list CREATE_COIN recipient amount)
)
```

## Debugging Tips

### 1. Print Debugging
Use the `x` (raise/exception) operator to debug:
```clsp
(x value)  ; Prints value and fails
```

### 2. Check Types
```clsp
(l value)   ; Is it a list?
(not (l value))  ; Is it an atom?
```

### 3. Verify Conditions
Ensure your puzzle returns a proper list of conditions:
```clsp
; Good
(list
  (list CREATE_COIN addr amount)
)

; Bad - missing outer list
(list CREATE_COIN addr amount)
```

### 4. Cost Awareness
Complex operations are expensive:
- Prefer `defun-inline` for small functions
- Minimize list operations in loops
- Pre-calculate when possible

## Common Patterns

### Signature Validation
```clsp
(list AGG_SIG_ME 
  pubkey 
  (sha256tree (list puzzle_hash amount)))
```

### Multi-condition Output
```clsp
(c
  (list CREATE_COIN addr1 amount1)
  (c
    (list CREATE_COIN addr2 amount2)
    (list
      (list RESERVE_FEE fee)
    )
  )
)
```

### Conditional Execution
```clsp
(if condition
  (list (list CREATE_COIN addr amount))
  (x "Condition not met")
)
```

## Resources

- **ChiaLisp Primer**: Basic language introduction
- **CLVM Documentation**: Virtual machine details
- **Condition Codes**: Full list of blockchain conditions
- **Standard Puzzles**: Common patterns and examples

## Summary

While CoinScript abstracts away ChiaLisp complexity, understanding the compilation target helps you:

1. **Debug issues** by reading generated code
2. **Optimize performance** by understanding costs
3. **Integrate with existing** ChiaLisp code
4. **Extend functionality** with custom ChiaLisp

Remember: CoinScript handles the complexity so you can focus on logic, but ChiaLisp knowledge helps you become a power user! 