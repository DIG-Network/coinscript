# SmartCoin Integration Documentation

## Overview

The SmartCoin abstraction has been successfully integrated into the Chia Puzzle Framework as part of the driver layer (Layer 2). This high-level abstraction simplifies the creation and management of smart coins by providing automatic change handling, fee management, and spend bundle construction.

## Key Features

### 1. Coin Creation
```typescript
// Create with puzzle hash
const coin1 = SmartCoin.create("0x...", 1000n);

// Create with puzzle program
const coin2 = SmartCoin.create(puzzleProgram, 1000n);
```

### 2. Coin Spending
```typescript
// Spend an existing coin
const smartCoin = SmartCoin.fromCoin(existingCoin, puzzleProgram);

// Define outputs
const outputs = [
  { puzzle: recipientPuzzleHash, amount: 3000n },
  { puzzle: anotherPuzzleHash, amount: 4000n }
];

// SmartCoin automatically handles change
const spendBundle = smartCoin.spend(outputs, changePuzzle?, fee?);
```

### 3. Automatic Change Handling
- Unspent value is automatically returned to the original puzzle
- Custom change addresses can be specified
- No manual calculation required

### 4. Fee Management
- Simply specify the fee amount
- SmartCoin ensures the total outputs + fee don't exceed the coin amount

### 5. Custom Solutions
- For complex puzzles, provide your own CLVM solution
- Bypasses automatic condition generation

## Integration Points

### Location
- **Module**: `src/driver/smartcoin/SmartCoin.ts`
- **Exports**: Available via `import { SmartCoin } from 'chia-puzzle-framework'`

### Dependencies
- Uses existing framework types (Bytes32, Coin, CoinSpend, SpendBundle)
- Integrates with Condition factory for automatic solution generation
- Compatible with all puzzle types from Layer 1

### Type Definitions
```typescript
export type HexString = string;
export type PuzzleInput = Program | HexString;

export class SmartCoin {
  readonly coin?: Coin;
  readonly puzzle?: Program;
  readonly puzzleHash: Bytes32;
  readonly amount: bigint;
  
  static fromCoin(coin: Coin, puzzle: Program): SmartCoin;
  static create(puzzleOrHash: PuzzleInput, amount: number | bigint): SmartCoin;
  
  getCoinId(): Bytes32;
  spend(
    outputs?: { puzzle: PuzzleInput; amount: number | bigint }[],
    changePuzzle?: PuzzleInput,
    fee?: number | bigint,
    solution?: Program | HexString
  ): SpendBundle;
  
  static combineSpendBundles(bundles: SpendBundle[]): SpendBundle;
}
```

## Usage Examples

### Basic Payment
```typescript
const smartCoin = SmartCoin.fromCoin(myCoin, myPuzzle);
const spendBundle = smartCoin.spend([
  { puzzle: recipientPuzzleHash, amount: 1000n }
], undefined, 100n); // 100 mojo fee
```

### Multiple Recipients
```typescript
const outputs = [
  { puzzle: alice, amount: 500n },
  { puzzle: bob, amount: 300n },
  { puzzle: charlie, amount: 200n }
];
const spendBundle = smartCoin.spend(outputs);
```

### Custom Change Address
```typescript
const spendBundle = smartCoin.spend(
  [{ puzzle: recipient, amount: 800n }],
  myChangePuzzleHash,
  50n
);
```

## Implementation Details

### Change Calculation
1. Sum all output amounts
2. Add fee
3. If total < coin amount, create change output
4. Change goes to specified puzzle or original puzzle

### Solution Generation
When no custom solution is provided:
1. Creates CREATE_COIN conditions for each output
2. Adds change output if needed
3. Wraps conditions in proper CLVM structure

### Error Handling
- Validates coin existence before spending
- Checks for overspending
- Ensures non-negative fees
- Verifies puzzle hash matches when using fromCoin

## Testing

Comprehensive test suite in `src/__tests__/smartcoin.test.ts`:
- Factory method tests
- Spending scenarios (single/multiple outputs, fees, change)
- Error cases
- Integration with StandardPuzzle
- Utility methods

## Future Enhancements

1. **CLVM Integration**: Currently uses placeholder for solution encoding
2. **Signature Support**: Integrate with SignatureService for automatic signing
3. **Optimization**: Batch operations for multiple coins
4. **Validation**: Enhanced puzzle reveal validation

## Conclusion

The SmartCoin abstraction successfully provides a high-level interface for Chia coin management, making it easier for developers to create and spend smart coins without dealing with low-level details. It integrates seamlessly with the existing framework architecture and follows the established patterns of the codebase. 