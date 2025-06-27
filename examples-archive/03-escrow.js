/**
 * Example 03: Escrow
 * Multi-party escrow with address validation
 */

const { parseCoinScriptFile, createSolution } = require('../dist');

console.log('=== Example 03: Escrow ===\n');

// Compile the CoinScript
const puzzle = parseCoinScriptFile('./03-escrow.coins');

console.log('Generated ChiaLisp:');
console.log(puzzle.serialize({ indent: true }).substring(0, 500) + '...\n');

console.log('Puzzle hash:', puzzle.toModHash());

console.log('\nThis escrow coin demonstrates:');
console.log('- Address type with proper xch1 validation');
console.log('- Multiple spend paths (buyer, seller, arbiter)');
console.log('- Time-based conditions');
console.log('- Curried addresses for all participants');
console.log('\nAll addresses are validated and converted to puzzle hashes.');

// Create solutions for different spend paths
console.log('\n=== Creating Solutions ===\n');

// Solution 1: Seller claims funds
console.log('1. Seller claiming funds:');
const sellerSolution = createSolution()
  .addAction('spendBySeller');

console.log('Solution:', sellerSolution.serialize());
console.log('   (The seller provides their signature to claim)\n');

// Solution 2: Buyer refund after timeout
console.log('2. Buyer refund (after timeout):');
const buyerSolution = createSolution()
  .addAction('spendByBuyer');

console.log('Solution:', buyerSolution.serialize());
console.log('   (Requires current time >= refund_time)\n');

// Solution 3: Arbiter decides
console.log('3. Arbiter resolution:');
const arbiterSolution = createSolution()
  .addAction('spendByArbiter')
  .add('0x' + '99'.repeat(32))  // recipient address
  .add(700000000);               // amount to recipient (0.7 XCH)

console.log('Solution:', arbiterSolution.serialize());
console.log('   (Arbiter splits: 0.7 XCH to recipient, 0.3 XCH back to buyer)\n');

console.log('=== Key Points ===');
console.log('- Each party has their own action requiring their signature');
console.log('- Buyer can only refund after timeout period');
console.log('- Arbiter can split funds between parties');
console.log('- All addresses are securely curried into the puzzle'); 