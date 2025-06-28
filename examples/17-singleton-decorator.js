const { compileCoinScriptWithOptions } = require('../dist/coinscript');
const path = require('path');
const fs = require('fs');

console.log('=== Singleton Decorator Example ===\n');

// Read the CoinScript file
const coinScriptPath = path.join(__dirname, '17-singleton-decorator.coins');
const coinScriptContent = fs.readFileSync(coinScriptPath, 'utf8');

try {
    // Compile the CoinScript
    const result = compileCoinScriptWithOptions(coinScriptContent, {
        format: 'chialisp',
        indent: true
    });
    
    console.log('Compilation successful!');
    
    // Result is either a string (single puzzle) or array of strings (multiple puzzles)
    if (Array.isArray(result)) {
        console.log('Number of puzzles generated:', result.length);
        
        if (result.length > 0) {
            console.log('\n1. First Puzzle (likely inner/launcher):');
            console.log('─'.repeat(50));
            console.log(result[0]);
            
            if (result.length > 1) {
                console.log('\n2. Main Puzzle (wrapped):');
                console.log('─'.repeat(50));
                console.log(result[result.length - 1]);
            }
        }
    } else {
        console.log('Single puzzle generated:');
        console.log('─'.repeat(50));
        console.log(result);
    }
    
    console.log('\nHow @singleton works:');
    console.log('─'.repeat(50));
    console.log('1. The @singleton decorator wraps your coin in a singleton layer');
    console.log('2. It generates both the main puzzle and a launcher puzzle');
    console.log('3. The launcher creates the singleton with a unique ID');
    console.log('4. The singleton ensures only one instance exists on-chain');
    console.log('5. Perfect for NFTs, DIDs, and other unique assets');
    
} catch (error) {
    console.error('Error compiling CoinScript:', error.message);
    console.error('\nStack trace:', error.stack);
    
    console.log('\nTroubleshooting:');
    console.log('1. Make sure the CoinScript syntax is valid');
    console.log('2. Check that decorators are properly formatted');
    console.log('3. Ensure all required fields are present');
} 