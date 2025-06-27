const { compileCoinScriptWithOptions } = require('../dist/coinscript');

// Test with @inner_puzzle actions but no default
const coinScriptSource = `
coin NoDefaultInnerPuzzle {
    @inner_puzzle
    action transfer(address recipient, uint256 amount) {
        require(amount > 0, "Amount must be positive");
        send(recipient, amount);
    }
    
    @inner_puzzle
    action burn(uint256 amount) {
        require(amount > 0, "Burn amount must be positive");
        emit TokenBurned(amount);
    }
    
    event TokenBurned(uint256 amount);
}
`;

console.log('=== @inner_puzzle Without Default Test ===\n');

try {
    const result = compileCoinScriptWithOptions(coinScriptSource, {
        format: 'chialisp',
        indent: true
    });

    if (Array.isArray(result)) {
        console.log('Number of puzzles generated:', result.length);
        result.forEach((puzzle, index) => {
            console.log(`\n--- Puzzle ${index + 1} ---`);
            console.log(puzzle);
        });
    } else {
        console.log('Single puzzle:');
        console.log(result);
    }
} catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
} 