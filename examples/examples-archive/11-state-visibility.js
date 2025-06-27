const { parseCoinScriptFile } = require('../dist/coinscript/parser');

console.log('=== Example 11: State Visibility in Blockchain ===\n');

console.log('SLOT-MACHINE PATTERN STATE VISIBILITY:\n');

console.log('1. BEFORE COIN IS SPENT (State Hidden):');
console.log('   On-chain data:');
console.log('   {');
console.log('     puzzle_hash: "0xabc123...",  // State is hidden inside');
console.log('     amount: 1000000');
console.log('   }');
console.log('   ❌ Cannot read state - only puzzle hash visible\n');

console.log('2. WHEN COIN IS SPENT (State Revealed):');
console.log('   Solution reveals:');
console.log('   {');
console.log('     action: "transfer",');
console.log('     current_state: {              // Now visible!');
console.log('       counter: 42,');
console.log('       balances: {');
console.log('         "0xAlice": 1000,');
console.log('         "0xBob": 500');
console.log('       }');
console.log('     },');
console.log('     action_args: ["0xCharlie", 100]');
console.log('   }');
console.log('   ✅ State becomes public when coin is spent\n');

console.log('=== STATE STORAGE STRATEGIES ===\n');

console.log('Strategy 1: STATE IN SOLUTION');
console.log('- State passed as solution parameter');
console.log('- Puzzle hash stays same regardless of state');
console.log('- State only visible after spend');
console.log('- Example: DEX balances, game state\n');

console.log('Strategy 2: STATE CURRIED INTO PUZZLE');
console.log('- State is part of puzzle definition');
console.log('- Different state = different puzzle hash');
console.log('- More expensive (new coin for each state change)');
console.log('- Example: Version numbers, owner addresses\n');

console.log('=== PRIVACY IMPLICATIONS ===\n');

console.log('🔒 Private Until Spent:');
console.log('- Current balances hidden');
console.log('- Internal state unknown');
console.log('- Good for privacy\n');

console.log('📖 Public After Spend:');
console.log('- Full transaction history visible');
console.log('- State transitions traceable');
console.log('- Good for auditability\n');

console.log('=== QUERYING STATE ===\n');

console.log('To read current state of unspent coin:');
console.log('1. ❌ Direct query: Not possible - state is hidden');
console.log('2. ✅ Reconstruct from history:');
console.log('   - Find creation transaction');
console.log('   - Follow all spends');
console.log('   - Replay state transitions');
console.log('3. ✅ Use indexer/observer:');
console.log('   - Watch for spends');
console.log('   - Cache state transitions');
console.log('   - Provide API for current state\n');

// Parse and show the CoinScript
const puzzle = parseCoinScriptFile('11-state-visibility.coins');
console.log('=== Generated ChiaLisp ===');
console.log(puzzle.serialize({ indent: true })); 