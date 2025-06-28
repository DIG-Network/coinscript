/**
 * Example 01: Basic Payment
 * Learn: Default actions, simpler solutions
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
showHeader('01', 'Basic Payment', 'Using the "default" action for simpler coins.');

// Show the CoinScript source
showCoinScriptSource('./01-basic-payment.coins');

// Compile the coin
const result = parseCoinScriptFile('./01-basic-payment.coins');
const puzzle = result.mainPuzzle;
showPuzzle(puzzle);

// Solution 1 - Simple transfer
const solution1 = createSolution()
  .addConditions(conditions => {
    conditions.createCoin('0x' + 'aa'.repeat(32), 1000);
  });

showSolution(solution1, 'Simple transfer - no action name needed!');
showNote('No ACTION parameter in the solution - default action is used automatically');

showSeparator();

// Solution 2 - Multiple outputs
const solution2 = createSolution()
  .addConditions(conditions => {
    conditions
      .createCoin('0x' + 'bb'.repeat(32), 400)
      .createCoin('0x' + 'cc'.repeat(32), 300)
      .createCoin('0x' + 'dd'.repeat(32), 250)
      .reserveFee(50)
      .createAnnouncement('payment completed');
  });

showSolution(solution2, 'Multiple outputs with announcement');

// Key concepts
showConcepts([
  'default action runs when no action name is specified',
  'Cleaner solutions for single-purpose coins',
  'Perfect for basic payment functionality',
  'Can still use all condition types (create coin, announce, etc.)'
]);

showFooter(); 