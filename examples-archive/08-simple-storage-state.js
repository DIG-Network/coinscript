/**
 * Example 08: Simple Storage vs State
 * Basic demonstration of immutable storage vs mutable state
 */

const { parseCoinScriptFile } = require('../dist');

console.log('=== Example 08: Simple Storage vs State ===\n');

// Compile the CoinScript
const puzzle = parseCoinScriptFile('./08-simple-storage-state.coins');

console.log('Generated ChiaLisp:');
console.log(puzzle.serialize({ indent: true }));

console.log('\nPuzzle hash:', puzzle.toModHash());

console.log('\n=== Understanding the Output ===');
console.log('\nStorage (ADMIN address):');
console.log('- You can see the ADMIN address is directly substituted in the code');
console.log('- It\'s part of the puzzle hash - changing it creates a different puzzle');
console.log('- This is currying - the value is baked into the puzzle');

console.log('\nState (counter):');
console.log('- The counter value is NOT in the puzzle code');
console.log('- It\'s passed through the state layer');
console.log('- The state layer manages reading/writing state from coin memos');
console.log('- Same puzzle can have different counter values');

console.log('\n=== Key Insight ===');
console.log('Storage = Part of the code (immutable)');
console.log('State = Part of the data (mutable)'); 