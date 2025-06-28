const { parseCoinScriptFile } = require('./dist/coinscript/parser');

console.log('=== Example 09: Transfer vs Send ===\n');

// Parse the CoinScript file
const result = parseCoinScriptFile('09-transfer-example.coins');
const puzzle = result.mainPuzzle;

// Generate ChiaLisp
const chialisp = puzzle.serialize({ indent: true });
console.log('Generated ChiaLisp:');
console.log(chialisp);

// Try different output method
process.stdout.write('\n\nDirect output:\n');
process.stdout.write(chialisp);
process.stdout.write('\n\n');

console.log('\n=== Key Differences ===\n');
console.log('send(recipient, amount):');
console.log('- Creates a simple CREATE_COIN condition');
console.log('- Generates: (51 puzzle_hash amount)');
console.log('- No memo field\n');

console.log('transfer(recipient, amount):');
console.log('- Also creates CREATE_COIN condition');
console.log('- Same as send when no memo provided');
console.log('- Generates: (51 puzzle_hash amount)\n');

console.log('transfer(recipient, amount, memo):');
console.log('- Creates CREATE_COIN with memo');
console.log('- Generates: (51 puzzle_hash amount memo)');
console.log('- Memo can be used to pass state or metadata');
console.log('- Useful for maintaining state between coin spends\n');

console.log('=== Use Cases ===\n');
console.log('1. Simple payments: use send()');
console.log('2. State management: use transfer() with memo containing serialized state');
console.log('3. Tracking/auditing: use transfer() with descriptive memo');
console.log('4. Cross-coin communication: memo can contain instructions for recipient\n');

// Calculate puzzle hash
const puzzleHash = puzzle.toModHash();
console.log('Puzzle hash:', puzzleHash);
