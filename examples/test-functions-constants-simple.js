const { compileCoinScriptWithOptions } = require('../dist/coinscript');

// Simple test with just constants
const coinScriptSource = `
coin SimpleConstants {
    // Constants
    const FEE_RATE = 100;
    const MAX_AMOUNT = 1000000;
    const OWNER_ADDRESS = 0xdeadbeef;
    
    // Action using constants
    action transfer(address recipient, uint256 amount) {
        require(amount > 0, "Amount must be positive");
        require(amount <= MAX_AMOUNT, "Amount too large");
        
        send(recipient, amount);
    }
    
    // Inner puzzle action
    @inner_puzzle
    action sendToOwner(uint256 amount) {
        require(amount > 0, "Amount must be positive");
        send(OWNER_ADDRESS, amount);
    }
}
`;

console.log('=== Simple Constants Test ===\\n');

try {
    console.log('Starting compilation...');
    const result = compileCoinScriptWithOptions(coinScriptSource, {
        format: 'chialisp',
        indent: true
    });
    
    console.log('Compilation result type:', typeof result);
    console.log('Is array?', Array.isArray(result));

    if (Array.isArray(result)) {
        console.log('Number of puzzles generated:', result.length);
        result.forEach((puzzle, index) => {
            console.log(`\\n--- Puzzle ${index + 1} ---`);
            console.log(puzzle);
        });
    } else {
        console.log('Single puzzle:');
        console.log(result);
    }
} catch (error) {
    console.error('Compilation error:', error.message);
    console.error(error.stack);
} 