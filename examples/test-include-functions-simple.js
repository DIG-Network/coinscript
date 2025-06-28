const { PuzzleBuilder } = require('../dist/builder');

console.log('=== Include Functions Demo (Simple) ===\n');

console.log('1. Using sha256tree.clib:');
console.log('─'.repeat(60));

// Example using sha256tree
const hashPuzzle = new PuzzleBuilder()
  .withMod()
  .include('sha256tree.clib')  // Include sha256tree
  .withSolutionParams('data', 'recipient')
  .comment('Example using sha256tree function')
  .comment('In practice, you would use: (sha256tree data)')
  .comment('to calculate the tree hash of data')
  .createCoin('recipient', 1000);

console.log('ChiaLisp output:');
console.log(hashPuzzle.serialize({ indent: true }));

console.log('\n2. Using singleton_truths.clib:');
console.log('─'.repeat(60));

// Example with singleton truths
const singletonPuzzle = new PuzzleBuilder()
  .withMod()
  .include('singleton_truths.clib')
  .withSolutionParams('truths', 'recipient', 'amount')
  .comment('Example using singleton truth functions')
  .comment('You can extract values like:')
  .comment('  (my-id-truth truths) -> coin ID')
  .comment('  (my-amount-truth truths) -> amount')
  .comment('  (my-inner-puzzle-hash-truth truths) -> inner puzzle hash')
  .createCoin('recipient', 'amount');

console.log('ChiaLisp output:');
console.log(singletonPuzzle.serialize({ indent: true }));

console.log('\n3. Using utility_macros.clib assert:');
console.log('─'.repeat(60));

// Example with assert macro
const assertPuzzle = new PuzzleBuilder()
  .withMod()
  .includeUtilityMacros()
  .includeConditionCodes()
  .withSolutionParams('amount', 'recipient')
  .comment('Using assert macro from utility_macros')
  // The require method automatically uses assert when utility macros are included
  .require(new PuzzleBuilder().param('amount').greaterThan(100))
  .createCoin('recipient', 'amount');

console.log('ChiaLisp output:');
console.log(assertPuzzle.serialize({ indent: true }));

console.log('\n4. Multiple includes example:');
console.log('─'.repeat(60));

// Example with multiple includes
const multiIncludePuzzle = new PuzzleBuilder()
  .withMod()
  .include('sha256tree.clib')
  .include('singleton_truths.clib')
  .includeUtilityMacros()
  .includeConditionCodes()
  .withSolutionParams('truths', 'recipient', 'amount')
  .comment('Puzzle with multiple includes')
  .comment('All functions from included files are available:')
  .comment('  - sha256tree from sha256tree.clib')
  .comment('  - singleton truth functions from singleton_truths.clib')  
  .comment('  - assert, or, and macros from utility_macros.clib')
  .comment('  - All condition constants from condition_codes.clib')
  .require(new PuzzleBuilder().param('amount').greaterThan(0))
  .createCoin('recipient', 'amount')
  .reserveFee(100);

console.log('ChiaLisp output:');
console.log(multiIncludePuzzle.serialize({ indent: true }));

console.log('\n=== Summary ===');
console.log('• Include files provide standard functions and macros');
console.log('• Functions become available when their .clib file is included');
console.log('• The framework tracks which features you use and can auto-include');
console.log('• You can manually include files to ensure functions are available');
console.log('• CoinScript will support calling these functions directly');
console.log('• Function names in ChiaLisp use kebab-case (my-id-truth)');
console.log('• CoinScript uses snake_case which gets converted (my_id_truth)'); 