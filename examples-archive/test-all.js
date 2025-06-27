/**
 * Test all CoinScript examples
 */

const { parseCoinScriptFile } = require('../dist');
const fs = require('fs');
const path = require('path');

// Find all .coins files
const coinsFiles = fs.readdirSync('.')
  .filter(f => f.endsWith('.coins'))
  .sort();

console.log(`Found ${coinsFiles.length} CoinScript files to test:\n`);

coinsFiles.forEach((file, index) => {
  console.log(`\n=== ${index + 1}. ${file} ===`);
  
  try {
    const puzzle = parseCoinScriptFile(`./${file}`);
    console.log('\nGenerated ChiaLisp:');
    console.log(puzzle.serialize({ indent: true }));
    console.log('\nPuzzle hash:', puzzle.toModHash());
  } catch (error) {
    console.error('\nERROR:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack.split('\n').slice(0, 5).join('\n'));
    }
  }
  
  console.log('\n' + '='.repeat(60));
}); 