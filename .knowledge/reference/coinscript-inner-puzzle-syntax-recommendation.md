 # CoinScript Inner Puzzle Syntax Recommendation

## Executive Summary

This document proposes a syntax for incorporating inner puzzles into CoinScript that aligns with ChiaLisp patterns while maintaining CoinScript's high-level abstraction benefits. The proposal introduces three approaches: explicit inner puzzle definitions, decorator-based routing, and a hybrid approach for maximum flexibility.

## Background

Inner puzzles in ChiaLisp are fundamental building blocks that enable:
- **Composability**: Outer puzzles wrap inner puzzles to add functionality
- **Reusability**: Same inner puzzle can be used with different outer wrappers
- **Modularity**: Clear separation of concerns between layers
- **Security**: Each layer enforces its own rules independently

Common ChiaLisp patterns observed:
```lisp
(mod (INNER_PUZZLE inner_solution ...)
  ; Execute inner puzzle
  (a INNER_PUZZLE inner_solution)
)
```

## Proposed CoinScript Syntax

### 1. Explicit Inner Puzzle Definition

Define inner puzzles as first-class constructs that can be composed:

```typescript
// Define a reusable inner puzzle
puzzle PaymentPuzzle {
  constructor(address owner) {}
  
  action spend(address recipient, uint256 amount) {
    requireSignature(owner)
    send(recipient, amount)
  }
}

// Use as inner puzzle in a coin
coin TimeLockCoin {
  // Reference the inner puzzle type
  inner PaymentPuzzle payment_logic
  
  constructor(uint256 unlock_time) {
    // Inner puzzle parameters are curried separately
  }
  
  action unlock(inner_solution: PaymentPuzzle.Solution) {
    require(block.height >= unlock_time, "Still locked")
    // Delegate to inner puzzle
    return payment_logic(inner_solution)
  }
}
```

### 2. Decorator-Based Inner Puzzle Routing

Use decorators to mark actions that should route to inner puzzles:

```typescript
coin MultiLayerCoin {
  @inner("payment")
  puzzle PaymentLogic {
    action transfer(address to, uint256 amount) {
      send(to, amount)
    }
  }
  
  @inner("governance") 
  puzzle GovernanceLogic {
    action vote(uint256 proposal_id, bool support) {
      emit VoteCast(msg.sender, proposal_id, support)
    }
  }
  
  // Main routing action
  action execute(string puzzle_name, bytes inner_solution) {
    // Compiler generates routing logic
    if (puzzle_name == "payment") {
      return PaymentLogic(inner_solution)
    } else if (puzzle_name == "governance") {
      return GovernanceLogic(inner_solution)
    }
    fail("Unknown inner puzzle")
  }
}
```

### 3. Hybrid Approach (Recommended)

Combine explicit definitions with layer integration for maximum flexibility:

```typescript
// Define standalone inner puzzles
puzzle StandardPayment {
  constructor(address owner) {}
  
  action default(address recipient, uint256 amount) {
    requireSignature(owner)
    send(recipient, amount)
  }
}

// Define coins that can accept inner puzzles
coin FlexibleSingleton {
  // Declare inner puzzle slot with interface
  inner IPuzzle base_logic
  
  // Can also have inline inner puzzles
  inner puzzle emergency {
    action recover(address new_owner) {
      requireSignature(RECOVERY_KEY)
      recreateSelf(new_owner)
    }
  }
  
  constructor(IPuzzle inner_puzzle) {
    base_logic = inner_puzzle
  }
  
  // Route to inner puzzle for normal operations
  action default(bytes inner_solution) {
    return base_logic(inner_solution)
  }
  
  // Or handle special cases
  action emergency_recover(address new_owner) {
    return emergency.recover(new_owner)
  }
}

// Usage example
coin MyWallet {
  use StandardPayment(owner: 0x123...)
  layer singleton(launcher_id: 0xabc...)
}
```

## Key Language Features

### 1. Inner Puzzle Declaration

```typescript
// Standalone puzzle definition
puzzle MyInnerPuzzle {
  constructor(...) {}
  action default(...) { ... }
}

// Inline inner puzzle within a coin
coin MyCoin {
  inner puzzle myLogic {
    action process(...) { ... }
  }
}

// Inner puzzle slot declaration
coin MyCoin {
  inner IPuzzle customLogic
}
```

### 2. Inner Puzzle Interfaces

Define contracts for inner puzzles:

```typescript
interface IPaymentPuzzle {
  action pay(address to, uint256 amount)
}

interface IGovernancePuzzle {
  action vote(uint256 proposal_id, bool support)
  action propose(bytes proposal_data) returns (uint256)
}
```

### 3. Solution Types

Automatic generation of solution types for inner puzzles:

```typescript
// Compiler generates:
type StandardPayment.Solution = {
  recipient: address
  amount: uint256
}
```

### 4. Composition Helpers

```typescript
coin ComplexNFT {
  // Compose multiple inner puzzle layers
  inner StateLayer state_handler
  inner OwnershipLayer ownership
  inner RoyaltyLayer royalties
  
  // Or use composition syntax
  compose {
    base: StandardPayment(owner)
    with: StateLayer({ counter: 0 })
    with: RoyaltyLayer(artist, 5%)
  }
}
```

## Implementation Guide

### Phase 1: Compiler AST Extensions

