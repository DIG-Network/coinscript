/**
 * Example 06: Send Coins
 * Learn: Creating coins, memos, fee handling
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
showHeader('06', 'Send Coins', 'Creating new coins with send().');

// Show the CoinScript source
showCoinScriptSource('./06-send-coins.coins');

// Compile the coin
const result = parseCoinScriptFile('./06-send-coins.coins');
const puzzle = result.mainPuzzle;
showPuzzle(puzzle);

// Explain send() function
console.log('📤 The send() Function:');
console.log('   • send(address, amount) - Creates basic coin');
console.log('   • send(address, amount, memo) - Creates coin with metadata');
console.log('   • Each send() creates a CREATE_COIN condition');
console.log('   • Total sent MUST equal coin value (conservation)');
console.log();

showNote('For these examples, assume the coin value is 1000 mojos', 'info');

showSeparator();

// Assume coin value is 1000 mojos for examples
const COIN_VALUE = 1000;

// Solution 1: Simple send
const simpleSolution = createSolution()
  .addAction('simpleSend')
  .add('0x' + '11'.repeat(32))  // recipient
  .add(COIN_VALUE);              // amount (entire coin)

showSolution(simpleSolution, 'Simple send - creates one coin with entire value');

// Solution 2: Send with memo
const memoSolution = createSolution()
  .addAction('sendWithMemo')
  .add('0x' + '22'.repeat(32))         // recipient
  .add(COIN_VALUE)                     // amount
  .add('0x496e766f69636523313233');    // memo: "Invoice#123" in hex

showSolution(memoSolution, 'Send with memo - includes metadata for tracking');

// Solution 3: Multi-send
const multiSolution = createSolution()
  .addAction('multiSend')
  .add('0x' + '33'.repeat(32))  // recipient1
  .add('0x' + '44'.repeat(32))  // recipient2
  .add(COIN_VALUE);              // total to split

showSolution(multiSolution, 'Multiple recipients - splits 500 to each');

// Solution 4: Send with fee
const feeSolution = createSolution()
  .addAction('sendWithFee')
  .add('0x' + '55'.repeat(32))  // recipient
  .add(COIN_VALUE);              // total amount

showSolution(feeSolution, 'With 10% fee - sends 900 to recipient, 100 to treasury');

// Solution 5: Conditional send
const urgentSolution = createSolution()
  .addAction('conditionalSend')
  .add('0x' + '66'.repeat(32))  // recipient
  .add(COIN_VALUE)               // amount
  .add(true);                    // urgent flag

showSolution(urgentSolution, 'Conditional (urgent) - sends entire amount immediately');

// Key concepts
showConcepts([
  'Sum of all send() amounts must equal coin value',
  'Memos are optional but useful for tracking/state',
  'Can create multiple coins in one spend',
  'Each send() becomes a CREATE_COIN condition (opcode 51)',
  'Memo data can be used for passing state information'
]);

showFooter(); 