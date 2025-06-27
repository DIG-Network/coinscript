const { compileCoinScriptWithOptions } = require('../dist/coinscript');

// Test with constants and functions
const coinScriptSource = `
coin FunctionsAndConstants {
    // Constants
    const FEE_RATE = 100;
    const MAX_AMOUNT = 1000000;
    const OWNER_ADDRESS = 0xdeadbeef;
    
    // Regular function
    function calculateFee(uint256 amount) => uint256 {
        return amount * FEE_RATE / 10000;
    }
    
    // Inline function
    inline function isValidAmount(uint256 amount) => bool {
        return amount > 0 && amount <= MAX_AMOUNT;
    }
    
    // Action using functions
    action transfer(address recipient, uint256 amount) {
        require(isValidAmount(amount), "Invalid amount");
        
        // Send net amount after fee
        send(recipient, amount - calculateFee(amount));
        // Send fee to owner
        send(OWNER_ADDRESS, calculateFee(amount));
    }
    
    // Inner puzzle action with functions
    @inner_puzzle
    action swap(address tokenOut, uint256 amountIn) {
        require(isValidAmount(amountIn), "Invalid input amount");
        send(tokenOut, amountIn);
    }
}
`;

console.log('=== Functions and Constants Test ===\\n');

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