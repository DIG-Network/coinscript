/**
 * Exception Handling Example
 * Demonstrates how the 'exception' keyword generates (x) in ChiaLisp
 */

const { parseCoinScriptFile } = require('../dist');
const path = require('path');

console.log('=== Exception Handling Example ===\n');

// Parse the SafeVault coin
const puzzlePath = path.join(__dirname, '08-exception-handling.coins');
const result = parseCoinScriptFile(puzzlePath);
const puzzle = result.mainPuzzle;

console.log('SafeVault Puzzle:');
console.log('─'.repeat(50));
console.log(puzzle.serialize({ indent: true }));

console.log('\n\nKey Points:');
console.log('─'.repeat(50));
console.log('1. The exception keyword compiles to (x) in ChiaLisp');
console.log('2. exception("message") and exception; both generate (x)');
console.log('3. Unlike require(), exception always fails unconditionally');
console.log('4. Useful for explicit error cases and validation');

console.log('\n\nAnalysis of Generated ChiaLisp:');
console.log('─'.repeat(50));

// Count occurrences of (x) in the output
const clsp = puzzle.serialize();
const xOccurrences = (clsp.match(/\(x\)/g) || []).length;

console.log(`✓ Found ${xOccurrences} occurrences of (x) in the generated code`);
console.log('\nEach (x) corresponds to an exception statement:');
console.log('  1. exception("Cannot withdraw to zero address")');
console.log('  2. exception("Exceeds daily withdrawal limit")');
console.log('  3. exception("Emergency stop activated - vault is locked")');
console.log('  4. exception; (in validateAddress)');
console.log('  5. Default (x) for unhandled actions');

console.log('\n\nExample Solutions (conceptual):');
console.log('─'.repeat(50));

console.log('\n1. Valid withdrawal:');
console.log('   ("withdraw" "xch1234..." 500000)');
console.log('   → Will succeed if sender is owner and amount < daily limit');

console.log('\n2. Withdrawal to zero address:');
console.log('   ("withdraw" 0x000...000 100000)');
console.log('   → Will fail with (x) - "Cannot withdraw to zero address"');

console.log('\n3. Over daily limit:');
console.log('   ("withdraw" "xch1234..." 2000000)');
console.log('   → Will fail with (x) - "Exceeds daily withdrawal limit"');

console.log('\n4. Emergency stop:');
console.log('   ("emergencyStop")');
console.log('   → Always fails with (x) - effectively locks the vault');

console.log('\n5. Validate zero address:');
console.log('   ("validateAddress" 0x000...000)');
console.log('   → Will fail with (x) - no message');

console.log('\n✅ Exception handling provides explicit control over failure cases!');
console.log('   Use "exception;" or "exception("message");" to cause immediate failure.'); 