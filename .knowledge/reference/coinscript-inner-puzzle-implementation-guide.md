# CoinScript Inner Puzzle Implementation Guide

## Overview

This guide provides detailed implementation steps for converting CoinScript inner puzzle syntax to ChiaLisp, ensuring compatibility with existing ChiaLisp patterns while leveraging CoinScript's high-level abstractions.

## Core Concepts Translation

### 1. Inner Puzzle Parameter Mapping

**CoinScript**:
```typescript
coin MyWrapperCoin {
  inner IPaymentPuzzle payment_logic
  
  constructor(address owner) {
    // Inner puzzle curry handled by compiler
  }
}
```

**Generated ChiaLisp**:
```lisp
(mod (PAYMENT_LOGIC_INNER_PUZZLE owner inner_solution)
  ; PAYMENT_LOGIC_INNER_PUZZLE is curried in
  ; owner is curried from constructor
  ; inner_solution is runtime parameter
)
```

### 2. Inner Puzzle Execution

**CoinScript**:
```typescript
action execute(bytes inner_solution) {
  return payment_logic(inner_solution)
}
```

**Generated ChiaLisp**:
```lisp
; Direct execution
(a PAYMENT_LOGIC_INNER_PUZZLE inner_solution)

; Or with condition morphing (for layers)
(morph_conditions (a PAYMENT_LOGIC_INNER_PUZZLE inner_solution))
```

## Implementation Patterns

### Pattern 1: Simple Inner Puzzle Wrapper

**Use Case**: Time-locked coins, vaults, escrows

**CoinScript**:
```typescript
coin TimeLockedVault {
  inner IPuzzle spending_logic
  storage uint256 unlock_time
  
  action spend(bytes inner_solution) {
    require(block.height >= unlock_time, "Still locked")
    return spending_logic(inner_solution)
  }
}
```

**ChiaLisp Generation**:
```lisp
(mod (SPENDING_LOGIC_INNER_PUZZLE UNLOCK_TIME inner_solution)
  (include condition_codes.clib)
  
  (if (>= block_height UNLOCK_TIME)
    (a SPENDING_LOGIC_INNER_PUZZLE inner_solution)
    (x "Still locked")
  )
)
```

### Pattern 2: Singleton with Inner Puzzle

**Use Case**: NFTs, DIDs, unique assets

**CoinScript**:
```typescript
@singleton
coin UniqueAsset {
  inner IOwnershipPuzzle ownership
  
  action transfer(bytes ownership_solution) {
    // Singleton wrapper handles uniqueness
    return ownership(ownership_solution)
  }
}
```

**ChiaLisp Generation Process**:
1. Generate inner puzzle execution
2. Apply singleton layer wrapper
3. Handle lineage proof and morphing

```lisp
; Generated main puzzle (before singleton wrap)
(mod (OWNERSHIP_INNER_PUZZLE ownership_solution)
  (a OWNERSHIP_INNER_PUZZLE ownership_solution)
)

; After singleton layer application
(mod (SINGLETON_STRUCT INNER_PUZZLE lineage_proof my_amount inner_solution)
  ; ... singleton logic ...
  (check_and_morph_conditions_for_singleton 
    SINGLETON_STRUCT 
    (a INNER_PUZZLE inner_solution) 
    0)
)
```

### Pattern 3: Multi-Layer Composition

**Use Case**: Complex NFTs with state, ownership, royalties

**CoinScript**:
```typescript
coin ComplexNFT {
  compose {
    base: StandardPayment(owner: initial_owner)
    with: StateLayer(metadata: {...})
    with: RoyaltyLayer(recipient: artist, percentage: 10)
  }
  
  action default(bytes solution) {
    // Compiler generates layer routing
    return composed_puzzle(solution)
  }
}
```

**ChiaLisp Layer Application**:
```lisp
; Each layer wraps the previous
; Layer 3 (outermost): Royalty
(mod (LAYER2_PUZZLE royalty_recipient royalty_percentage solution)
  (apply_royalty_logic
    royalty_recipient
    royalty_percentage
    (a LAYER2_PUZZLE solution))
)

; Layer 2: State
(mod (LAYER1_PUZZLE metadata solution)
  (apply_state_logic
    metadata
    (a LAYER1_PUZZLE solution))
)

; Layer 1 (innermost): Payment
(mod (owner solution)
  ; Base payment logic
)
```

### Pattern 4: Conditional Inner Puzzles

**Use Case**: Multi-mode contracts, upgradeable logic

