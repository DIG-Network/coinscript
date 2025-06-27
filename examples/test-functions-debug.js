const { compileCoinScript } = require('../dist/coinscript');
const { serialize } = require('../dist/core');

// Test with functions to see full compilation result
const coinScriptSource = `
coin FunctionsTest {
    // Constants
    const FEE_RATE = 100;
    
    // Function definition
    function calculateFee(uint256 amount) => uint256 {
        return amount * FEE_RATE / 10000;
    }
    
    // Inline function
    inline function isValidAmount(uint256 amount) => bool {
        return amount > 0;
    }
    
    // Action using functions
    action transfer(address recipient, uint256 amount) {
        require(isValidAmount(amount), "Invalid amount");
        
        // Calculate fee and send
        send(recipient, amount - calculateFee(amount));
    }
}
`;

console.log('=== Testing Function Node Generation ===\n');

try {
    const result = compileCoinScript(coinScriptSource);
    
    // Access the internal state to debug
    console.log('Number of puzzles generated:', result.allPuzzles?.length || 0);
    
    // Try to see if function nodes exist
    const generator = {
        _functionNodes: []
    };
    
    console.log('\nDEBUG: Looking for function definitions...');
    
    // Serialize the main puzzle to see what we get
    const puzzleTree = result.mainPuzzle.build();
    const serialized = serialize(puzzleTree, { indent: true });
    
    console.log('\nMain puzzle (formatted):');
    console.log(serialized);
    
} catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
} 