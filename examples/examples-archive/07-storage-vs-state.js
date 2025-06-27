/**
 * Example 07: Storage vs State
 * Demonstrates immutable storage (curried) vs mutable state (in memo)
 */

const { parseCoinScriptFile, createSolution } = require('../dist');

console.log('=== Example 07: Storage vs State ===\n');

// Compile the CoinScript
const puzzle = parseCoinScriptFile('./07-storage-vs-state.coins');

console.log('Generated ChiaLisp:');
console.log(puzzle.serialize({ indent: true }));

console.log('\nPuzzle hash:', puzzle.toModHash());

console.log('\n=== Key Differences ===');
console.log('\nStorage (Immutable):');
console.log('- ADMIN address is curried into the puzzle hash');
console.log('- MAX_SUPPLY and CREATION_TIME are constants');
console.log('- These values CANNOT change - they define the puzzle');
console.log('- Changing them would create a different puzzle hash');

console.log('\nState (Mutable):');
console.log('- currentSupply, currentOwner, isPaused are stored in coin memo');
console.log('- These values CAN change between spends');
console.log('- Updates create a new coin with the same puzzle but different state');
console.log('- State is passed through the solution and validated');

console.log('\n=== Creating Solutions ===\n');

// Solution 1: Default spend
console.log('1. Default spend:');
const defaultSolution = createSolution()
  .addConditions(conditions => {
    conditions
      .createCoin('0x' + '77'.repeat(32), 1000);
  });

console.log('Solution:', defaultSolution.serialize());
console.log('   (Anyone can spend if not paused)\n');

// Solution 2: Mint tokens (with state)
console.log('2. Mint tokens (admin only):');
const mintSolution = createSolution()
  .addAction('mint')
  .add(100000)  // amount to mint
  .addConditions(conditions => {
    conditions
      .createCoin('0x' + '88'.repeat(32), 100000)  // Minted tokens
      .createCoin(puzzle.toModHash(), 1, {          // Recreate state coin
        state: {
          currentSupply: 100000,
          currentOwner: '0xabcd...',
          isPaused: false
        }
      });
  });

console.log('Solution:', mintSolution.serialize());
console.log('   (Updates currentSupply in new coin state)\n');

// Solution 3: Transfer ownership
console.log('3. Transfer ownership:');
const transferOwnershipSolution = createSolution()
  .addAction('transfer_ownership')
  .add('0x' + '99'.repeat(32))  // new owner
  .addConditions(conditions => {
    conditions
      .createCoin(puzzle.toModHash(), 1, {
        state: {
          currentSupply: 100000,
          currentOwner: '0x' + '99'.repeat(32),  // Updated owner
          isPaused: false
        }
      });
  });

console.log('Solution:', transferOwnershipSolution.serialize());
console.log('   (Updates currentOwner in state)\n');

console.log('=== In Practice ===');
console.log('When spending this coin:');
console.log('1. The puzzle verifies immutable rules (ADMIN check, MAX_SUPPLY)');
console.log('2. State is read from the current coin\'s memo');
console.log('3. Actions can update state values');
console.log('4. New coins are created with updated state in their memos');
console.log('5. The puzzle hash remains the same (same code, different state)'); 