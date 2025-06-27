const { PuzzleBuilder, createSolution, variable, int } = require('../dist');
const { serialize } = require('../dist/core');

console.log('=== Example: Building Puzzles with Solutions ===\n');

// 1. Simple pay-to-conditions puzzle
console.log('1. PAY-TO-CONDITIONS PUZZLE:\n');

const payToConditions = new PuzzleBuilder()
  .comment('Execute conditions from solution')
  .payToConditions()
  .build();

console.log('Puzzle:');
console.log(serialize(payToConditions));
console.log();

// Create a solution for this puzzle
const payToConditionsSolution = createSolution()
  .addConditions(conditions => {
    conditions
      .createCoin('0x' + '22'.repeat(32), 100)
      .reserveFee(50);
  });

console.log('Solution:');
console.log(payToConditionsSolution.serialize());
console.log();

// 2. Pay to public key with signature
console.log('2. PAY-TO-PUBKEY PUZZLE:\n');

const pubkey = '0xb0a4d2f3bc1234567890abcdef1234567890abcdef1234567890abcdef12345678901234567890abcdef1234567890abcd';

const payToPubkey = new PuzzleBuilder()
  .comment('Require signature from pubkey')
  .requireSignature(pubkey)
  .comment('Return conditions from solution')
  .returnConditions()
  .build();

console.log('Puzzle:');
console.log(serialize(payToPubkey));
console.log();

// Solution provides conditions
const payToPubkeySolution = createSolution()
  .addConditions(conditions => {
    conditions
      .createCoin('0x' + '33'.repeat(32), 75)
      .createCoin('0x' + '44'.repeat(32), 25);
  });

console.log('Solution:');
console.log(payToPubkeySolution.serialize());
console.log();

// 3. Delegated puzzle
console.log('3. DELEGATED PUZZLE:\n');

const delegatedPuzzle = new PuzzleBuilder()
  .comment('Run delegated puzzle from solution')
  .delegatedPuzzle()
  .build();

console.log('Puzzle:');
console.log(serialize(delegatedPuzzle));
console.log();

// Solution provides a puzzle and its solution
const innerPuzzle = new PuzzleBuilder()
  .noMod()
  .createCoin('0x' + '55'.repeat(32), 100)
  .build();

const delegatedSolution = createSolution()
  .add(innerPuzzle) // The puzzle to run
  .addNil();        // Empty solution for the inner puzzle

console.log('Solution:');
console.log(delegatedSolution.serialize());
console.log();

// 4. Stateful coin (simplified)
console.log('4. STATEFUL COIN (Simplified):\n');

const statefulPuzzle = new PuzzleBuilder()
  .withSolutionParams('action', 'state', 'params')
  .comment('Simple stateful coin')
  .if(variable('action').equals('increment'))
    .then(b => {
      b.comment('Increment counter in state');
      // In real implementation, would update state
      b.createCoin('0x' + '66'.repeat(32), 1);
    })
    .else(b => {
      b.comment('Unknown action');
      b.fail();
    })
  .build();

console.log('Puzzle:');
console.log(serialize(statefulPuzzle));
console.log();

// Solution for stateful coin
const statefulSolution = createSolution()
  .add('increment')  // action
  .addState({        // current state
    counter: 5,
    owner: '0x1234'
  })
  .addList(b => {    // params
    b.add(10);       // increment by 10
  });

console.log('Solution:');
console.log(statefulSolution.serialize());
console.log();

console.log('=== Key Takeaways ===');
console.log('1. Puzzles define the rules/logic');
console.log('2. Solutions provide the data to execute');
console.log('3. Pay-to-conditions: Solution contains conditions');
console.log('4. Pay-to-pubkey: Solution contains conditions (after sig check)');
console.log('5. Delegated: Solution contains puzzle + its solution');
console.log('6. Stateful: Solution contains action + state + params'); 