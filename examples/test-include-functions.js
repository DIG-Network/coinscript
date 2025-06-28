const { compileCoinScript } = require('../dist/coinscript');
const { PuzzleBuilder, puzzle } = require('../dist/builder');

console.log('=== CoinScript Include Functions Demo ===\n');

// Example 1: Using sha256tree function in CoinScript
console.log('1. CoinScript using sha256tree function:');
console.log('─'.repeat(60));

const coinScriptWithSha256tree = `
coin HashingCoin {
  storage bytes32 expected_hash = 0x1234567890abcdef;
  
  action verifyHash(bytes32 data) {
    // Use sha256tree function from include
    bytes32 calculated = sha256tree(data);
    require(calculated == expected_hash, "Hash mismatch");
    
    // If hash matches, allow spending
    sendCoins(0xrecipient, 1000);
  }
}
`;

console.log('CoinScript source:');
console.log(coinScriptWithSha256tree);

// Note: This would require full CoinScript compilation support for include functions
// For now, we'll demonstrate the concept with PuzzleBuilder

console.log('\n2. Demonstrating include functions with PuzzleBuilder:');
console.log('─'.repeat(60));

// Example using sha256tree
const hashPuzzle = new PuzzleBuilder()
  .withMod()
  .include('sha256tree.clib')  // Include sha256tree
  .withSolutionParams('data', 'recipient')
  .comment('Verify data hash before spending')
  
  // Calculate hash of the data using sha256tree
  .if(puzzle().raw('(sha256tree data)').equals('0x1234567890abcdef'))
    .then(b => b.createCoin('recipient', 1000))
    .else(b => b.fail('Hash mismatch'));

console.log('ChiaLisp with sha256tree:');
console.log(hashPuzzle.serialize({ indent: true }));

console.log('\n3. Using singleton truth functions:');
console.log('─'.repeat(60));

// Example using singleton truth functions
const singletonPuzzle = new PuzzleBuilder()
  .withMod()
  .include('singleton_truths.clib')
  .withSolutionParams('truths', 'recipient')
  .comment('Process singleton with truth functions')
  
  // Extract values from truths using singleton functions
  // In real usage, these would be called as: (my-id-truth truths)
  .createCoin('recipient', puzzle().raw('(my-amount-truth truths)'))
  .requireSignature(puzzle().raw('(my-id-truth truths)'));

console.log('ChiaLisp with singleton truths:');
console.log(singletonPuzzle.serialize({ indent: true }));

console.log('\n4. Using curry functions:');
console.log('─'.repeat(60));

// Example using curry and treehash functions
const curryPuzzle = new PuzzleBuilder()
  .withMod()
  .include('curry-and-treehash.clinc')
  .withSolutionParams('base_puzzle_hash', 'curry_params')
  .comment('Calculate curried puzzle hash')
  
  // Use puzzle-hash-of-curried-function
  // This would calculate the hash of a curried puzzle
  .createCoin(
    puzzle().raw('(puzzle-hash-of-curried-function base_puzzle_hash curry_params)'),
    1000
  );

console.log('ChiaLisp with curry functions:');
console.log(curryPuzzle.serialize({ indent: true }));

console.log('\n=== Available Include Functions ===');
console.log('\nsha256tree.clib:');
console.log('  • sha256tree - Calculate tree hash of a value');

console.log('\ncurry-and-treehash.clinc:');
console.log('  • puzzle-hash-of-curried-function - Calculate hash of curried puzzle');
console.log('  • tree-hash-of-apply - Calculate hash of function application');
console.log('  • update-hash-for-parameter-hash - Update environment hash');
console.log('  • build-curry-list - Build curry parameter list');

console.log('\nsingleton_truths.clib:');
console.log('  • my-id-truth - Extract coin ID from truths');
console.log('  • my-inner-puzzle-hash-truth - Extract inner puzzle hash');
console.log('  • my-amount-truth - Extract amount from truths');
console.log('  • singleton-launcher-id-truth - Extract launcher ID');
console.log('  • And many more singleton-related functions...');

console.log('\ncat_truths.clib:');
console.log('  • my-inner-puzzle-hash-cat-truth - Extract CAT inner puzzle hash');
console.log('  • cat-tail-program-hash-truth - Extract TAIL program hash');
console.log('  • And more CAT-related functions...');

console.log('\nutility_macros.clib:');
console.log('  • assert - Clean assertion macro');
console.log('  • or - Logical OR macro');
console.log('  • and - Logical AND macro');

console.log('\n=== Usage Notes ===');
console.log('1. Functions from includes are automatically available when the file is included');
console.log('2. Function names use kebab-case in ChiaLisp (e.g., my-id-truth)');
console.log('3. CoinScript can use snake_case which gets converted (e.g., my_id_truth)');
console.log('4. Includes are automatically added when these functions are used');
console.log('5. Manual includes ensure functions are available even if not auto-detected'); 