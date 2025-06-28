# ChiaLisp Validity Guide

This guide documents the valid ChiaLisp patterns used by the Chia Puzzle Framework, based on analysis of Yakuhito's slot-machine patterns and standard ChiaLisp conventions.

## Key Patterns

### 1. Failure Handling

#### Unconditional Failure
```clsp
(x)  ; Correct - causes program to stop/fail
```

**NOT:**
```clsp
(assert 0)     ; Incorrect
(assert "0")   ; Incorrect
```

The `(x)` operator is used to unconditionally fail/stop the program. This is seen throughout the training files:
- `action.clsp` line 57: `(x)` when verification fails
- `add_incentives.clsp` line 59: `(x)` in else branch when conditions aren't met
- Many other action files use `(x)` for failure cases

#### Conditional Assertions
```clsp
(assert condition)  ; Fails if condition is false
```

Used for validating conditions that must be true to continue execution.

### 2. Empty/Nil Returns

```clsp
()  ; Empty list/nil
```

Used for:
- Empty return values
- Empty else branches that don't fail
- Nil/empty list representation

### 3. Control Flow

#### If-Then-Else
```clsp
(if condition
    then_branch
    else_branch)
```

- All branches must be present
- Use `()` for empty branch that returns nil
- Use `(x)` for branch that should fail

#### Nested Control Flow
```clsp
(if condition1
    (if condition2
        action1
        action2)
    action3)
```

### 4. Condition Codes

Common condition codes used:
- `51` - CREATE_COIN
- `50` - AGG_SIG_ME
- `60` - CREATE_COIN_ANNOUNCEMENT
- `70` - ASSERT_MY_PUZZLEHASH
- `74` - ASSERT_MY_COIN_ID
- `80` - ASSERT_SECONDS_RELATIVE
- `82` - ASSERT_HEIGHT_RELATIVE
- `83` - ASSERT_BEFORE_SECONDS_RELATIVE

### 5. List Operations

#### Cons (List Building)
```clsp
(c element rest_of_list)  ; Prepend element to list
```

#### Creating Lists
```clsp
(list elem1 elem2 elem3)  ; Create list with elements
```

### 6. Boolean Operations

#### AND Operations
```clsp
(all condition1 condition2 ...)  ; All must be true
```

#### OR Operations
```clsp
(any condition1 condition2 ...)  ; At least one must be true
```

### 7. Common Functions

From training files:
- `(sha256 value)` - SHA256 hash
- `(sha256tree value)` - Merkle tree hash
- `(= a b)` - Equality check
- `(> a b)` - Greater than
- `(>s a b)` - Greater than for strings/bytes
- `(not value)` - Logical NOT
- `(+ a b)` - Addition
- `(- a b)` - Subtraction
- `(* a b)` - Multiplication
- `(/ a b)` - Division

### 8. Module Structure

```clsp
(mod (param1 param2)
    (include library.clib)
    
    ; Module body
    expression
)
```

### 9. Include Statements

```clsp
(include condition_codes.clib)
(include sha256tree.clib)
(include curry.clib)
```

## CoinScript to ChiaLisp Mapping

| CoinScript | ChiaLisp |
|------------|----------|
| `require(condition, "message")` | `(assert condition)` |
| `send(to, amount)` | `(51 to amount)` |
| `send(to, amount, memo)` | `(51 to amount memo)` |
| `emit Event()` | `(60 announcement_data)` |
| Unknown action | `(x)` |
| Empty return | `()` |
| `if (cond) { a } else { b }` | `(if cond a b)` |
| `a && b` | `(all a b)` |
| `a || b` | `(any a b)` |
| `!a` | `(not a)` |

## Common Mistakes to Avoid

1. **Using `assert 0` instead of `(x)`** - Always use `(x)` for unconditional failure
2. **Missing else branches** - ChiaLisp `if` requires both then and else branches
3. **Incorrect nil representation** - Use `()` not `null` or `nil`
4. **String vs hex confusion** - Addresses and hashes should be hex (0x...)
5. **Missing parentheses** - ChiaLisp is fully parenthesized

## Validation Checklist

When generating ChiaLisp:
- ✓ Use `(x)` for failures, not `assert 0`
- ✓ Use `()` for empty/nil returns
- ✓ All `if` statements have both branches
- ✓ Condition codes are numeric (51, 60, etc.)
- ✓ Hex values start with `0x`
- ✓ Lists built with `(c ...)` or `(list ...)`
- ✓ Boolean ops use `(all ...)` and `(any ...)`
- ✓ Includes come after mod parameters 