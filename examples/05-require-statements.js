/**
 * Example 05: Require Statements
 * Learn: Validation patterns, error handling, complex conditions
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
showHeader('05', 'Require Statements', 'Validation and error handling patterns.');

// Show the CoinScript source
showCoinScriptSource('./05-require-statements.coins');

// Compile the coin
const puzzle = parseCoinScriptFile('./05-require-statements.coins');
showPuzzle(puzzle);

// Show validation patterns
console.log('🛡️ Validation Patterns Demonstrated:');
console.log('   1. Ownership checks: require(msg.sender == owner)');
console.log('   2. Boolean flags: require(!paused)');
console.log('   3. Range validation: require(amount >= min && amount <= max)');
console.log('   4. OR conditions: require(sender == owner || sender == operator)');
console.log('   5. Math validation: require(total + amount <= limit)');
console.log('   6. Address validation: require(to != 0x0)');
console.log('   7. Complex conditions: require(amount > 0 && amount <= balance)');
console.log();

showSeparator();

// Valid solution
const validSolution = createSolution()
  .addAction('withdraw')
  .add('0x' + '11'.repeat(32))  // to (valid address)
  .add(5000)                     // amount (within range)
  .add(20000);                   // todayTotal (under limit)

showSolution(validSolution, '✅ Valid withdrawal - all checks will pass');

// Invalid solution - amount too small
const tooSmallSolution = createSolution()
  .addAction('withdraw')
  .add('0x' + '22'.repeat(32))
  .add(50)      // Below minAmount (100)
  .add(0);

showSolution(tooSmallSolution, '❌ Invalid - amount too small (will fail with "Amount too small")');

// Over daily limit
const overLimitSolution = createSolution()
  .addAction('withdraw')
  .add('0x' + '33'.repeat(32))
  .add(5000)
  .add(48000);  // 48000 + 5000 > 50000 daily limit

showSolution(overLimitSolution, '❌ Invalid - exceeds daily limit (will fail with "Daily limit exceeded")');

showNote('Failed assertions consume the coin without creating outputs - this protects against invalid spends', 'warning');

// Key concepts
showConcepts([
  'require() becomes an (assert) operation in ChiaLisp',
  'Check authorization first (fail fast principle)',
  'Validate all inputs early in the action',
  'Use clear, specific error messages',
  'Group related checks together for clarity',
  'Order checks by likelihood of failure (optimization)'
]);

showFooter(); 