const { compileCoinScriptWithOptions } = require('../dist/coinscript');

// Simple test with one @inner_puzzle action
const coinScriptSource = `
coin SimpleInnerPuzzle {
    @inner_puzzle
    action transfer(address recipient, uint256 amount) {
        send(recipient, amount);
    }
}
`;

console.log('=== Simple @inner_puzzle Test ===\n');

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