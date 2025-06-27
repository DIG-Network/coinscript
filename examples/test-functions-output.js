const { compileCoinScript } = require('../dist/coinscript');

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

console.log('=== Testing Function Compilation ===\n');

try {
    const result = compileCoinScript(coinScriptSource);
    
    console.log('Main puzzle tree (raw):');
    console.log(JSON.stringify(result.mainPuzzle.build(), null, 2));
    
    console.log('\nSerialized:');
    console.log(result.mainPuzzle.serialize({ indent: true }));
    
    console.log('\nMetadata:', result.metadata);
} catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
}
 