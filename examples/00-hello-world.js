/**
 * Example 00: Hello World
 * Learn: Basic coin structure, actions, and solutions
 */

const { parseCoinScriptFile, createSolution } = require('../dist');
const { 
  showHeader, 
  showCoinScriptSource, 
  showPuzzle, 
  showSolution,
  showExecution,
  showConcepts,
  showFooter 
} = require('./example-utils');

// Display header
showHeader('00', 'Hello World', 'The simplest possible CoinScript coin - returns conditions from solution.');

// Show the CoinScript source
showCoinScriptSource('./00-hello-world.coins');

// Compile the coin
const puzzle = parseCoinScriptFile('./00-hello-world.coins');
showPuzzle(puzzle);

// Create a solution
const solution = createSolution()
  .addConditions(conditions => {
    conditions
      .createCoin('0x' + '11'.repeat(32), 1000)
      .reserveFee(50);
  });

showSolution(solution, 'Simple spend creating one coin and paying fee');

// Explain execution
showExecution([
  'Puzzle receives the solution',
  'Extracts the conditions parameter', 
  'Returns those conditions to the blockchain',
  'Blockchain creates new coin with 1000 mojos',
  'Blockchain reserves 50 mojos as network fee'
]);

// Key concepts
showConcepts([
  'Every coin needs at least one action to be spendable',
  'Actions receive parameters from the solution',
  'The simplest action just returns conditions',
  'Conditions tell the blockchain what to do (create coins, etc.)'
]);

showFooter(); 