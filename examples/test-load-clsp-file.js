const { PuzzleBuilder } = require('../dist/builder');
const { createChialispPuzzle } = require('../dist/chialisp/puzzleLibrary');
const path = require('path');

console.log('=== Loading ChiaLisp Files Demo ===\n');

// Method 1: Load a predefined ChiaLisp puzzle from lib/chialisp
console.log('1. Loading predefined puzzles from library:');
console.log('─'.repeat(50));

try {
    // Load the standard singleton launcher
    const singletonLauncher = createChialispPuzzle('SINGLETON_LAUNCHER');
    console.log('✓ Loaded SINGLETON_LAUNCHER');
    console.log('  Mod hash:', singletonLauncher.toModHash());
    console.log('  ChiaLisp:\n', singletonLauncher.serialize({ indent: true }));
} catch (error) {
    console.error('✗ Error:', error.message);
}

// Method 2: Load a custom .clsp file
console.log('\n2. Loading custom .clsp file:');
console.log('─'.repeat(50));

// Create a test .clsp file
const fs = require('fs');
const testClspPath = path.join(__dirname, 'test-puzzle.clsp');

const testClspContent = `
; Simple payment puzzle
(mod (PUBKEY recipient amount)
  (include condition_codes.clib)
  
  (defun make-payment (to amt)
    (list 
      (list CREATE_COIN to amt)
      (list AGG_SIG_ME PUBKEY (sha256 1 to amt))
    )
  )
  
  (c
    (make-payment recipient amount)
    (list (list RESERVE_FEE 100))
  )
)
`;

fs.writeFileSync(testClspPath, testClspContent);

try {
    // Load the custom .clsp file
    const customPuzzle = PuzzleBuilder.fromClsp(testClspPath);
    console.log('✓ Loaded custom puzzle from', testClspPath);
    
    // Show the loaded puzzle
    console.log('\nLoaded ChiaLisp:');
    console.log(customPuzzle.serialize({ indent: true }));
    
    // You can also curry parameters
    const curriedPuzzle = customPuzzle.withCurriedParams({
        PUBKEY: '0xb8f7dd239557ff8c49d338f89ac1a258a863fa52cd6d53ce8b81f39c5739ea2802e992529cf9f9b3cb92bb8aa7c80308'
    });
    
    console.log('\nWith curried PUBKEY:');
    console.log(curriedPuzzle.serialize({ indent: true }));
    
} catch (error) {
    console.error('✗ Error:', error.message);
}

// Method 3: Load from lib/chialisp directory
console.log('\n3. Loading .clsp files from lib directory:');
console.log('─'.repeat(50));

try {
    // You can also load files directly from the lib/chialisp directory
    const nftOwnershipPath = path.join(__dirname, '../lib/chialisp/nft/nft_ownership_layer.clsp');
    
    if (fs.existsSync(nftOwnershipPath)) {
        const nftOwnership = PuzzleBuilder.fromClsp(nftOwnershipPath);
        console.log('✓ Loaded nft_ownership_layer.clsp');
        console.log('  Parameters detected:', nftOwnership.serialize().match(/\(mod\s*\(([^)]+)\)/)?.[1] || 'none');
        
        // Show first few lines
        const lines = nftOwnership.serialize({ indent: true }).split('\n');
        console.log('\n  First 10 lines:');
        lines.slice(0, 10).forEach(line => console.log('  ', line));
        console.log('   ... (truncated)');
    } else {
        console.log('✗ NFT ownership layer file not found at', nftOwnershipPath);
    }
} catch (error) {
    console.error('✗ Error:', error.message);
}

// Clean up
fs.unlinkSync(testClspPath);

console.log('\n=== Summary ===');
console.log('You can load ChiaLisp and CoinScript files in multiple ways:');
console.log('1. createChialispPuzzle(puzzleType) - for predefined puzzles');
console.log('2. PuzzleBuilder.fromClsp(path) - for any .clsp file');
console.log('3. PuzzleBuilder.fromCoinScript(path) - for any .coins file');
console.log('4. All return PuzzleBuilder instances you can:');
console.log('   - Serialize to various formats');
console.log('   - Curry parameters');
console.log('   - Calculate mod hash');
console.log('   - Use in your puzzle compositions'); 