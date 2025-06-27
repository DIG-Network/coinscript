# CLSP Formatter Integration

The CLSP (ChiaLisp) formatter has been integrated into the main project flow, providing automatic formatting of generated ChiaLisp code when requested.

## How It Works

When you call `puzzle.serialize({ indent: true })` on any PuzzleBuilder instance, the formatter is automatically applied to the generated CLSP code.

### Without Formatting
```javascript
const puzzle = parseCoinScriptFile('./my-coin.coins');
const clsp = puzzle.serialize();
// Output: (mod ACTION (i (= ACTION transfer) (c (assert (= sender "0x...")) ...))
```

### With Formatting
```javascript
const puzzle = parseCoinScriptFile('./my-coin.coins');
const clsp = puzzle.serialize({ indent: true });
// Output:
// (mod
//   ACTION
//   (i
//     (= ACTION transfer)
//     (c
//       (assert
//         (= sender "0x...")
//       )
//       ...
//     )
//   )
// )
```

## Formatting Rules

The formatter applies the following rules:

1. **Simple expressions** (under 120 characters) stay on one line
2. **Nested expressions** are formatted with proper indentation (2 spaces)
3. **Long expressions** (over 120 characters) are wrapped to multiple lines
4. **Whitespace** is normalized (extra spaces/newlines removed)
5. **Comments** are preserved
6. **Include statements** are properly formatted

## Examples

### Simple Expression (stays on one line)
```clsp
(sha256 MERKLE_ROOT)
```

### Nested Expression (multiple lines)
```clsp
(i
  (= state 0)
  (c
    (51 0xaaaa...aaaa 1000)
    "()"
  )
  state
)
```

### Long Expression (wrapped)
```clsp
(assert
  (any
    (= sender 0x1111...1111)
    (= sender 0x2222...2222)
  )
)
```

## Integration Points

The formatter is integrated at the following levels:

1. **PuzzleBuilder**: `serialize({ indent: true })` method
2. **CoinScript Compiler**: Automatically available for all compiled puzzles
3. **Examples**: All examples use formatted output for readability

## Implementation Details

- Located in `src/core/clspFormatter.ts`
- Uses a custom parser to handle CLSP s-expressions
- Configurable max line length (default: 120)
- Configurable indent size (default: 2 spaces)

## Performance

The formatter adds minimal overhead:
- Only runs when `indent: true` is specified
- Efficient single-pass formatting
- No impact on unformatted output

## Future Enhancements

Potential improvements:
- Configurable formatting rules
- Support for more complex CLSP patterns
- Integration with clsp-lint for validation
- VS Code extension for real-time formatting 