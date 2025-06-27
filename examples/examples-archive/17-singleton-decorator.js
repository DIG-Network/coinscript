/**
 * Example 17: Singleton Decorator
 * Demonstrates using @singleton decorator to automatically wrap coins
 */

const { parseCoinScriptFile, createSolution } = require('../dist');

console.log('=== Example 17: Singleton Decorator ===\n');

// Parse the first coin (auto-generated launcher ID)
console.log('1. Singleton with auto-generated launcher ID:\n');
try {
  // This would parse just the first coin in the file
  // For demo purposes, we'll show what it would do
  console.log('@singleton');
  console.log('coin SingletonToken {');
  console.log('    // ... coin definition ...');
  console.log('}\n');
  
  console.log('The @singleton decorator automatically wraps the coin in a singleton layer.');
  console.log('Without the decorator, you would need:');
  console.log('  layer singleton(launcherId: 0x...);');
  console.log('\nWith the decorator, it\'s much cleaner!');
} catch (error) {
  console.error('Error:', error.message);
}

console.log('\n' + '='.repeat(60) + '\n');

// Parse the second coin (specific launcher ID)
console.log('2. Singleton with specific launcher ID:\n');
console.log('@singleton(0x1234567890123456789012345678901234567890123456789012345678901234)');
console.log('coin NamedSingleton {');
console.log('    // ... coin definition ...');
console.log('}\n');

console.log('You can also provide a specific launcher ID in the decorator.');
console.log('This is useful when you need a deterministic singleton ID.');

console.log('\n=== Benefits of @singleton Decorator ===\n');
console.log('1. Cleaner syntax - no need for explicit layer declaration');
console.log('2. Clear intent - immediately obvious the coin is a singleton');
console.log('3. Works with other decorators (e.g., @onlyAddress on actions)');
console.log('4. Can specify launcher ID or let it auto-generate');

console.log('\n=== Creating Solutions ===\n');

// Show how to create solutions for singleton coins
console.log('Solutions work the same way as regular coins:\n');

const mintSolution = createSolution()
  .addAction('mint')
  .add('0x' + '11'.repeat(32))  // to address
  .add(1000);                    // amount

console.log('Mint solution:', mintSolution.serialize());

const transferSolution = createSolution()
  .addAction('transfer')
  .add('0x' + '22'.repeat(32))  // to address
  .add(500);                     // amount

console.log('Transfer solution:', transferSolution.serialize());

console.log('\n=== Key Points ===');
console.log('- Singletons ensure only one instance of the coin exists');
console.log('- The launcher ID determines the singleton\'s identity');
console.log('- State persists across spends (perfect for tokens, NFTs, etc.)');
console.log('- The decorator makes singleton usage more intuitive'); 