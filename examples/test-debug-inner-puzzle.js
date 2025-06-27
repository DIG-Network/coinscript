const { compileCoinScript } = require('../dist/coinscript');

// Test with @inner_puzzle and default
const coinScriptSource = `
coin DebugInnerPuzzle {
    @inner_puzzle
    action transfer(address recipient, uint256 amount) {
        send(recipient, amount);
    }
    
    action default() {
        returnConditions();
    }
}
`;

console.log('=== Debug @inner_puzzle Test ===\n');

try {
    const result = compileCoinScript(coinScriptSource);
    
    console.log('Compilation result keys:', Object.keys(result));
    console.log('Has allPuzzles?', !!result.allPuzzles);
    console.log('Number of puzzles in allPuzzles:', result.allPuzzles?.length);
    console.log('Metadata:', JSON.stringify(result.metadata, null, 2));
    
    if (result.allPuzzles) {
        result.allPuzzles.forEach((puzzle, index) => {
            console.log(`\n--- Puzzle ${index + 1} ---`);
            console.log(puzzle.serialize({ indent: true }));
        });
    }
} catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
} 