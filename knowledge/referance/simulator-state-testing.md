# Chia Simulator State Management Testing Guide

This guide demonstrates how to test state management in CoinScript contracts using the Chia blockchain simulator.

## Overview

The Chia simulator allows us to test state persistence across multiple blocks, verifying that the state machine pattern works correctly in a real blockchain environment.

## Prerequisites

```bash
npm install @dignetwork/datalayer-driver bip39 chia-bls
```

## Key Concepts

### 1. State Persistence
In Chia, state is maintained by creating new coins with the same puzzle hash but updated state data. Each spend creates a new coin that carries forward the state.

### 2. State Machine Pattern
The state machine pattern uses:
- A main puzzle that routes actions
- Individual action puzzles that handle state transitions
- Merkle trees to efficiently store multiple actions
- CREATE_COIN conditions to recreate the coin with updated state

### 3. Simulator Integration
The simulator provides:
- Block generation on demand
- Coin creation and spending
- Transaction verification
- State tracking across blocks

## Test Structure

### Basic State Test

```typescript
describe('State Management with Chia Simulator', () => {
  let peer: Peer;
  let compiledContract: any;
  
  beforeAll(async () => {
    // Initialize simulator
    const tls = new Tls('ca.crt', 'ca.key');
    peer = await Peer.new('', PeerType.Simulator, tls);
    
    // Compile stateful contract
    const contractSource = `
      coin StatefulCounter {
        state {
          uint256 counter;
          address lastUpdater;
          uint256 lastUpdateTime;
        }
        
        @stateful
        action increment() {
          state.counter += 1;
          state.lastUpdater = msg.sender;
          state.lastUpdateTime = currentTime();
          recreateSelf();
        }
      }
    `;
    
    compiledContract = compileCoinScript(contractSource);
  });
```

### State Increment Test

```typescript
test('should increment counter across blocks', async () => {
  // Create initial coin
  const puzzle = await simulatorNewPuzzle(1n);
  let currentCoin = await peer.simulatorNewCoin(puzzle.puzzleHash, 1000n);
  
  // Track state
  let counter = 0;
  
  // Perform 5 increments
  for (let i = 0; i < 5; i++) {
    // Create solution with current state
    const solution = createSolution()
      .addAction('increment')
      .addState({
        counter: counter,
        lastUpdater: '0x...',
        lastUpdateTime: Date.now()
      })
      .build();
    
    // Create and sign coin spend
    const coinSpends = [{
      coin: currentCoin,
      puzzleReveal: puzzle.puzzleReveal,
      solution: simulatorNewProgram(serialize(solution))
    }];
    
    const sig = signCoinSpends(coinSpends, [secretKey], true);
    await peer.broadcastSpend(coinSpends, [sig]);
    
    // Advance block
    await peer.simulatorAdvanceBlock();
    counter++;
    
    // Get new coin (in reality from spend conditions)
    currentCoin = await peer.simulatorNewCoin(puzzle.puzzleHash, 1000n);
  }
  
  expect(counter).toBe(5);
});
```

## Test Scenarios

### 1. Basic State Persistence
- Create initial coin with state
- Modify state through actions
- Verify state persists across blocks

### 2. Complex State Transitions
- Multiple state variables
- Conditional state changes
- State validation rules

### 3. Value Transfers with State
- Transfer funds while maintaining state
- Update balances in state
- Track transaction history

### 4. Access Control
- Owner-only actions
- Multi-signature requirements
- Permission-based state changes

### 5. State History Tracking
- Track state changes over time
- Analyze state at specific blocks
- Verify state integrity

## Running the Tests

```bash
# Run simulator tests
npm test -- --testPathPattern="chia-simulator-state"

# With verbose output
npm test -- --testPathPattern="chia-simulator-state" --verbose
```

## Example: Complete State Test

```typescript
import { compileCoinScript } from '../../coinscript';
import { createSolution } from '../../builder/SolutionBuilder';

test('should maintain state across transfers', async () => {
  // Initialize
  const puzzle = compiledContract.mainPuzzle;
  const initialAmount = 10000n;
  
  // Create coin
  const coin = await peer.simulatorNewCoin(
    puzzle.toModHash(), 
    initialAmount
  );
  
  // Transfer with state update
  const solution = createSolution()
    .addAction('transfer')
    .addParams(['0xrecipient', 2500])
    .addState({
      counter: 10,
      lastUpdater: ownerAddress,
      lastUpdateTime: Date.now(),
      totalValue: 10000
    })
    .build();
  
  // Execute transfer
  const coinSpends = [{
    coin,
    puzzleReveal: puzzle.serialize(),
    solution: simulatorNewProgram(serialize(solution))
  }];
  
  const sig = signCoinSpends(coinSpends, [secretKey], true);
  await peer.broadcastSpend(coinSpends, [sig]);
  await peer.simulatorAdvanceBlock();
  
  // Verify spend
  const coinState = await peer.simulatorCoinState(getCoinId(coin));
  expect(coinState?.spentHeight).toBeDefined();
});
```

## Best Practices

### 1. State Validation
- Always validate state transitions
- Check permissions before state changes
- Ensure state consistency

### 2. Error Handling
- Handle failed spends gracefully
- Verify signatures properly
- Check coin existence

### 3. Performance
- Batch transactions when possible
- Minimize state size
- Use efficient data structures

### 4. Security
- Validate all inputs
- Use proper access control
- Sign all state changes

## Debugging Tips

### 1. Check Coin State
```typescript
const coinState = await peer.simulatorCoinState(coinId);
console.log('Spent at height:', coinState?.spentHeight);
```

### 2. Verify Conditions
```typescript
// Log generated conditions
console.log('Conditions:', puzzle.serialize());
```

### 3. Track State History
```typescript
const stateHistory = [];
// After each spend
stateHistory.push({
  block: await peer.getPeak(),
  state: currentState
});
```

## Advanced Topics

### 1. State Merkle Trees
For complex state with many fields, use merkle trees to efficiently prove state updates.

### 2. State Migration
Handle contract upgrades by migrating state to new puzzle formats.

### 3. Cross-Contract State
Share state between multiple contracts using announcements and assertions.

## Conclusion

The Chia simulator provides a powerful environment for testing stateful smart contracts. By following these patterns, you can ensure your CoinScript contracts maintain state correctly across blockchain transactions. 