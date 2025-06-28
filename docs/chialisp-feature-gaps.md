# CoinScript Chialisp Feature Gaps

This document tracks ChiaLisp features that need to be implemented in CoinScript to ensure complete compatibility.

## ✅ Implemented Features

### Arithmetic Operations
- **Addition (+)** - ✅ Implemented
- **Subtraction (-)** - ✅ Implemented
- **Multiplication (*)** - ✅ Implemented
- **Division (/)** - ✅ Implemented
- **Modulo (%)** - ✅ Implemented - uses `(r (divmod a b))` pattern

### Comparison Operations
- **Greater than (>)** - ✅ Implemented
- **Less than (<)** - ✅ Implemented (converted to `>` with swapped operands)
- **Equals (=)** - ✅ Implemented
- **Not equals (!=)** - ✅ Implemented as `(not (= a b))`
- **String comparison (>s)** - ✅ Implemented

### Logical Operations
- **And (all)** - ✅ Implemented as `&&`
- **Or (any)** - ✅ Implemented as `||`
- **Not (not)** - ✅ Implemented as `!`
- **all() function** - ✅ Implemented
- **any() function** - ✅ Implemented

### Bitwise Operations
- **Bitwise AND (logand)** - ✅ Implemented as `&`
- **Bitwise OR (logior)** - ✅ Implemented as `|`
- **Bitwise XOR (logxor)** - ✅ Implemented as `^`
- **Bitwise NOT (lognot)** - ✅ Implemented as `~`
- **Left shift (lsh)** - ✅ Implemented as `<<`
- **Right shift (ash)** - ✅ Implemented as `>>`

### List Operations
- **First (f)** - ✅ Implemented as `first()` or `f()`
- **Rest (r)** - ✅ Implemented as `rest()` or `r()`
- **Cons (c)** - ✅ Implemented as `cons()` or `c()`
- **List predicate (l)** - ✅ Implemented as `listp()` or `l()`

### String Operations
- **concat** - ✅ Implemented
- **strlen** - ✅ Implemented
- **substr** - ✅ Implemented

### Cryptographic Operations
- **sha256** - ✅ Implemented
- **sha256tree** - ✅ Implemented (with auto-include)
- **keccak256** - ✅ Implemented
- **coinid** - ✅ Implemented

### BLS Operations
- **point_add** - ✅ Implemented
- **pubkey_for_exp** - ✅ Implemented
- **g1_add** - ✅ Implemented
- **bls_verify** - ✅ Implemented

### Evaluation Control
- **quote (q)** - ✅ Implemented
- **apply (a)** - ✅ Implemented

### Condition Codes
- **CREATE_COIN** - ✅ Implemented via `send()`
- **AGG_SIG_ME** - ✅ Implemented via `require(msg.sender == pubkey)`
- **ASSERT_MY_AMOUNT** - ✅ Implemented via `assertMyAmount()`
- **ASSERT_MY_PARENT_ID** - ✅ Implemented via `assertMyParentId()`
- **CREATE_PUZZLE_ANNOUNCEMENT** - ✅ Implemented via `createPuzzleAnnouncement()`
- **ASSERT_PUZZLE_ANNOUNCEMENT** - ✅ Implemented via `assertPuzzleAnnouncement()`

## ⚠️ Partially Implemented Features

### Variable Declarations
- **let bindings** - ⚠️ Partially implemented
  - Variables can be declared with `let` but need proper let-binding generation
  - Current implementation tracks variables but doesn't generate proper ChiaLisp let expressions

### List Literals
- **List syntax** - ⚠️ Needs implementation
  - `(1 2 3)` syntax not recognized by parser
  - Need to add list literal support to tokenizer and parser

## ❌ Not Yet Implemented

### Advanced Features
1. **Lambda expressions** - Not implemented
   - Would need syntax like `lambda (x) (+ x 1)`

2. **Destructuring** - Not implemented
   - Pattern matching on lists

3. **Macros** - Not implemented
   - ChiaLisp macro system

4. **CAT layer support** - Not implemented
   - CAT-specific functions and patterns

5. **More time lock functions** - Partially implemented
   - ASSERT_SECONDS_RELATIVE
   - ASSERT_SECONDS_ABSOLUTE
   - ASSERT_HEIGHT_RELATIVE
   - ASSERT_HEIGHT_ABSOLUTE

6. **Type system enhancements**
   - List types
   - Tuple types
   - Custom type definitions

## Parser Issues to Fix

1. **let keyword recognition** - Need to add LET token type handling in parseStatement
2. **List literal parsing** - Need to add support for `(1 2 3)` syntax
3. **Storage variable syntax** - Fix parsing of `storage varname: type = value`
4. **Include placement** - Allow includes within coin declaration

## Implementation Priority

1. **High Priority**
   - Fix `let` statement parsing
   - Add list literal support
   - Fix storage variable parsing

2. **Medium Priority**
   - Proper let-binding generation in ChiaLisp
   - Lambda expressions
   - More condition codes

3. **Low Priority**
   - Macros
   - CAT layer
   - Advanced type system

## Testing Status

Current test failures indicate these immediate needs:
- Parser doesn't recognize `let` as a statement starter
- List literals `(1 2 3)` cause parse errors
- Storage variable type syntax needs fixing
- Include statements need better placement handling 