/**
 * Demo: Output Format
 * Shows how all examples now display both ChiaLisp puzzle and solution
 */

const { parseCoinScriptFile, createSolution } = require('../dist');

console.log('🎯 CoinScript Examples - Enhanced Output Format\n');
console.log('Each example now shows:');
console.log('1. The CoinScript source code');
console.log('2. Generated ChiaLisp puzzle');
console.log('3. Solution(s) in ChiaLisp format');
console.log('4. Clear explanations\n');

console.log('─'.repeat(60));
console.log('\nExample: Basic coin with solution\n');

// Quick inline example
const inlineCode = `
coin DemoCoin {
    action spend(address recipient, uint256 amount) {
        send(recipient, amount);
    }
}`;

console.log('📄 CoinScript:');
console.log(inlineCode);

// For demo purposes, we'll show what the output looks like
console.log('\n🧩 Generated ChiaLisp:');
console.log(`(mod ACTION
  (i (= ACTION spend) 
    (c (list 51 recipient amount) ()) 
    (assert "0")
  )
)`);

console.log('\n💡 Solution:');
const solution = createSolution()
  .addAction('spend')
  .add('0x' + 'aa'.repeat(32))
  .add(1000);

console.log(solution.serialize({ indent: true }));

console.log('\n✨ What this means:');
console.log('- The puzzle defines the rules (ChiaLisp)');
console.log('- The solution provides the data (also ChiaLisp)');
console.log('- Together they execute to produce conditions');

console.log('\n📚 Run any example to see this format:');
console.log('   node 00-hello-world.js');
console.log('   node 01-basic-payment.js');
console.log('   node 04-multiple-actions.js');
console.log('   ... and more!\n'); 