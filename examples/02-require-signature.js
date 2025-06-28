/**
 * Example 02: Require Signature
 * Learn: Security basics, storage variables, require statements
 */

const { parseCoinScriptFile, createSolution } = require('../dist');
const { 
  showHeader, 
  showCoinScriptSource, 
  showPuzzle, 
  showSolution,
  showNote,
  showConcepts,
  showSeparator,
  showFooter 
} = require('./example-utils');

// Display header
showHeader('02', 'Require Signature', 'Adding security with signature requirements.');

// Show the CoinScript source
showCoinScriptSource('./02-require-signature.coins');

// Compile the coin
const result = parseCoinScriptFile('./02-require-signature.coins');
const puzzle = result.mainPuzzle;
showPuzzle(puzzle);

// Explain the security model
console.log('🔐 Security Model:');
console.log('   1. The authorized address is baked into the puzzle (curried)');
console.log('   2. When spending, the blockchain verifies msg.sender');
console.log('   3. Only the holder of the private key can create valid signature');
console.log('   4. The signature covers both conditions AND coin ID');
console.log();

showSeparator();

// Create a solution - same as before!
const solution = createSolution()
  .addConditions(conditions => {
    conditions
      .createCoin('0x' + '11'.repeat(32), 950)
      .reserveFee(50);
  });

showSolution(solution, 'Solution is the same as Example 01!');

showNote('The security is in the PUZZLE, not the solution. The solution looks identical to a basic payment.', 'info');

// What you need to spend
console.log('🔑 To Spend This Coin:');
console.log('   1. The solution (shown above)');
console.log('   2. A signature from the authorized address');
console.log('   3. The signature is added to the spend bundle (not shown here)');
console.log();

// Key concepts
showConcepts([
  'storage: Immutable variables (part of puzzle hash)',
  'require(): Assertions that must be true',
  'msg.sender: The address that signed the spend',
  'Security comes from the puzzle, not the solution'
]);

showFooter(); 