const { parseCoinScriptFile } = require('../dist/coinscript/parser');

console.log('=== Testing Transfer Statement ===\n');

// Parse the CoinScript file
const puzzle = parseCoinScriptFile('test-transfer.coins');

// Generate ChiaLisp
const chialisp = puzzle.build();
console.log('Generated ChiaLisp:');
console.log(chialisp);