**CoinScript**:
```typescript
coin MultiModeCoin {
  inner IPuzzle normal_logic
  inner IPuzzle emergency_logic
  
  action execute(bool emergency, bytes solution) {
    if (emergency) {
      return emergency_logic(solution)
    } else {
      return normal_logic(solution)
    }
  }
}
```

**ChiaLisp Generation**:
```lisp
(mod (NORMAL_LOGIC_PUZZLE EMERGENCY_LOGIC_PUZZLE emergency solution)
  (if emergency
    (a EMERGENCY_LOGIC_PUZZLE solution)
    (a NORMAL_LOGIC_PUZZLE solution)
  )
)
```

## Compiler Implementation Steps

### Step 1: AST Transformation

```typescript
class InnerPuzzleTransformer {
  transformCoin(coin: CoinDeclaration): TransformedCoin {
    const innerPuzzleParams: Parameter[] = []
    
    // Extract inner puzzle declarations
    for (const inner of coin.innerPuzzles || []) {
      innerPuzzleParams.push({
        name: this.toChiaLispParam(inner.name),
        type: 'puzzle'
      })
    }
    
    return {
      ...coin,
      additionalParams: innerPuzzleParams
    }
  }
  
  private toChiaLispParam(name: string): string {
    return `${name.toUpperCase()}_INNER_PUZZLE`
  }
}
```

### Step 2: Code Generation

```typescript
class InnerPuzzleCodeGen {
  generateInnerCall(
    puzzleName: string,
    solutionExpr: Expression
  ): ChiaLispExpression {
    const puzzleParam = `${puzzleName.toUpperCase()}_INNER_PUZZLE`
    
    return {
      type: 'apply',
      operator: 'a',
      operands: [
        { type: 'symbol', value: puzzleParam },
        this.compileExpression(solutionExpr)
      ]
    }
  }
  
  generateWithConditionMorphing(
    puzzleName: string,
    solutionExpr: Expression,
    morphFn: string
  ): ChiaLispExpression {
    const innerCall = this.generateInnerCall(puzzleName, solutionExpr)
    
    return {
      type: 'call',
      function: morphFn,
      arguments: [innerCall]
    }
  }
}
```

### Step 3: Currying Management

```typescript
interface CurryingContext {
  innerPuzzles: Map<string, string> // name -> puzzle hash
  curriedValues: any[]
}

class CurryManager {
  prepareCurrying(
    coin: CoinDeclaration,
    context: CurryingContext
  ): CurryInstruction {
    const curryArgs = []
    
    // Add inner puzzles first (convention)
    for (const inner of coin.innerPuzzles || []) {
      const puzzleHash = context.innerPuzzles.get(inner.name)
      curryArgs.push({
        type: 'puzzle',
        value: puzzleHash
      })
    }
    
    // Then constructor parameters
    for (const param of coin.constructor?.parameters || []) {
      curryArgs.push({
        type: 'value',
        value: context.curriedValues[param.name]
      })
    }
    
    return {
      modHash: this.calculateModHash(coin),
      arguments: curryArgs
    }
  }
}
```

### Step 4: Solution Structure Generation

```typescript
class SolutionGenerator {
  generateSolutionStructure(
    action: ActionDeclaration,
    innerPuzzles: InnerPuzzleDeclaration[]
  ): SolutionTemplate {
    // Identify inner puzzle solution parameters
    const innerSolutionParams = action.parameters.filter(p =>
      p.type.includes('.Solution') || p.name.includes('inner_solution')
    )
    
    return {
      structure: this.buildSolutionNesting(innerSolutionParams),
      validation: this.generateValidationCode(innerSolutionParams)
    }
  }
  
  private buildSolutionNesting(params: Parameter[]): any {
    // Generate proper parentheses nesting for solutions
    // Critical for ChiaLisp compatibility
  }
}
```

## Advanced Implementation Patterns

### Pattern 5: State-Preserving Inner Puzzles

**CoinScript**:
```typescript
@stateful
coin StatefulWrapper {
  state {
    uint256 counter = 0
    address last_user
  }
  
  inner IStatelessPuzzle logic
  
  @stateful
  action execute(bytes inner_solution) {
    state.counter += 1
    state.last_user = msg.sender
    
    // Execute inner puzzle and preserve state
    let conditions = logic(inner_solution)
    return mergeWithState(conditions)
  }
}
```

**Implementation Notes**:
- State updates must be tracked
- Inner puzzle conditions must be merged with state recreation
- Use state management layer for automatic handling

