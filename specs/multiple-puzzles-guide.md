# Multiple Puzzle Generation in CoinScript

## Overview

CoinScript can generate multiple puzzles from a single coin definition. This is necessary for certain patterns like singletons (which need a launcher puzzle) and stateful coins using the slot-machine pattern (which need separate action puzzles).

## Types of Puzzles Generated

### 1. Main Puzzle
Every CoinScript coin generates a main puzzle. This contains the primary logic of your coin.

### 2. Launcher Puzzle (for Singletons)
When using the `@singleton` decorator, CoinScript generates an additional launcher puzzle. This puzzle is used once to create the singleton coin with a unique ID.

```coinscript
@singleton
coin MySingleton {
    // ... coin definition
}
```

The launcher puzzle:
- Takes the singleton puzzle hash and amount as parameters
- Creates a coin with the singleton wrapper
- Is spent only once during singleton creation

### 3. Action Puzzles (for Stateful Actions)
When using `@stateful` decorators on actions, each stateful action gets its own puzzle. These are used with the slot-machine pattern for dynamic behavior.

```coinscript
coin StatefulToken {
    state {
        uint256 balance;
    }
    
    @stateful
    action transfer(address to, uint256 amount) {
        // This generates a separate action puzzle
    }
}
```

## Compilation Result Structure

The `compileCoinScript()` function returns a `CoinScriptCompilationResult`:

```typescript
interface CoinScriptCompilationResult {
    mainPuzzle: PuzzleBuilder;           // Always present
    launcherPuzzle?: PuzzleBuilder;      // Present with @singleton
    additionalPuzzles?: Record<string, PuzzleBuilder>; // Present with @stateful
    metadata?: {
        coinName: string;
        hasSingleton: boolean;
        hasStatefulActions: boolean;
        launcherId?: string;
    };
}
```

## Usage Examples

### Simple Coin (Single Puzzle)
```javascript
const result = compileCoinScript(`
    coin SimpleCoin {
        action transfer(address to) {
            send(to, msg.value);
        }
    }
`);

// Only mainPuzzle is generated
const puzzle = result.mainPuzzle;
```

### Singleton Coin (Main + Launcher)
```javascript
const result = compileCoinScript(`
    @singleton
    coin MySingleton {
        storage address owner = "xch1...";
        
        action transfer(address newOwner) {
            require(msg.sender == owner);
            owner = newOwner;
        }
    }
`);

// Access both puzzles
const mainPuzzle = result.mainPuzzle;
const launcherPuzzle = result.launcherPuzzle;

// Deploy process:
// 1. Calculate mainPuzzle hash
// 2. Spend genesis coin with launcherPuzzle to create singleton
// 3. Launcher creates the singleton coin with mainPuzzle
```

### Stateful Coin (Main + Action Puzzles)
```javascript
const result = compileCoinScript(`
    coin GameContract {
        state {
            uint256 score;
            address winner;
        }
        
        @stateful
        action play(uint256 points) {
            if (points > state.score) {
                state.score = points;
                state.winner = msg.sender;
            }
        }
        
        @stateful
        action reset() {
            state.score = 0;
            state.winner = address(0);
        }
    }
`);

// Access all puzzles
const mainPuzzle = result.mainPuzzle;
const playAction = result.additionalPuzzles['action_play'];
const resetAction = result.additionalPuzzles['action_reset'];
```

## Backward Compatibility

For code that expects a single `PuzzleBuilder`, use the compatibility functions:

```javascript
// Old way (returns PuzzleBuilder directly)
const puzzle = parseCoinScriptFileToPuzzle('coin.coins');

// New way (returns CoinScriptCompilationResult)
const result = parseCoinScriptFile('coin.coins');
const puzzle = result.mainPuzzle;
```

## Deployment Patterns

### Singleton Deployment
1. Create a genesis coin (any standard coin)
2. Calculate the singleton puzzle hash from `result.mainPuzzle`
3. Spend genesis coin using `result.launcherPuzzle`
4. Launcher creates the singleton with unique ID

### Stateful Coin Deployment
1. Calculate merkle root of all action puzzles
2. Deploy main puzzle with merkle root curried in
3. Actions are executed by providing merkle proofs

## Benefits

1. **Separation of Concerns**: Each puzzle has a single responsibility
2. **Upgradeability**: Stateful actions can be updated by changing merkle root
3. **Gas Efficiency**: Only necessary puzzles are executed
4. **Security**: Launcher ensures singleton uniqueness 