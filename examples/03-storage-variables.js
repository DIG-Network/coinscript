/**
 * Example 03: Storage Variables
 * Learn: Storage types, immutability, calculations
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
showHeader('03', 'Storage Variables', 'Using different types of immutable storage.');

// Show the CoinScript source
showCoinScriptSource('./03-storage-variables.coins');

// Compile the coin
const puzzle = parseCoinScriptFile('./03-storage-variables.coins');
showPuzzle(puzzle);

showNote('Storage variables are curried into the puzzle, making it longer than simple examples');

// Explain storage types
console.log('📦 Storage Types Demonstrated:');
console.log('   • address - For wallet addresses (converts to puzzle hash)');
console.log('   • uint256 - For numbers and amounts');
console.log('   • bool - For flags and switches');
console.log('   • bytes32 - For hashes and identifiers');
console.log();

showSeparator();

// Solution 1 - Transfer with fee
const solution1 = createSolution()
  .addAction('transfer')
  .add('0x' + 'aa'.repeat(32))  // to
  .add(10000);                   // amount

showSolution(solution1, 'Transfer with 5% fee (sends 9,500 to recipient, 500 to treasury)');

// Solution 2 - Minimum amount
const solution2 = createSolution()
  .addAction('transfer')
  .add('0x' + 'bb'.repeat(32))
  .add(1000);  // Exactly minimum

showSolution(solution2, 'Minimum transfer (sends 950 to recipient, 50 to treasury)');

// Key concepts
showConcepts([
  'Storage variables are IMMUTABLE - cannot change after creation',
  'Storage is curried into the puzzle (part of puzzle hash)',
  'Different storage values = completely different puzzles',
  'No runtime lookup needed - values are baked in',
  'Perfect for configuration: owners, limits, fees, flags'
]);

showFooter(); 