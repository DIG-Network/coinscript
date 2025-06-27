const { parseCoinScriptFile } = require('./dist');

console.log('Testing CoinScript compilation...\n');

// Test basic payment
try {
  console.log('=== 1. Basic Payment ===');
  const puzzle = parseCoinScriptFile('./examples/01-basic-payment.coins');
  console.log(puzzle.serialize({ indent: true }));
  console.log('Puzzle hash:', puzzle.toModHash());
} catch (error) {
  console.error('Error:', error.message);
}

// Test pay-to-pubkey
try {
  console.log('\n=== 2. Pay to Public Key ===');
  const puzzle = parseCoinScriptFile('./examples/02-pay-to-pubkey.coins');
  console.log(puzzle.serialize({ indent: true }));
  console.log('Puzzle hash:', puzzle.toModHash());
} catch (error) {
  console.error('Error:', error.message);
}

// Test escrow
try {
  console.log('\n=== 3. Escrow ===');
  const puzzle = parseCoinScriptFile('./examples/03-escrow.coins');
  console.log(puzzle.serialize({ indent: true }));
  console.log('Puzzle hash:', puzzle.toModHash());
} catch (error) {
  console.error('Error:', error.message);
}

// Test singleton
try {
  console.log('\n=== 4. Singleton ===');
  const puzzle = parseCoinScriptFile('./examples/04-singleton-coin.coins');
  console.log(puzzle.serialize({ indent: true }));
  console.log('Puzzle hash:', puzzle.toModHash());
} catch (error) {
  console.error('Error:', error.message);
} 