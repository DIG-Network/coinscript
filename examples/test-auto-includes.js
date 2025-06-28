const { PuzzleBuilder, puzzle } = require('../dist/builder');
const path = require('path');

console.log('=== Automatic Includes Demo ===\n');

console.log('1. Creating puzzle with conditions (auto-includes condition_codes.clib):');
console.log('─'.repeat(60));

// Create a puzzle that uses condition codes
const paymentPuzzle = puzzle()
  .withSolutionParams('recipient', 'amount')
  .comment('Simple payment puzzle')
  .createCoin('recipient', 'amount')
  .requireSignature('0x123456789abcdef')
  .reserveFee(100);

console.log('ChiaLisp output:');
console.log(paymentPuzzle.serialize({ indent: true }));

console.log('\n2. Creating puzzle with assertions (uses assert macro):');
console.log('─'.repeat(60));

// Create a puzzle that uses the assert macro
const assertPuzzle = puzzle()
  .withSolutionParams('owner', 'amount')
  .comment('Puzzle with assertions')
  .require(puzzle().param('amount').greaterThan(100))
  .createCoin('owner', 'amount');

console.log('ChiaLisp output:');
console.log(assertPuzzle.serialize({ indent: true }));

console.log('\n3. Creating puzzle with multiple features:');
console.log('─'.repeat(60));

// Create a more complex puzzle
const complexPuzzle = puzzle()
  .withSolutionParams('recipient', 'amount', 'memo')
  .includeUtilityMacros() // Manually include for demonstration
  .comment('Complex puzzle with multiple features')
  
  // Use assert macro
  .require(puzzle().param('amount').greaterThan(0))
  
  // Create coin with memo
  .createCoin('recipient', 'amount', 'memo')
  
  // Add signature requirement
  .requireSignature('0xpubkey123')
  
  // Add time lock
  .requireAfterSeconds(3600)
  
  // Create announcement
  .createAnnouncement('0xannouncement')
  
  // Reserve fee
  .reserveFee(1000);

console.log('ChiaLisp output:');
console.log(complexPuzzle.serialize({ indent: true }));

console.log('\n4. Manual vs Auto includes:');
console.log('─'.repeat(60));

// Without manual include - should auto-include
const autoIncludePuzzle = puzzle()
  .withSolutionParams('recipient', 'amount')
  .createCoin('recipient', 'amount')
  .reserveFee(50);

console.log('Auto-include (condition codes detected automatically):');
console.log(autoIncludePuzzle.serialize({ indent: true }));

// With manual include - respects user preference
const manualIncludePuzzle = puzzle()
  .includeConditionCodes()  // Manually include
  .withSolutionParams('recipient', 'amount')
  .createCoin('recipient', 'amount')
  .reserveFee(50);

console.log('\nManual include (explicitly included):');
console.log(manualIncludePuzzle.serialize({ indent: true }));

console.log('\n=== Key Features Demonstrated ===');
console.log('1. Automatic detection and inclusion of required .clib files');
console.log('2. Symbolic constants (CREATE_COIN, AGG_SIG_ME, etc.) used when includes present');
console.log('3. Utility macros (assert) used instead of manual patterns');
console.log('4. Smart feature tracking ensures minimal includes');
console.log('5. Manual includes are respected and not duplicated');

console.log('\n=== Benefits ===');
console.log('• Cleaner, more readable ChiaLisp output');
console.log('• Follows standard ChiaLisp patterns');
console.log('• Reduces code duplication');
console.log('• Easier to understand and maintain');
console.log('• Compatible with standard Chia tooling'); 