# CLSP Formatter V2

An enhanced CLSP formatter with intelligent line length and nesting rules.

## Key Features

### 1. Simple Expressions Stay on One Line
```lisp
; Before:
(
  define
  MAX_HEIGHT
  100
)

; After:
(define MAX_HEIGHT 100)
```

### 2. Line Length Aware (Default: 300 chars)
```lisp
; If expression > 300 chars, format vertically:
(
  this_is_a_very_long_function_name
  param1
  param2
  param3
  ...
)
```

### 3. Smart Nesting Formatting
```lisp
; Nested expressions format with inner on separate lines:
(if
  (> x 10)
  (list x y z)
  ()
)
```

## Usage

### Command Line
```bash
node clsp-formatter-v2.js <file.clsp> [options]

Options:
  --max-length <n>   Maximum line length (default: 300)
  --indent <n>       Indent size (default: 2)
```

### Programmatic
```javascript
const { CLSPFormatterV2 } = require('./clsp-formatter-v2');

const formatter = new CLSPFormatterV2({ 
  maxLineLength: 300,
  indentSize: 2 
});

const formatted = formatter.format(clspCode);
```

## Examples

### Simple Expression (No Nesting)
```lisp
; Input:
(assert condition "error message")

; Output (stays on one line):
(assert condition "error message")
```

### Nested Expression
```lisp
; Input:
(list (list CREATE_COIN puzzle_hash amount) (list ASSERT_MY_AMOUNT amount))

; Output:
(list
  (list CREATE_COIN puzzle_hash amount)
  (list ASSERT_MY_AMOUNT amount)
)
```

### Long Line Handling
```lisp
; With max length = 80:
; Input (95 chars):
(define-constant LONG_ADDRESS "xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy")

; Output:
(
  define-constant
  LONG_ADDRESS
  "xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy"
)
```

## Formatting Rules

1. **No Nesting + Under Max Length** → One line
2. **No Nesting + Over Max Length** → Vertical with each element on new line
3. **Has Nesting** → Each nested expression on its own line with proper indentation

## Implementation Details

The formatter:
- Parses CLSP into an AST
- Analyzes each expression for nesting and length
- Applies formatting rules based on structure
- Preserves comments and strings
- Handles complex nested structures gracefully 