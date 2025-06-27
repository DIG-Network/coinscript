const { compileCoinScriptWithOptions } = require('../dist/coinscript');

// Test CLVM compilation with functions
const coinScriptSource = `
coin FunctionsTest {
    const FEE_RATE = 100;
    
    function calculateFee(uint256 amount) => uint256 {
        return amount * FEE_RATE / 10000;
    }
    
    inline function isValidAmount(uint256 amount) => bool {
        return amount > 0;
    }
    
    action transfer(address recipient, uint256 amount) {
        require(isValidAmount(amount), "Invalid amount");
        uint256 fee = calculateFee(amount);
        send(recipient, amount - fee);
    }
}
`;

console.log('=== Testing CLVM Compilation ===\n');

try {
    // Test different output formats
    console.log('1. ChiaLisp format:');
    const chialisp = compileCoinScriptWithOptions(coinScriptSource, { 
        format: 'chialisp', 
        indent: true 
    });
    console.log(chialisp);
    
    console.log('\n2. CLVM format (compiled):');
    const clvm = compileCoinScriptWithOptions(coinScriptSource, { 
        format: 'clvm',
        compiled: true 
    });
    console.log(clvm.toString());
    
    console.log('\n3. Hex format:');
    const hex = compileCoinScriptWithOptions(coinScriptSource, { 
        format: 'hex',
        compiled: true 
    });
    console.log(hex);
    
    console.log('\n4. Modhash:');
    const modhash = compileCoinScriptWithOptions(coinScriptSource, { 
        format: 'modhash' 
    });
    console.log(modhash);
    
} catch (error) {
    console.error('Error:', error.message);
} 