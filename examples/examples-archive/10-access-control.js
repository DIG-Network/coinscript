const { parseCoinScriptFile, createSolution } = require('../dist');

console.log('=== Example 10: Access Control with Decorators ===\n');

// Parse the CoinScript file
const puzzle = parseCoinScriptFile('10-access-control.coins');

// Generate ChiaLisp
const chialisp = puzzle.serialize({ indent: true });
console.log('Generated ChiaLisp:');
console.log(chialisp);

console.log('\n=== Key Features ===\n');
console.log('@onlyAddress decorator:');
console.log('- Restricts action execution to specific addresses');
console.log('- Can specify multiple allowed addresses');
console.log('- Generates require() statements to validate sender\n');

console.log('Usage patterns:');
console.log('1. Single address: @onlyAddress(owner)');
console.log('2. Multiple addresses: @onlyAddress(owner, admin)');
console.log('3. With storage variables: @onlyAddress(treasury)\n');

console.log('=== Creating Solutions ===\n');

// Solution 1: Transfer ownership (owner only)
console.log('1. Transfer ownership (owner signature required):');
const transferOwnershipSolution = createSolution()
  .addAction('transferOwnership')
  .add('0x' + 'cc'.repeat(32));  // new owner address

console.log('Solution:', transferOwnershipSolution.serialize());
console.log('   (Only current owner can execute this)\n');

// Solution 2: Withdraw (owner or admin)
console.log('2. Withdraw funds (owner OR admin can execute):');
const withdrawSolution = createSolution()
  .addAction('withdraw')
  .add('0x' + 'dd'.repeat(32))  // recipient
  .add(750000);                  // amount

console.log('Solution:', withdrawSolution.serialize());
console.log('   (Either owner or admin signature accepted)\n');

// Solution 3: Public action (anyone)
console.log('3. Public action (no restrictions):');
const publicSolution = createSolution()
  .addAction('publicAction')
  .add(42);  // value parameter

console.log('Solution:', publicSolution.serialize());
console.log('   (Anyone can execute - no decorator)\n');

// Solution 4: Emergency stop (owner only)
console.log('4. Emergency stop (owner only):');
const emergencySolution = createSolution()
  .addAction('emergencyStop');

console.log('Solution:', emergencySolution.serialize());
console.log('   (Only owner can trigger emergency stop)\n');

console.log('=== Implementation Details ===\n');
console.log('The decorator generates code that:');
console.log('1. Checks if sender equals any allowed address');
console.log('2. Uses OR logic for multiple addresses');
console.log('3. Throws "Unauthorized" error if check fails\n');

console.log('=== Security Notes ===');
console.log('- Address checks happen BEFORE action logic');
console.log('- Unauthorized callers fail immediately');
console.log('- No gas wasted on failed authorization');
console.log('- Addresses are curried into puzzle (immutable)');

// Calculate puzzle hash
const puzzleHash = puzzle.toModHash();
console.log('\nPuzzle hash:', puzzleHash); 