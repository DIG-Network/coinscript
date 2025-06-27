# CLSP Formatter

A ChiaLisp (CLSP) code formatter that enforces the standard indentation style where opening parentheses and their first element stay on the same line.

## 🎯 Purpose

The CLSP formatter fixes common indentation issues in ChiaLisp code:

### Before
```lisp
(mod (
    PARAM1
    PARAM2
)
    (defun myfunction (
        arg1
        arg2
    )
        (if condition
            (
                c
                value1
                value2
            )
            ; else
            ()
        )
    )
)
```

### After
```lisp
(mod (PARAM1
    PARAM2
)
    (defun myfunction (arg1
        arg2
    )
        (if condition
            (c
                value1
                value2
            )
            ; else
            ()
        )
    )
)
```

## 🚀 Usage

### Command Line

```bash
# Format a single file
node clsp-formatter.js path/to/file.clsp --advanced

# Format all .clsp files in a directory
node clsp-formatter.js ../slot-machine/puzzles/singleton --advanced

# Basic formatting (without --advanced flag)
node clsp-formatter.js file.clsp
```

### Programmatic Usage

```javascript
const { AdvancedCLSPFormatter } = require('./clsp-formatter');

// Create formatter instance
const formatter = new AdvancedCLSPFormatter();

// Format code string
const formattedCode = formatter.format(clspCode);

// Format file
const formatted = formatter.formatFile('path/to/file.clsp');

// Format and save file in place
formatter.formatFileInPlace('path/to/file.clsp');

// Format entire directory
formatter.formatDirectory('../slot-machine/puzzles/singleton');
```

## 📏 Formatting Rules

The formatter applies these rules:

1. **Opening parenthesis and first element on same line**
   - `(i ...` not `(\n    i ...`
   - `(c ...` not `(\n    c ...`
   - `(defun name ...` not `(defun name (\n    ...`

2. **Function definitions**
   - `(defun function-name (params...)` on one line
   - `(defun-inline function-name (params...)` on one line

3. **Module definitions**
   - `(mod (params...)` not `(mod (\n    params...`

4. **Preserves**
   - Comments (both `;` and `;;`)
   - String literals
   - Overall code structure
   - Relative indentation

## 🔧 Implementation Details

### Basic Formatter
- Processes line by line
- Merges standalone `(` with following element
- Preserves comments and empty lines

### Advanced Formatter
- Uses regex patterns for common cases
- Handles nested parentheses intelligently
- Fixes specific patterns like `(mod (`, `(defun`, etc.

## 📋 Examples

### Format Singleton Puzzles

```bash
# Format all singleton puzzle files
node clsp-formatter.js ../../slot-machine/puzzles/singleton --advanced
```

This will format files like:
- `action.clsp`
- `finalizer.clsp`
- `slot.clsp`
- `state_scheduler.clsp`
- etc.

### Test the Formatter

```bash
# Run the test script
node test-clsp-formatter.js

# Run the demo
node clsp-formatter-demo.js
```

## ⚠️ Important Notes

1. **Always backup your files** before running the formatter
2. **Review changes** after formatting
3. **Test your code** to ensure functionality is preserved
4. The formatter is **non-destructive** but modifies files in place

## 🐛 Known Limitations

- Complex nested structures may need manual adjustment
- Some edge cases with special ChiaLisp syntax might not be handled
- Multi-line strings are preserved as-is

## 🤝 Contributing

To improve the formatter:

1. Add new test cases to `test-clsp-formatter.js`
2. Update regex patterns in `AdvancedCLSPFormatter`
3. Test on real CLSP files
4. Submit improvements

## 📜 License

This formatter is part of the chia-puzzle-framework project. 