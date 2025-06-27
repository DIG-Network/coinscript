const { parseCoinScriptFile, createSolution } = require('../dist');

console.log('=== Example 09: Transfer vs Send ===\n');

// Parse the CoinScript file
const puzzle = parseCoinScriptFile('09-transfer-example.coins');

// Generate ChiaLisp
const chialisp = puzzle.serialize({ indent: true });
console.log('Generated ChiaLisp:');
console.log(chialisp);

console.log('\n=== Key Differences ===\n');
console.log('send(recipient, amount):');
console.log('- Creates a simple CREATE_COIN condition');
console.log('- Generates: (51 puzzle_hash amount)');
console.log('- No memo field\n');

console.log('send(recipient, amount, memo):');
console.log('- Creates CREATE_COIN with memo');
console.log('- Generates: (51 puzzle_hash amount memo)');
console.log('- Memo can be used to pass state or metadata');
console.log('- Useful for maintaining state between coin spends\n');

console.log('=== Creating Solutions ===\n');

// Solution 1: Simple send without memo
console.log('1. Simple funds transfer:');
const simpleSendSolution = createSolution()
  .addAction('sendFunds')
  .add('0x' + 'aa'.repeat(32))  // to address
  .add(500000);                  // amount

console.log('Solution:', simpleSendSolution.serialize());
console.log('   (Sends 500k mojos to address 0xaaaa...)\n');

// Solution 2: Send with state in memo
console.log('2. Send with state (using memo):');
const stateTransferSolution = createSolution()
  .addAction('sendWithState')
  .add('0x' + 'bb'.repeat(32))  // to address
  .add(300000);                  // amount

console.log('Solution:', stateTransferSolution.serialize());
console.log('   (Sends 300k mojos with state data 0x7374617465 in memo)\n');

// Solution 3: Send to treasury
console.log('3. Send to treasury:');
const treasurySolution = createSolution()
  .addAction('sendToTreasury')
  .add(100000);  // amount

console.log('Solution:', treasurySolution.serialize());
console.log('   (Sends to hardcoded treasury with tracking memo)\n');

console.log('=== Use Cases ===\n');
console.log('1. Simple payments: use send() without memo');
console.log('2. State management: use send() with memo containing serialized state');
console.log('3. Tracking/auditing: use send() with descriptive memo');
console.log('4. Cross-coin communication: memo can contain instructions for recipient\n');

// Calculate puzzle hash
const puzzleHash = puzzle.toModHash();
console.log('Puzzle hash:', puzzleHash); 