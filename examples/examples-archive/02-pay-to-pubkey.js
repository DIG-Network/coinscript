/**
 * Example 02: Pay to Public Key
 * Standard Chia coin requiring a signature
 */

const { parseCoinScriptFile, createSolution } = require('../dist');

console.log('=== Example 02: Pay to Public Key ===\n');

// Compile the CoinScript
const puzzle = parseCoinScriptFile('./02-pay-to-pubkey.coins');

console.log('Generated ChiaLisp:');
console.log(puzzle.serialize({ indent: true }));

console.log('\nPuzzle hash:', puzzle.toModHash());

console.log('\nThis coin requires a signature from the specified public key.');
console.log('The public key is curried into the puzzle for security.');

// Create a solution for spending this coin
console.log('\n=== Creating a Solution ===\n');

const solution = createSolution()
  .addConditions(conditions => {
    conditions
      .createCoin('0x' + '33'.repeat(32), 600)  // Send to recipient
      .createCoin('0x' + '44'.repeat(32), 350)  // Change back to sender
      .reserveFee(50)                            // Network fee
      .createAnnouncement('payment_completed');   // Optional announcement
  });

console.log('Solution:');
console.log(solution.serialize());

console.log('\nTo spend this coin:');
console.log('1. Provide conditions in the solution (shown above)');
console.log('2. Sign sha256(conditions + coin_id) with the private key');
console.log('3. The puzzle will verify the signature automatically');
console.log('\nThis is the standard way to secure coins in Chia.');
console.log('The signature ensures only the key holder can spend.'); 