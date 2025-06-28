# PuzzleBuilder Static Loader API

The PuzzleBuilder class provides static methods to load puzzles from files directly.

## API Methods

### `PuzzleBuilder.fromClsp(filePath: string): PuzzleBuilder`

Loads a ChiaLisp (.clsp) file and creates a PuzzleBuilder instance from it.

**Parameters:**
- `filePath` - Path to the .clsp file to load

**Returns:**
- A PuzzleBuilder instance with the loaded puzzle

**Features:**
- Automatically parses the ChiaLisp AST
- Detects and separates curried vs solution parameters
- Preserves the original mod structure
- Includes support for ChiaLisp libraries

**Example:**
```javascript
const { PuzzleBuilder } = require('chia-puzzle-framework');

// Load a custom puzzle
const puzzle = PuzzleBuilder.fromClsp('./my-puzzle.clsp');

// Serialize it
console.log(puzzle.serialize({ indent: true }));

// Curry parameters
const curriedPuzzle = puzzle.withCurriedParams({
    PUBKEY: '0xabcd...'
});

// Get mod hash
console.log(puzzle.toModHash());
```

### `PuzzleBuilder.fromCoinScript(filePath: string): PuzzleBuilder`

Loads a CoinScript (.coins) file, compiles it, and returns the main puzzle as a PuzzleBuilder.

**Parameters:**
- `filePath` - Path to the .coins file to load

**Returns:**
- A PuzzleBuilder instance with the compiled main puzzle

**Features:**
- Full CoinScript compilation
- Supports all CoinScript features (decorators, layers, etc.)
- Returns the main puzzle (for multi-puzzle outputs like @singleton)
- Automatic handling of includes and dependencies

**Example:**
```javascript
const { PuzzleBuilder } = require('chia-puzzle-framework');

// Load and compile a CoinScript file
const puzzle = PuzzleBuilder.fromCoinScript('./my-coin.coins');

// Use it like any other puzzle
console.log(puzzle.serialize({ format: 'chialisp', indent: true }));

// Compile to CLVM
console.log(puzzle.serialize({ format: 'clvm', compiled: true }));

// Get hex representation
console.log(puzzle.serialize({ format: 'hex', compiled: true }));
```

## Parameter Detection

When loading ChiaLisp files, the loader automatically detects and categorizes parameters:

- **UPPERCASE** parameters (e.g., `PUBKEY`, `AMOUNT`) are treated as curried parameters
- **lowercase** parameters (e.g., `recipient`, `amount`) are treated as solution parameters
- The special `@` parameter is handled correctly

## Use Cases

### 1. Loading Standard Puzzles
```javascript
// Load standard NFT ownership layer
const nftPuzzle = PuzzleBuilder.fromClsp('src/chialisp/nft/nft_ownership_layer.clsp');
```

### 2. Loading Custom Puzzles
```javascript
// Load your own ChiaLisp puzzle
const customPuzzle = PuzzleBuilder.fromClsp('./puzzles/my-custom.clsp');
```

### 3. Loading and Compiling CoinScript
```javascript
// Compile a CoinScript file
const coinPuzzle = PuzzleBuilder.fromCoinScript('./contracts/token.coins');
```

### 4. Migration from ChiaLisp to CoinScript
```javascript
// Load existing ChiaLisp
const oldPuzzle = PuzzleBuilder.fromClsp('./legacy.clsp');

// Compare with new CoinScript version
const newPuzzle = PuzzleBuilder.fromCoinScript('./modern.coins');

// Verify they produce similar outputs
console.log('Old hash:', oldPuzzle.toModHash());
console.log('New hash:', newPuzzle.toModHash());
```

## Error Handling

Both methods throw errors with descriptive messages:

```javascript
try {
    const puzzle = PuzzleBuilder.fromClsp('./missing.clsp');
} catch (error) {
    console.error('Failed to load:', error.message);
    // "Failed to load ChiaLisp file ./missing.clsp: ENOENT: no such file or directory"
}
```

## Comparison with Other Methods

| Method | Use Case | Returns |
|--------|----------|---------|
| `PuzzleBuilder.fromClsp()` | Load any .clsp file | PuzzleBuilder |
| `PuzzleBuilder.fromCoinScript()` | Load and compile .coins file | PuzzleBuilder (main puzzle) |
| `createChialispPuzzle()` | Load predefined puzzles from lib | PuzzleBuilder |
| `compileCoinScript()` | Compile CoinScript string | Full compilation result |

## Notes

- The `fromCoinScript` method returns only the main puzzle. For decorators like `@singleton` that generate multiple puzzles, use `compileCoinScript()` directly to access all puzzles.
- File paths can be relative or absolute
- The methods use synchronous file reading for simplicity 