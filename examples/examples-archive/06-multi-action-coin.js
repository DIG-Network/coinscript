/**
 * Example 06: Multi-Action Coin
 * Demonstrates a coin with multiple spend paths using default and named actions
 */

const { parseCoinScriptFile, createSolution } = require('../dist');

console.log('=== Example 06: Multi-Action Coin ===\n');

// Compile the CoinScript
const puzzle = parseCoinScriptFile('./06-multi-action-coin.coins');

console.log('Generated ChiaLisp:');
console.log(puzzle.serialize({ indent: true }));

console.log('\nPuzzle hash:', puzzle.toModHash());

console.log('\nThis coin has multiple actions:');
console.log('1. default - Anyone can spend if not frozen (no ACTION parameter needed)');
console.log('2. transfer_ownership - Owner transfers ownership (ACTION="transfer_ownership")');
console.log('3. freeze_coin - Owner freezes the coin (ACTION="freeze_coin")');
console.log('4. burn_coin - Owner destroys the coin (ACTION="burn_coin")');

console.log('\n=== Creating Solutions ===\n');

// Solution 1: Default spend (no action specified)
console.log('1. Default spend (anyone can use):');
const defaultSolution = createSolution()
  .addConditions(conditions => {
    conditions
      .createCoin('0x' + '55'.repeat(32), 950)
      .reserveFee(50);
  });

console.log('Solution:', defaultSolution.serialize());
console.log('   (No action specified - uses default)\n');

// Solution 2: Transfer ownership
console.log('2. Transfer ownership (owner only):');
const transferSolution = createSolution()
  .addAction('transfer_ownership')
  .add('0x' + '66'.repeat(32))  // new_owner address
  .addConditions(conditions => {
    conditions
      .createCoin('0x' + '66'.repeat(32), 1000);  // Recreate coin with new owner
  });

console.log('Solution:', transferSolution.serialize());
console.log('   (Transfers ownership to 0x6666...)\n');

// Solution 3: Freeze coin
console.log('3. Freeze coin (owner only):');
const freezeSolution = createSolution()
  .addAction('freeze_coin');

console.log('Solution:', freezeSolution.serialize());
console.log('   (Freezes the coin - no further default spends)\n');

// Solution 4: Burn coin
console.log('4. Burn coin (owner only):');
const burnSolution = createSolution()
  .addAction('burn_coin');

console.log('Solution:', burnSolution.serialize());
console.log('   (Destroys the coin - no outputs created)\n');

console.log('=== Key Insights ===');
console.log('- Default action requires no ACTION parameter');
console.log('- Named actions require ACTION as first solution parameter');
console.log('- The puzzle routes to appropriate logic based on ACTION');
console.log('- Access control is enforced within each action'); 