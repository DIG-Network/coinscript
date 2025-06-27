# CLSP Formatting Patterns

Based on analysis of the CLSP files in `training/clsp/`, here are the common formatting patterns:

## 1. Module Declaration (`mod`)

### Pattern:
```lisp
(mod (
        CONSTANT1
        CONSTANT2 ; comment about constant
        (nested structure)
        (
            Truth_Variable . ; comment
            (@ State_Destructuring
                (field1 field2)
            )
        )
    )
    (include file.clib)
    ; body expressions
)
```

### Key Features:
- Parameters on separate lines with 8-space indent
- Comments aligned after parameters
- Nested structures properly indented
- Includes grouped at the start of body
- Body expressions with 4-space indent

## 2. Function Definitions

### Simple Function:
```lisp
(defun function_name (arg1 arg2)
    body_expression
)
```

### Complex Function with Destructuring:
```lisp
(defun function_name (
        simple_arg
        (destructured . args)
        (@ named_destructure (field1 . field2))
    )
    (if condition
        then_expr
        ; else
        else_expr
    )
)
```

## 3. If Statements

### Pattern with "; else" comment:
```lisp
(if condition
    then_expression
    ; else
    else_expression
)
```

### Nested conditions:
```lisp
(if (all
        condition1
        condition2
    )
    complex_then
    ; else
    (x)
)
```

## 4. List Operations

### Short lists (single line):
```lisp
(list item1 item2 item3)
```

### Long lists (multi-line):
```lisp
(list
    item1
    (nested item2)
    item3 ; with comment
)
```

## 5. Common Operations

### Cons operation:
```lisp
(c first_element rest_of_list)
```

### Apply operation:
```lisp
(a function_name arguments)
```

### Include statements (always single line):
```lisp
(include condition_codes.clib)
```

## 6. Comments

### Line comments:
```lisp
; This is a top-level comment
(expression) ; inline comment
```

### Section markers:
```lisp
; else
; Truth
; new state
```

## 7. Special Patterns

### Destructuring with @:
```lisp
(@ binding_name (pattern . rest))
```

### Inline functions:
```lisp
(defun-inline function_name (args)
    body
)
```

### Complex nested expressions:
```lisp
(curry_hashes_inline MOD_HASH
    (sha256 1 value1)
    (sha256 2
        (sha256 1 value2)
        (sha256 1 value3)
    )
)
```

## 8. Whitespace Rules

1. **Normalization**: Remove all extra spaces/newlines, keep single space between atoms
2. **Line Length**: 
   - Simple expressions < 120 chars → single line
   - Complex or long expressions → multi-line
3. **Indentation**: 
   - Standard: 4 spaces per level
   - Module params: 8 spaces
   - Nested structures: align with parent

## 9. Special Forms That Force Multi-line

- `mod` - always multi-line
- `defun` / `defun-inline` - always multi-line
- `if` - always multi-line
- `list` - multi-line if > 3 items or contains nested lists

## 10. Condition Codes Pattern

```lisp
(list
    (list CONDITION_CODE
        arg1
        arg2
        (list hint)
    )
    (list ANOTHER_CODE arg)
)
```

## Summary

The formatter should:
1. First normalize whitespace (remove extra spaces/newlines)
2. Apply pattern-based formatting when `indent: true`
3. Recognize special forms and format accordingly
4. Preserve comments and their alignment
5. Handle @ destructuring syntax
6. Keep simple expressions on one line when possible
7. Format complex/nested expressions on multiple lines 