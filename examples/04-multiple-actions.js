/**
 * Example 04: Multiple Actions
 * Learn: Action routing, named actions, events
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
showHeader('04', 'Multiple Actions', 'Creating coins with multiple spend paths.');

// Show the CoinScript source
showCoinScriptSource('./04-multiple-actions.coins');

// Compile the coin
const result = parseCoinScriptFile('./04-multiple-actions.coins');
const puzzle = result.mainPuzzle;
showPuzzle(puzzle, { showHash: false });

showNote('This coin has 4 different actions: default, ownerSpend, transfer, and burn');

showSeparator();

// Solution 1: Default action (no action name)
const defaultSolution = createSolution()
  .addConditions(conditions => {
    conditions.createCoin('0x' + '11'.repeat(32), 1000);
  });

showSolution(defaultSolution, 'Solution 1: Default action (no ACTION parameter)');

// Solution 2: Owner spend
const ownerSolution = createSolution()
  .addAction('ownerSpend')  // ACTION parameter
  .addConditions(conditions => {
    conditions.createCoin('0x' + '22'.repeat(32), 1000);
  });

showSolution(ownerSolution, 'Solution 2: Owner spend (requires signature)');

// Solution 3: Transfer action
const transferSolution = createSolution()
  .addAction('transfer')
  .add('0x' + '33'.repeat(32))  // recipient
  .add(750);                     // amount

showSolution(transferSolution, 'Solution 3: Transfer with parameters');

// Solution 4: Burn action
const burnSolution = createSolution()
  .addAction('burn');

showSolution(burnSolution, 'Solution 4: Burn (destroys the coin)');

// Key concepts
showConcepts([
  'default action needs no ACTION parameter in solution',
  'Named actions require ACTION as first solution element',
  'Action parameters follow the action name',
  'Events become CREATE_PUZZLE_ANNOUNCEMENT conditions',
  'Action routing happens via if/else chains in ChiaLisp'
]);

showFooter(); 