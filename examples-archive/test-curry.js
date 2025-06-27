/**
 * Test curry implementation
 */

const { parseCoinScriptFile, puzzle, variable } = require('../dist');

console.log('=== Testing Curry Implementation ===\n');

// Test 1: Pay to pubkey with curry
console.log('1. Pay to Public Key (with curry):');
const payToPubkey = parseCoinScriptFile('./02-pay-to-pubkey.coins');
console.log(payToPubkey.serialize({ indent: true }));
console.log('Puzzle hash:', payToPubkey.toModHash());

// Test 2: Manual curry example
console.log('\n2. Manual Curry Example:');
const simplePuzzle = puzzle()
  .withCurriedParams({ 
    SECRET: '0xdeadbeef',
    AMOUNT: 1000000 
  })
  .withSolutionParams('password')
  .if(variable('password').equals(variable('SECRET')))
    .then(b => b.createCoin('0x' + '0'.repeat(64), variable('AMOUNT')))
  .else(b => b.fail('Wrong password'));

console.log(simplePuzzle.serialize({ indent: true }));
console.log('Puzzle hash:', simplePuzzle.toModHash());

// Test 3: Show difference between curried and non-curried
console.log('\n3. Comparison - Same puzzle without curry:');
const nonCurriedPuzzle = puzzle()
  .withSolutionParams('SECRET', 'AMOUNT', 'password')
  .if(variable('password').equals(variable('SECRET')))
    .then(b => b.createCoin('0x' + '0'.repeat(64), variable('AMOUNT')))
  .else(b => b.fail('Wrong password'));

console.log(nonCurriedPuzzle.serialize({ indent: true }));
console.log('Puzzle hash:', nonCurriedPuzzle.toModHash());

console.log('\nNotice how:');
console.log('- Curried version has values baked in (0xdeadbeef, 1000000)');
console.log('- Non-curried version expects all values at spend time');
console.log('- Different puzzle hashes mean different coins!'); 