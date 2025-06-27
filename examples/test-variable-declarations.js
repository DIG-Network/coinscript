const { compileCoinScriptWithOptions } = require('../dist/coinscript');

// Test variable declarations inside actions
const coinScriptSource = `
coin VariableDeclarations {
    // Constants
    const BASE_FEE = 100;
    const MULTIPLIER = 2;
    
    action transfer(address recipient, uint256 amount) {
        // Test variable declarations
        uint256 fee = amount * BASE_FEE / 10000;
        uint256 doubledFee = fee * MULTIPLIER;
        uint256 netAmount = amount - doubledFee;
        
        require(netAmount > 0, "Amount too small");
        
        send(recipient, netAmount);
        send(0xdeadbeef, doubledFee);
    }
}
`;

console.log('=== Variable Declarations Test ===\\n');

try {
    const result = compileCoinScriptWithOptions(coinScriptSource, {
        format: 'chialisp',
        indent: true
    });

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