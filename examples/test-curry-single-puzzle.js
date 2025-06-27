const { compileCoinScriptWithOptions } = require('../dist/coinscript');

// Test single puzzle mode with @inner_puzzle actions
const coinScriptSource = `
coin CurryTest {
    @inner_puzzle
    action transfer(address recipient, uint256 amount) {
        require(amount > 0);
        send(recipient, amount);
    }
    
    @inner_puzzle
    action burn(uint256 amount) {
        require(amount > 0);
        // Burning by sending to a dead address
        send(0x000000000000000000000000000000000000000000000000000000000000dead, amount);
    }
    
    // Main routing action
    action default() {
        // This gets called when no specific action is provided
        exception("Must specify an action");
    }
}
`;

console.log('=== Testing Single Puzzle Mode (Currying) ===\\n');

try {
    // Test normal mode - should return array of puzzles
    console.log('1. Normal mode (multiple puzzles):');
    const multiplePuzzles = compileCoinScriptWithOptions(coinScriptSource, { 
        format: 'chialisp',
        indent: true 
    });
    
    if (Array.isArray(multiplePuzzles)) {
        console.log(`Generated ${multiplePuzzles.length} puzzles`);
        multiplePuzzles.forEach((puzzle, i) => {
            console.log(`\\n--- Puzzle ${i + 1} ---`);
            console.log(puzzle);
        });
    } else {
        console.log('Single puzzle:', multiplePuzzles);
    }
    
    console.log('\\n\\n2. Single puzzle mode (curried):');
    const singlePuzzle = compileCoinScriptWithOptions(coinScriptSource, { 
        format: 'chialisp',
        indent: true,
        single_puzzle: true 
    });
    
    console.log('Output:', singlePuzzle);
    
} catch (error) {
    console.error('Error:', error.message);
}