1. **Add Inner Puzzle AST Nodes**:
```typescript
interface InnerPuzzleDeclaration extends ASTNode {
  type: 'InnerPuzzleDeclaration'
  name: string
  inline: boolean
  puzzle?: PuzzleDeclaration
  interface?: string
}

interface PuzzleDeclaration extends ASTNode {
  type: 'PuzzleDeclaration'
  name: string
  constructor?: Constructor
  actions: ActionDeclaration[]
}
```

2. **Extend Coin Declaration**:
```typescript
interface CoinDeclaration {
  // ... existing fields
  innerPuzzles?: InnerPuzzleDeclaration[]
  composition?: CompositionBlock
}
```

### Phase 2: Parser Updates

1. **Add Keywords**:
```typescript
enum TokenType {
  // ... existing
  PUZZLE = 'PUZZLE',
  INNER = 'INNER',
  COMPOSE = 'COMPOSE',
  USE = 'USE'
}
```

2. **Parse Inner Puzzle Syntax**:
```typescript
private parseInnerPuzzle(): InnerPuzzleDeclaration {
  this.expect(TokenType.INNER)
  
  if (this.match(TokenType.PUZZLE)) {
    // Inline inner puzzle
    const name = this.expect(TokenType.IDENTIFIER).value
    this.expect(TokenType.LBRACE)
    const actions = this.parseActions()
    this.expect(TokenType.RBRACE)
    
    return {
      type: 'InnerPuzzleDeclaration',
      name,
      inline: true,
      puzzle: { name, actions }
    }
  } else {
    // Inner puzzle slot
    const interface = this.parseType()
    const name = this.expect(TokenType.IDENTIFIER).value
    
    return {
      type: 'InnerPuzzleDeclaration',
      name,
      inline: false,
      interface
    }
  }
}
```

### Phase 3: Code Generation

1. **Generate Inner Puzzle Parameters**:
```typescript
// In ChiaLisp generation
if (coin.innerPuzzles) {
  // Add INNER_PUZZLE parameters to mod
  for (const inner of coin.innerPuzzles) {
    builder.withParam(inner.name.toUpperCase())
  }
}
```

2. **Generate Routing Logic**:
```typescript
// For action delegation to inner puzzles
private generateInnerPuzzleCall(
  innerPuzzleName: string,
  solutionVar: string
): PuzzleBuilder {
  return builder
    .comment(`Execute inner puzzle: ${innerPuzzleName}`)
    .raw(`(a ${innerPuzzleName.toUpperCase()} ${solutionVar})`)
}
```

3. **Handle Currying**:
```typescript
// When creating a coin with inner puzzles
private generateCurrying(
  coin: CoinDeclaration,
  innerPuzzleHashes: Map<string, string>
): string {
  const params = []
  
  for (const inner of coin.innerPuzzles || []) {
    params.push(innerPuzzleHashes.get(inner.name))
  }
  
  return `(curry ${coin.name}_MOD ${params.join(' ')})`
}
```

### Phase 4: ChiaLisp Output Examples

**Simple Inner Puzzle**:
```lisp
(mod (INNER_PUZZLE inner_solution unlock_time)
  (include condition_codes.clib)
  
  (if (>= block_height unlock_time)
    (a INNER_PUZZLE inner_solution)
    (x)
  )
)
```

**Multi-Layer Composition**:
```lisp
(mod (STATE_LAYER OWNERSHIP_LAYER BASE_PUZZLE solution)
  ; Execute through layers
  (a STATE_LAYER
    (list OWNERSHIP_LAYER BASE_PUZZLE solution))
)
```

**Inline Inner Puzzle**:
```lisp
(mod (ACTION emergency_solution normal_solution)
  (if (= ACTION "emergency")
    ; Inline emergency logic
    (list
      (list AGG_SIG_ME RECOVERY_KEY emergency_solution)
      (list CREATE_COIN ...)
    )
    ; Delegate to curried inner puzzle
    (a INNER_PUZZLE normal_solution)
  )
)
```

## Best Practices

1. **Interface Segregation**: Define clear interfaces for inner puzzles to ensure compatibility
2. **Solution Validation**: Validate inner solutions before delegation
3. **Access Control**: Consider who can invoke which inner puzzles
4. **State Consistency**: Ensure inner puzzles maintain consistent state when used together
5. **Gas Optimization**: Be mindful of nesting depth and execution costs

## Migration Path

For existing CoinScript code:

1. **Phase 1**: Support basic inner puzzle slots (backwards compatible)
2. **Phase 2**: Add inline inner puzzle definitions
3. **Phase 3**: Full composition syntax
4. **Phase 4**: Deprecate old patterns in favor of inner puzzles

## Security Considerations

1. **Puzzle Hash Verification**: Always verify inner puzzle hashes when critical
2. **Solution Injection**: Prevent malicious solution injection
3. **Condition Filtering**: Outer puzzles should filter/validate inner puzzle conditions
4. **Reentrancy**: Consider reentrancy when inner puzzles can call back

## Conclusion

This inner puzzle syntax for CoinScript provides:
- **Compatibility**: Maps cleanly to ChiaLisp patterns
- **Flexibility**: Multiple approaches for different use cases
- **Safety**: Type-safe inner puzzle composition
- **Simplicity**: Maintains CoinScript's high-level benefits

The implementation can be done incrementally, starting with basic inner puzzle slots and evolving to full composition support.