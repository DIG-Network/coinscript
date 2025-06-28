const { PuzzleBuilder } = require('../dist/builder');
const path = require('path');
const fs = require('fs');

console.log('=== PuzzleBuilder Static Loaders Demo ===\n');

// Demo 1: Load a .clsp file
console.log('1. Loading ChiaLisp (.clsp) file:');
console.log('─'.repeat(50));

// Create a test .clsp file
const testClspPath = path.join(__dirname, 'test-puzzle.clsp');
const testClspContent = `
(mod (PUBKEY amount)
  (include condition_codes.clib)
  
  (c
    (list AGG_SIG_ME PUBKEY (sha256 1 amount))
    (list (list CREATE_COIN 0x1234567890abcdef amount))
  )
)`;

fs.writeFileSync(testClspPath, testClspContent);

try {
    const clspPuzzle = PuzzleBuilder.fromClsp(testClspPath);
    console.log('✓ Loaded .clsp file successfully');
    console.log('\nChiaLisp output:');
    console.log(clspPuzzle.serialize({ indent: true }));
} catch (error) {
    console.error('✗ Error:', error.message);
}

// Demo 2: Load a .coins file
console.log('\n\n2. Loading CoinScript (.coins) file:');
console.log('─'.repeat(50));

const testCoinsPath = path.join(__dirname, 'test-coin.coins');
const testCoinsContent = `
coin TestCoin {
    storage {
        address owner = "xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy";
    }
    
    action spend(address recipient, uint256 amount) {
        require(msg.sender == owner, "Not authorized");
        send_coin(recipient, amount);
    }
}`;

fs.writeFileSync(testCoinsPath, testCoinsContent);

try {
    const coinsPuzzle = PuzzleBuilder.fromCoinScript(testCoinsPath);
    console.log('✓ Loaded .coins file successfully');
    console.log('\nCompiled ChiaLisp:');
    console.log(coinsPuzzle.serialize({ indent: true }));
} catch (error) {
    console.error('✗ Error:', error.message);
}

// Demo 3: Compare with existing NFT layer
console.log('\n\n3. Loading existing NFT ownership layer:');
console.log('─'.repeat(50));

const nftPath = path.join(__dirname, '../src/chialisp/nft/nft_ownership_layer.clsp');
if (fs.existsSync(nftPath)) {
    try {
        const nftPuzzle = PuzzleBuilder.fromClsp(nftPath);
        console.log('✓ Loaded nft_ownership_layer.clsp');
        
        // Show mod hash
        console.log('Mod hash:', nftPuzzle.toModHash());
        
        // Show parameters
        const params = nftPuzzle.serialize().match(/\(mod\s*\(([^)]+)\)/)?.[1] || 'none';
        console.log('Parameters:', params);
    } catch (error) {
        console.error('✗ Error:', error.message);
    }
} else {
    console.log('✗ NFT ownership layer not found');
}

// Clean up
fs.unlinkSync(testClspPath);
fs.unlinkSync(testCoinsPath);

console.log('\n\n=== API Summary ===');
console.log('Static methods on PuzzleBuilder:');
console.log('');
console.log('  PuzzleBuilder.fromClsp(filePath)');
console.log('    - Loads any .clsp file');
console.log('    - Parses ChiaLisp AST');
console.log('    - Auto-detects parameters');
console.log('');
console.log('  PuzzleBuilder.fromCoinScript(filePath)'); 
console.log('    - Loads any .coins file');
console.log('    - Compiles CoinScript to ChiaLisp');
console.log('    - Returns main puzzle');
console.log('');
console.log('Both methods return a PuzzleBuilder instance ready to use!'); 