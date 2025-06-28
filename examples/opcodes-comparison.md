# ChiaLisp Opcode Constants Comparison

This document shows the difference between using raw CLVM operators and using the new opcode constants from `opcodes.clib`.

## Before: Using Raw Operators

```chialisp
(mod (x y)
  ; Raw operators - harder to read for newcomers
  (c
    (+ x y)           ; Addition
    (c
      (* x 2)         ; Multiplication
      (c
        (> x y)       ; Greater than
        (sha256 x)    ; SHA256 hash
      )
    )
  )
)
```

## After: Using Opcode Constants

```chialisp
(mod (x y)
  (include opcodes.clib)
  
  ; Using named constants - more readable and self-documenting
  (CONS
    (ADD x y)           ; Addition
    (CONS
      (MULTIPLY x 2)    ; Multiplication  
      (CONS
        (GT x y)        ; Greater than
        (SHA256 x)      ; SHA256 hash
      )
    )
  )
)
```

## Benefits

1. **Readability**: `ADD` is clearer than `+` for those new to ChiaLisp
2. **Consistency**: All operators use the same naming convention
3. **Self-documenting**: The code explains what each operation does
4. **IDE Support**: Easier to provide autocomplete for named constants
5. **Learning Curve**: Reduces confusion about which symbols are operators vs other syntax

## Available Constants

The `opcodes.clib` file provides constants for all CLVM operators:

### Core Operators
- `QUOTE` (q), `APPLY` (a), `IF` (i), `CONS` (c), `FIRST` (f), `REST` (r), etc.

### Arithmetic
- `ADD` (+), `SUBTRACT` (-), `MULTIPLY` (*), `DIVIDE` (/), `DIVMOD`, etc.

### Comparison
- `GT` (>), `GTS` (>s), `EQ` (=)

### Bit Operations
- `ASH`, `LSH`, `LOGAND`, `LOGIOR`, `LOGXOR`, `LOGNOT`

### Logic
- `NOT`, `ANY`, `ALL`

### Crypto
- `SHA256`, `SHA256TREE`, `KECCAK256`, `COINID`

### BLS Operations
- `POINT_ADD`, `PUBKEY_FOR_EXP`, `BLS_VERIFY`, etc.

## Usage with TypeScript/JavaScript

```javascript
const { puzzle } = require('chia-puzzle-framework');

const myPuzzle = puzzle()
  .includeOpcodes()  // Include the opcode constants
  .withSolutionParams('a', 'b')
  .addNode(
    expr.list([
      expr.sym('ADD'),     // Use the ADD constant
      expr.param('a'),
      expr.param('b')
    ])
  );
```

## Combining with Condition Codes

Opcode constants work seamlessly with condition code constants:

```chialisp
(mod (amount recipient)
  (include opcodes.clib)
  (include condition_codes.clib)
  
  (list
    CREATE_COIN           ; Condition code constant
    recipient
    (DIVIDE amount 2)     ; Opcode constant
  )
)
```