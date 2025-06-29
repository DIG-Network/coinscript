# Builder Module API Reference

## Overview
The builder module provides fluent APIs for constructing Chia puzzles and solutions. It offers high-level abstractions over raw ChiaLisp while maintaining full control.

## PuzzleBuilder

### Core Concepts
- **Fluent Interface**: Chain method calls for readable code
- **Auto-includes**: Automatically includes required libraries
- **Mod Structure**: Generates proper ChiaLisp modules
- **Type Safety**: TypeScript types for all operations

### Basic Usage
```typescript
import { puzzle } from '@/builder';

const myPuzzle = puzzle()
  .comment('My first puzzle')
  .requireSignature(publicKey)
  .createCoin(recipientHash, amount)
  .build();
```

### Factory Functions
```typescript
// Create a new puzzle builder
puzzle(): PuzzleBuilder

// Create expression for composable values
expr(value: number | bigint | string | TreeNode): Expression

// Create variable reference
variable(name: string): Expression

// Built-in expressions
amount: Expression    // Reference to coin amount
arg1: Expression     // First argument
arg2: Expression     // Second argument
arg3: Expression     // Third argument
solution: Expression // Solution reference
```

## Condition Builders

### Coin Operations
```typescript
// Create a new coin
createCoin(
  puzzleHash: string | Uint8Array, 
  amount: number | bigint | Expression, 
  memo?: string | Uint8Array
): PuzzleBuilder

// Reserve fee from the coin
reserveFee(amount: number | bigint | Expression): PuzzleBuilder
```

### Signatures
```typescript
// Require signature with automatic message
requireSignature(pubkey: string | Uint8Array, message?: Expression): PuzzleBuilder

// Require signature (alias)
requireMySignature(pubkey: string | Uint8Array): PuzzleBuilder

// Require signature with custom message (unsafe)
requireSignatureUnsafe(pubkey: string | Uint8Array, message: Expression): PuzzleBuilder
```

### Time Locks
```typescript
// Relative time locks
requireAfterSeconds(seconds: number | Expression): PuzzleBuilder
requireAfterHeight(height: number | Expression): PuzzleBuilder
requireBeforeSeconds(seconds: number | Expression): PuzzleBuilder
requireBeforeHeight(height: number | Expression): PuzzleBuilder

// Absolute time locks (use assertXxx naming)
assertSecondsAbsolute(timestamp: number | Expression): PuzzleBuilder
assertHeightAbsolute(height: number | Expression): PuzzleBuilder
```

### Announcements
```typescript
// Create announcements
createAnnouncement(message: string | Uint8Array): PuzzleBuilder
createPuzzleAnnouncement(message: string | Uint8Array): PuzzleBuilder

// Assert announcements exist
assertAnnouncement(announcementId: string | Uint8Array): PuzzleBuilder
assertPuzzleAnnouncement(announcementId: string | Uint8Array): PuzzleBuilder
```

### Assertions
```typescript
// Assert coin properties
assertMyCoinId(id: string | Uint8Array): PuzzleBuilder
assertMyPuzzleHash(hash: string | Uint8Array): PuzzleBuilder
assertMyParentId(id: string | Uint8Array): PuzzleBuilder
assertMyAmount(amount: number | bigint | Expression): PuzzleBuilder
```

### Raw Conditions
```typescript
// Add any condition by opcode
addCondition(
  opcode: number, 
  ...args: (Expression | string | number | Uint8Array)[]
): PuzzleBuilder
```

## Control Flow

### Conditional Execution
```typescript
// If-then-else control flow
if(condition: Expression): PuzzleBuilder
then(callback: (builder: PuzzleBuilder) => void): PuzzleBuilder
else(callback: (builder: PuzzleBuilder) => void): PuzzleBuilder
elseIf(condition: Expression, callback: (builder: PuzzleBuilder) => void): PuzzleBuilder

// Example:
puzzle()
  .if(amount.greaterThan(100))
  .then(b => b.createCoin(addr1, amount))
  .else(b => b.createCoin(addr2, amount))
```

### Requirements
```typescript
// Assert condition is true or fail
require(condition: Expression, message?: string): PuzzleBuilder

// Always fail with optional message
fail(message?: string): PuzzleBuilder
```

## Module Structure

### Parameters
```typescript
// Define curried parameters (baked into puzzle)
withCurriedParams(params: Record<string, any>): PuzzleBuilder

// Define solution parameters (provided when spending)
withSolutionParams(...params: string[]): PuzzleBuilder

// Access parameters
param(name: string): Expression
```

### Includes
```typescript
// Include library files
include(libraryPath: string): PuzzleBuilder
includeConditionCodes(): PuzzleBuilder
includeCurryAndTreehash(): PuzzleBuilder
includeCatTruths(): PuzzleBuilder
includeUtilityMacros(): PuzzleBuilder
includeOpcodes(): PuzzleBuilder
includeStandardLibraries(): PuzzleBuilder
```

### Comments
```typescript
// Add comment to next node
comment(text: string): PuzzleBuilder

// Add standalone block comment
blockComment(text: string): PuzzleBuilder
```

## Patterns

### Standard Patterns
```typescript
// Pay to conditions (execute solution)
payToConditions(): PuzzleBuilder

// Pay to public key
payToPublicKey(pubkey: string | Uint8Array): PuzzleBuilder

// Delegated puzzle (run puzzle from solution)
delegatedPuzzle(): PuzzleBuilder

// Return conditions from solution
returnConditions(): PuzzleBuilder

// Return specific value
returnValue(value: Expression | string | number): PuzzleBuilder
```

### Loops (Unrolled)
```typescript
// Repeat operation N times
repeat(count: number, callback: (index: number, builder: PuzzleBuilder) => void): PuzzleBuilder

// Iterate over items
forEach<T>(items: T[], callback: (item: T, index: number, builder: PuzzleBuilder) => void): PuzzleBuilder
```

