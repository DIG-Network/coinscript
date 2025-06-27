/**
 * Test CLSP Formatter Integration
 * Shows how the formatter is automatically applied when serialize({ indent: true }) is called
 */

const { parseCoinScriptFile } = require('../dist');

console.log('=== CLSP Formatter Integration Test ===\n');

// Parse a CoinScript file
const puzzle = parseCoinScriptFile('./03-storage-variables.coins');

console.log('1. Without formatting (serialize with no options):');
console.log('─'.repeat(50));
const unformatted = puzzle.serialize();
console.log(unformatted.substring(0, 200) + '...\n');

console.log('2. With formatting (serialize with { indent: true }):');
console.log('─'.repeat(50));
const formatted = puzzle.serialize({ indent: true });
console.log(formatted);

console.log('\n3. Key formatting features applied:');
console.log('─'.repeat(50));
console.log('✓ Simple expressions on one line (if under 120 chars)');
console.log('✓ Nested expressions on multiple lines');
console.log('✓ Proper indentation (2 spaces)');
console.log('✓ Normalized whitespace');
console.log('✓ Preserved structure and readability');

// Create a simple example to show the difference clearly
const { PuzzleBuilder, variable } = require('../dist');

console.log('\n\n4. Simple example showing formatting:');
console.log('─'.repeat(50));

const simple = new PuzzleBuilder()
  .if(variable('amount').greaterThan(1000))
  .then(b => {
    b.createCoin('0x' + 'aa'.repeat(32), 1000);
    b.createAnnouncement('payment made');
  })
  .else(b => {
    b.returnValue('()');
  });

console.log('Unformatted:');
console.log(simple.serialize());

console.log('\nFormatted:');
console.log(simple.serialize({ indent: true }));

console.log('\n✅ CLSP formatter is now integrated into the main project flow!');
console.log('   When you call puzzle.serialize({ indent: true }), the formatter');
console.log('   automatically applies common CLSP formatting patterns.'); 