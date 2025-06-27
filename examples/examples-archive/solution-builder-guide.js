/**
 * SolutionBuilder Comprehensive Guide
 * Demonstrates all features for creating solutions
 */

const { createSolution, parseCoinScriptFile } = require('../dist');

console.log('=== SolutionBuilder Comprehensive Guide ===\n');

console.log('The SolutionBuilder provides a fluent API for creating Chia coin solutions.\n');

// 1. Basic value addition
console.log('1. BASIC VALUE ADDITION\n');

console.log('Adding simple values:');
const basicSolution = createSolution()
  .add(42)                           // number
  .add('hello')                      // string
  .add('0x' + 'ab'.repeat(32))      // bytes32
  .add(true)                         // boolean
  .add(false);                       // boolean

console.log('Solution:', basicSolution.serialize());
console.log('   (Numbers, strings, bytes, booleans)\n');

// 2. Lists
console.log('2. CREATING LISTS\n');

console.log('Nested list structure:');
const listSolution = createSolution()
  .addList(list => {
    list
      .add(1)
      .add(2)
      .addList(inner => {
        inner.add(3).add(4);
      })
      .add(5);
  });

console.log('Solution:', listSolution.serialize());
console.log('   (Creates: (1 2 (3 4) 5))\n');

// 3. Nil/Empty values
console.log('3. NIL VALUES\n');

const nilSolution = createSolution()
  .add('start')
  .addNil()         // adds ()
  .add('end');

console.log('Solution:', nilSolution.serialize());
console.log('   (Nil is empty list in ChiaLisp)\n');

// 4. Conditions
console.log('4. CREATING CONDITIONS\n');

console.log('Common spend conditions:');
const conditionsSolution = createSolution()
  .addConditions(conditions => {
    conditions
      // Create coins
      .createCoin('0x' + '11'.repeat(32), 1000)
      .createCoin('0x' + '22'.repeat(32), 500, '0xmemo123')  // with memo
      
      // Reserve fee
      .reserveFee(50)
      
      // Announcements
      .createAnnouncement('hello world')
      .assertAnnouncement('0x' + '33'.repeat(32), 'expected message')
      
      // Timelock
      .assertSecondsRelative(3600)  // 1 hour from now
      .assertHeightAbsolute(1000000) // specific block height
      
      // Signatures
      .aggSigMe('0x' + '44'.repeat(32), 'message to sign');
  });

console.log('Solution:', conditionsSolution.serialize());
console.log('   (Multiple conditions in one list)\n');

// 5. Actions for multi-action coins
console.log('5. ACTIONS FOR MULTI-ACTION COINS\n');

console.log('Named action with parameters:');
const actionSolution = createSolution()
  .addAction('transfer')           // action name
  .add('0x' + '55'.repeat(32))    // recipient
  .add(750);                       // amount

console.log('Solution:', actionSolution.serialize());
console.log('   (First parameter is action name)\n');

// 6. State for stateful coins
console.log('6. STATE MANAGEMENT\n');

console.log('Adding state object:');
const stateSolution = createSolution()
  .addAction('updateState')
  .addState({
    counter: 42,
    owner: '0x' + '66'.repeat(32),
    balances: {
      '0xAlice': 1000,
      '0xBob': 500
    },
    paused: false
  });

console.log('Solution:', stateSolution.serialize());
console.log('   (State encoded for ChiaLisp)\n');

// 7. Complex example
console.log('7. COMPLEX REAL-WORLD EXAMPLE\n');

console.log('Multi-sig spend with conditions:');
const complexSolution = createSolution()
  .addAction('multisigSpend')
  .addList(signers => {           // List of signers
    signers
      .add('0x' + '77'.repeat(32))
      .add('0x' + '88'.repeat(32));
  })
  .add(2)                         // Required signatures (2 of 2)
  .addConditions(conditions => {
    conditions
      .createCoin('0x' + '99'.repeat(32), 900)
      .reserveFee(100)
      .assertSecondsRelative(86400)  // 24 hour timelock
      .createAnnouncement('multisig spend executed');
  });

console.log('Solution:', complexSolution.serialize());
console.log('   (Action + signers + threshold + conditions)\n');

// 8. Raw ChiaLisp insertion
console.log('8. RAW CHIALISP\n');

console.log('For advanced users - raw code:');
const rawSolution = createSolution()
  .addRaw('(sha256 0x0123456789)')
  .addRaw('(+ 1 2 3)');

console.log('Solution:', rawSolution.serialize());
console.log('   (Inserts raw ChiaLisp expressions)\n');

// 9. Building solutions for actual coins
console.log('9. PRACTICAL EXAMPLE WITH COINSCRIPT\n');

// Create a simple coin
const coinScript = `
coin PaymentCoin {
    storage address owner = "xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy";
    
    action pay(address recipient, uint256 amount) {
        require(msg.sender == owner, "Not owner");
        send(recipient, amount);
    }
}
`;

// For demonstration (would normally use parseCoinScriptFile)
console.log('For a coin with a pay action:');

const paymentSolution = createSolution()
  .addAction('pay')
  .add('0x' + 'aa'.repeat(32))  // recipient
  .add(1000);                    // amount

console.log('Solution:', paymentSolution.serialize());
console.log('   (Matches the pay(address, uint256) signature)\n');

console.log('=== KEY TAKEAWAYS ===');
console.log('1. SolutionBuilder provides type-safe solution creation');
console.log('2. Supports all ChiaLisp data types and structures');
console.log('3. Fluent API for readable solution construction');
console.log('4. Automatic encoding of complex data (state objects)');
console.log('5. Built-in helpers for common conditions');
console.log('6. Extensible for custom use cases'); 