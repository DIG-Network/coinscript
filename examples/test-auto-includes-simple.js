const { PuzzleBuilder, puzzle } = require('../dist/builder');

console.log('=== Automatic Includes Demo (Simple) ===\n');

console.log('1. Basic puzzle without manual includes:');
console.log('─'.repeat(60));

// Create a puzzle that uses conditions - should auto-include condition_codes.clib
const paymentPuzzle = new PuzzleBuilder()
  .withMod() 
  .withSolutionParams('recipient', 'amount')
  .comment('Simple payment puzzle with auto-includes')
  .createCoin('recipient', 'amount')
  .requireSignature('0x123456789abcdef')
  .reserveFee(100);

const serialized1 = paymentPuzzle.serialize({ indent: true });
console.log('ChiaLisp output:');
console.log(serialized1);

console.log('\n2. Same puzzle with manual includes:');
console.log('─'.repeat(60));

// Create the same puzzle but manually include condition_codes.clib
const paymentPuzzleManual = new PuzzleBuilder()
  .withMod()
  .includeConditionCodes() // Manually include
  .withSolutionParams('recipient', 'amount')
  .comment('Simple payment puzzle with manual includes')
  .createCoin('recipient', 'amount')
  .requireSignature('0x123456789abcdef')
  .reserveFee(100);

const serialized2 = paymentPuzzleManual.serialize({ indent: true });
console.log('ChiaLisp output:');
console.log(serialized2);

console.log('\n3. Puzzle using assert macro:');
console.log('─'.repeat(60));

// Create a puzzle that uses the assert macro
const assertPuzzle = new PuzzleBuilder()
  .withMod()
  .includeUtilityMacros() // Include utility macros for assert
  .withSolutionParams('amount')
  .comment('Puzzle using assert macro')
  .require(puzzle().param('amount').greaterThan(100))
  .createCoin('0xrecipient', 'amount');

const serialized3 = assertPuzzle.serialize({ indent: true });
console.log('ChiaLisp output:');
console.log(serialized3);

console.log('\n=== Key Points ===');
console.log('• When condition_codes.clib is included, symbolic names are used (CREATE_COIN vs 51)');
console.log('• The assert macro from utility_macros.clib provides cleaner assertions');
console.log('• Auto-includes detect which features are used and include the necessary files');
console.log('• Manual includes are respected and ensure symbolic names are used');
console.log('• The output follows standard ChiaLisp patterns used in the Chia ecosystem'); 