### Pattern 6: Announcement-Based Communication

**CoinScript**:
```typescript
coin AnnouncingWrapper {
  inner IPuzzle base_logic
  
  action executeWithAnnouncement(
    bytes inner_solution,
    bytes32 expected_announcement
  ) {
    // Assert expected announcement exists
    assertAnnouncement(expected_announcement)
    
    // Execute inner puzzle
    let conditions = base_logic(inner_solution)
    
    // Create our own announcement
    createAnnouncement(sha256(conditions))
    
    return conditions
  }
}
```

**ChiaLisp Pattern**:
```lisp
(defun wrap_with_announcements (inner_conditions expected_ann)
  (c 
    (list ASSERT_PUZZLE_ANNOUNCEMENT expected_ann)
    (c
      (list CREATE_PUZZLE_ANNOUNCEMENT 
        (sha256tree inner_conditions))
      inner_conditions)))

; In main
(wrap_with_announcements 
  (a INNER_PUZZLE inner_solution)
  expected_announcement)
```

## Testing and Validation

### 1. Unit Test Generation

For each inner puzzle pattern, generate tests:

```typescript
describe('InnerPuzzle: TimeLockedVault', () => {
  it('should execute inner puzzle after unlock time', async () => {
    const innerPuzzle = createStandardPayment(owner)
    const wrapper = createTimeLockedVault(innerPuzzle, unlockTime)
    
    // Fast forward time
    await simulator.advanceBlocks(unlockTime)
    
    // Create inner solution
    const innerSolution = new SolutionBuilder()
      .add(recipient)
      .add(amount)
      .build()
    
    // Execute through wrapper
    const result = await simulator.run(wrapper, innerSolution)
    
    expect(result.conditions).toContainCondition(
      CREATE_COIN, recipient, amount
    )
  })
})
```

### 2. Integration Testing

Test layer composition:

```typescript
it('should properly compose multiple layers', async () => {
  const base = createPaymentPuzzle(owner)
  const withState = withStateLayer(base, initialState)
  const withRoyalty = withRoyaltyLayer(withState, artist, 10)
  
  // Test full stack execution
  const solution = createCompositeSolution({
    payment: { recipient, amount },
    state: { newValue: 42 }
  })
  
  const result = await simulator.run(withRoyalty, solution)
  
  // Verify all layers processed correctly
  expect(result).toHaveRoyaltyPayment(artist)
  expect(result).toHaveStateUpdate(42)
  expect(result).toHavePayment(recipient)
})
```

## Common Pitfalls and Solutions

### 1. Solution Nesting Issues

**Problem**: Incorrect parentheses depth
**Solution**: Use solution builder helpers

```typescript
// Helper for proper nesting
function buildInnerSolution(depth: number, params: any[]): string {
  let result = params.map(p => serialize(p)).join(' ')
  for (let i = 0; i < depth; i++) {
    result = `(${result})`
  }
  return result
}
```

### 2. Curry Order Mismatches

**Problem**: Inner puzzle curried in wrong position
**Solution**: Strict parameter ordering

```typescript
const CURRY_ORDER = [
  'INNER_PUZZLES',
  'CONSTANTS',
  'CONSTRUCTOR_PARAMS'
]
```

### 3. Condition Morphing Conflicts

**Problem**: Multiple layers trying to morph same condition
**Solution**: Layer precedence rules

```typescript
const LAYER_PRECEDENCE = {
  'singleton': 1,
  'cat': 2,
  'state': 3,
  'ownership': 4,
  'royalty': 5
}
```

## Performance Optimization

### 1. Puzzle Caching

Cache compiled inner puzzles:

```typescript
class InnerPuzzleCache {
  private cache = new Map<string, CompiledPuzzle>()
  
  getOrCompile(puzzle: PuzzleDeclaration): CompiledPuzzle {
    const key = this.generateKey(puzzle)
    
    if (!this.cache.has(key)) {
      this.cache.set(key, this.compile(puzzle))
    }
    
    return this.cache.get(key)!
  }
}
```

### 2. Solution Optimization

Minimize solution size:

```typescript
class SolutionOptimizer {
  optimize(solution: any): any {
    // Remove unnecessary nesting
    // Compress repeated values
    // Use references where possible
  }
}
```

## Conclusion

This implementation guide provides the foundation for adding inner puzzle support to CoinScript. The key is maintaining compatibility with ChiaLisp patterns while providing a clean, type-safe interface for developers. Start with simple patterns and gradually add more complex compositions as the implementation matures. 