# State Management Pattern for CoinScript

## Overview

CoinScript provides a state management pattern that allows smart coins to maintain mutable state across spends. This pattern offers:

- **Hidden State**: State is invisible while the coin is unspent
- **Validated Transitions**: Every state change is validated by action logic
- **Action-Based Updates**: State changes occur through @stateful actions
- **Automatic Persistence**: State is automatically persisted to the next coin

## Core Concepts

### 1. State Declaration
State is declared in a `state { }` block within the coin:

```coinscript
coin StatefulToken {
    // Immutable storage (curried into puzzle)
    storage address owner = 0x...;
    
    // Mutable state
    state {
        uint256 totalSupply;
        uint256 counter;
        address lastUser;
    }
}
```

### 2. Stateful Actions
Actions marked with `@stateful` can read and modify state:

```coinscript
@stateful
action increment() {
    // Read state
    require(state.counter < 100, "Counter too high");
    
    // Modify state
    state.counter += 1;
    state.lastUser = msg.sender;
    
    // Recreate coin with new state
    recreateSelf();
}
```

### 3. State Persistence
The state management layer handles:
- Currying current state into the puzzle
- Tracking state modifications during action execution
- Creating new coins with updated state
- Maintaining state history through coin lineage

## Implementation Details

### State Management Layer
The framework provides `withStateManagementLayer` which:
1. Wraps the inner puzzle with state handling logic
2. Routes actions based on merkle tree verification
3. Manages state updates and coin recreation
4. Provides action isolation and security

### Generated Structure
```lisp
(mod (
    ACTION_MERKLE_ROOT
    INITIAL_STATE
    inner_puzzle_hash
    action_solution
)
    ; State management layer logic
    ; - Verify action in merkle tree
    ; - Execute action with current state
    ; - Create new coin with updated state
)
```

### State Access Pattern
State fields are accessed using list operations:
- First field: `(f current_state)`
- Second field: `(f (r current_state))`
- Third field: `(f (r (r current_state)))`

## Usage Example

```typescript
// Define a stateful coin
const coinScript = `
coin Counter {
    storage address owner = 0x...;
    
    state {
        uint256 count;
    }
    
    @stateful
    action increment() {
        state.count += 1;
        recreateSelf();
    }
    
    @stateful
    action reset() {
        require(msg.sender == owner);
        state.count = 0;
        recreateSelf();
    }
}`;

// Compile and deploy
const result = compileCoinScript(coinScript);
const puzzle = result.mainPuzzle;
```

## Comparison with Other Approaches

| Feature | CoinScript State Management | Manual State | Global State |
|---------|---------------------------|--------------|--------------|
| State Visibility | Hidden until spend | Visible in puzzle | Always visible |
| Ease of Use | High (automatic) | Low (manual) | Medium |
| Gas Efficiency | Good | Variable | Poor |
| Type Safety | Yes (typed fields) | No | No |

## Security Considerations

1. **Access Control**: Use `require()` to validate permissions
2. **State Validation**: Always validate state transitions
3. **Atomicity**: State updates are atomic within an action
4. **Replay Protection**: Consider adding nonces if needed

## Implementation Status

✅ **Fully Implemented**:
- State declaration syntax
- @stateful decorator support
- State field access tracking
- State modification tracking
- Automatic state persistence
- Integration with action system

## Best Practices

1. **Keep State Minimal**: Only store essential data
2. **Validate Transitions**: Always check state validity
3. **Use Access Control**: Protect sensitive actions
4. **Consider Gas Costs**: State size affects solution size
5. **Test Thoroughly**: State bugs can be costly

## Future Enhancements

Potential improvements:
- Optimized state encoding
- Partial state updates
- State migration support
- Enhanced debugging tools
- State visualization 