### Composition
```typescript
// Merge another builder's nodes
merge(other: PuzzleBuilder): PuzzleBuilder

// Wrap current puzzle
wrap(wrapper: (inner: TreeNode) => TreeNode): PuzzleBuilder
```

## Building and Output

### Build Methods
```typescript
// Build to TreeNode
build(): TreeNode

// Serialize with options
serialize(options?: SerializeOptions): string

interface SerializeOptions {
  indent?: boolean;              // Pretty print
  format?: 'chialisp' | 'clvm' | 'hex' | 'modhash';
  compiled?: boolean;            // Compile to CLVM
  single_puzzle?: boolean;       // Curry all inner puzzles
  innerPuzzles?: PuzzleBuilder[]; // For single_puzzle mode
}

// Get puzzle hash
toModHash(): string

// Curry with values
curry(values?: Record<string, any>): TreeNode
```

### Simulation
```typescript
// Test puzzle execution
simulate(solution: string | number[] | SolutionBuilder | Program): {
  result: unknown;
  cost: number;
}

// Validate conditions
validateConditions(solution: any): boolean
```

## Expression API

### Arithmetic
```typescript
expression.add(other: Expression | number | bigint): Expression
expression.subtract(other: Expression | number | bigint): Expression
expression.multiply(other: Expression | number | bigint): Expression
expression.divide(other: Expression | number | bigint): Expression
```

### Comparison
```typescript
expression.greaterThan(other: Expression | number | bigint): Expression
expression.greaterThanBytes(other: Expression | string | Uint8Array): Expression
expression.equals(other: Expression | number | bigint | string): Expression
```

### Logic
```typescript
expression.not(): Expression
expression.and(other: Expression): Expression
expression.or(other: Expression): Expression
```

### Hashing
```typescript
expression.sha256(): Expression
expression.treeHash(): Expression
```

## SolutionBuilder

### Basic Usage
```typescript
import { createSolution } from '@/builder';

const solution = createSolution()
  .add('pay')           // action name
  .add(recipientAddr)   // parameter
  .add(1000)           // amount
  .build();
```

### Builder Methods
```typescript
// Add single value
add(value: string | number | bigint | Uint8Array | TreeNode | boolean): SolutionBuilder

// Add multiple values
addMany(...values: Array<any>): SolutionBuilder

// Add nested list
addList(callback: (builder: SolutionBuilder) => void): SolutionBuilder

// Add nil
addNil(): SolutionBuilder

// Add conditions (for pay-to-conditions)
addConditions(callback: (builder: ConditionListBuilder) => void): SolutionBuilder

// Add state for stateful puzzles
addState(state: Record<string, StateValue>): SolutionBuilder

// Add action with parameters
addAction(actionName: string, params?: Array<any>): SolutionBuilder

// Add merkle proof
addMerkleProof(proof: string[]): SolutionBuilder

// Add delegated puzzle/solution
addDelegatedPuzzle(puzzle: TreeNode, solution: TreeNode): SolutionBuilder
```

### Structure Types
```typescript
// Default list structure
solution.build() // Returns list

// Cons cell structure  
solution.asConsCell().build()

// Raw structure
solution.asRaw().build()
```

### Output Methods
```typescript
// Build to TreeNode
build(): TreeNode

// Serialize to ChiaLisp
serialize(options?: { indent?: boolean }): string

// Convert to hex
toHex(): string
```

## ConditionListBuilder

Specialized builder for creating condition lists:

```typescript
const conditions = createConditions()
  .createCoin(puzzleHash, amount, memo?)
  .reserveFee(amount)
  .requireSignature(pubkey)
  .createAnnouncement(message)
  .assertAnnouncement(coinId, message?)
  .assertSecondsRelative(seconds)
  .assertHeightAbsolute(height)
  .aggSigMe(pubkey, message)
  .requireAfterHeight(height)
  .requireAfterSeconds(seconds)
  .addRawCondition(opcode, ...args)
  .build();
```

## Advanced Features

### Loading External Puzzles
```typescript
// Load from ChiaLisp file
PuzzleBuilder.fromClsp(filePath: string): PuzzleBuilder

// Load from CoinScript file  
PuzzleBuilder.fromCoinScript(filePath: string): PuzzleBuilder
```

### Custom Mod Structure
```typescript
// Disable mod generation
puzzle().noMod()

// Use custom mod
puzzle().withMod(modAst: TreeNode)
```

## Common Examples

### Simple Payment
```typescript
const payment = puzzle()
  .comment('Simple payment puzzle')
  .requireSignature(ownerPubkey)
  .createCoin(recipientHash, amount)
  .build();
```

### Time-locked Vault
```typescript
const vault = puzzle()
  .withCurriedParams({
    OWNER: ownerPubkey,
    UNLOCK_TIME: unlockTimestamp
  })
  .requireSignature('OWNER')
  .requireAfterSeconds('UNLOCK_TIME')
  .payToConditions()
  .build();
```

### Multi-signature
```typescript
const multiSig = puzzle()
  .withCurriedParams({
    PUBKEY1: pubkey1,
    PUBKEY2: pubkey2,
    THRESHOLD: 2
  })
  .requireSignature('PUBKEY1')
  .requireSignature('PUBKEY2')
  .payToConditions()
  .build();
```

## Best Practices

1. **Use Comments**: Document complex logic with comments
2. **Parameter Names**: Use UPPERCASE for curried params, lowercase for solution params
3. **Expression Reuse**: Store expressions in variables for clarity
4. **Error Handling**: Use require() for validation
5. **Testing**: Always simulate puzzles before deployment
6. **Auto-includes**: Let the builder handle includes automatically 