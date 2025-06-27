const { compileCoinScript, compileCoinScriptWithOptions } = require('../dist/coinscript');

// Test CoinScript with @inner_puzzle decorators
const testScript = `
coin TestInnerPuzzle {
    storage {
        address owner = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
    }
    
    @inner_puzzle
    action mint(address to, uint256 amount) {
        require(amount > 0, "Amount must be positive");
        send(to, amount);
    }
    
    @inner_puzzle
    action transfer(address from, address to, uint256 amount) {
        require(amount > 0, "Amount must be positive");
        send(to, amount);
    }
    
    action default() {
        returnConditions();
    }
}
`;

console.log('Testing @inner_puzzle decorator parsing...\n');

// First, compile normally to see the result structure
const result = compileCoinScript(testScript);

console.log('Compilation result:');
console.log('- Main puzzle:', result.mainPuzzle ? 'Created' : 'Missing');
console.log('- Has inner puzzle actions:', result.metadata?.hasInnerPuzzleActions || false);
console.log('- Number of puzzles:', result.allPuzzles?.length || 1);

if (result.additionalPuzzles) {
    console.log('\nAdditional puzzles:');
    Object.keys(result.additionalPuzzles).forEach(key => {
        console.log(`  - ${key}`);
    });
}

console.log('\n--- Multiple Puzzle Output (Array) ---');
const multiplePuzzles = compileCoinScriptWithOptions(testScript, {
    format: 'chialisp',
    indent: true
});

if (Array.isArray(multiplePuzzles)) {
    console.log(`Generated ${multiplePuzzles.length} puzzles:`);
    multiplePuzzles.forEach((puzzle, i) => {
        console.log(`\nPuzzle ${i + 1}:`);
        console.log(puzzle.substring(0, 200) + '...');
    });
} else {
    console.log('Single puzzle generated');
}

console.log('\n--- Single Puzzle Output (Curried) ---');
const singlePuzzle = compileCoinScriptWithOptions(testScript, {
    format: 'chialisp',
    single_puzzle: true,
    indent: true
});

console.log('Single puzzle (first 200 chars):');
console.log(typeof singlePuzzle === 'string' ? singlePuzzle.substring(0, 200) + '...' : 'Not a string');

console.log('\nTest completed!'); 