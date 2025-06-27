/**
 * Example 01: Basic Payment
 * The simplest possible Chia coin
 */

const { parseCoinScriptFile, createSolution } = require('../dist');
const { serialize } = require('../dist/core');

console.log('=== Example 01: Basic Payment ===\n');

// Compile the CoinScript
const puzzle = parseCoinScriptFile('./01-basic-payment.coins');

console.log('Generated ChiaLisp:');
console.log(puzzle.serialize({ indent: true }));

console.log('\nPuzzle hash:', puzzle.toModHash());

console.log('\nThis is the simplest possible Chia coin.');
console.log('It accepts conditions from the solution and returns them.');
console.log('Anyone can spend it by providing valid conditions.');

// Create a solution for spending this coin
console.log('\n=== Creating a Solution ===\n');

const solution = createSolution()
  .addConditions(conditions => {
    conditions
      .createCoin('0x' + '11'.repeat(32), 500)  // Send half to address1
      .createCoin('0x' + '22'.repeat(32), 450)  // Send rest minus fee to address2
      .reserveFee(50);                          // Reserve 50 mojos for fee
  });

console.log('Solution (conditions to execute):');
console.log(solution.serialize());

console.log('\nThis solution will:');
console.log('1. Create a coin with 500 mojos to address 0x1111...');
console.log('2. Create a coin with 450 mojos to address 0x2222...');
console.log('3. Reserve 50 mojos as network fee');
console.log('\nTotal: 500 + 450 + 50 = 1000 mojos (must match coin amount)'); 