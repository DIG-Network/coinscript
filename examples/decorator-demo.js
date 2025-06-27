/**
 * Demo: @inner_puzzle decorator and output formats
 * 
 * This example shows how to use the @inner_puzzle decorator to create
 * modular puzzles and output them in different formats.
 */

const { compileCoinScriptWithOptions } = require('../dist/coinscript');
const fs = require('fs');

// Example CoinScript with @inner_puzzle decorator
const coinScriptSource = `
coin TokenWithInnerPuzzles {
    storage {
        address owner = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
        uint256 totalSupply = 1000000;
    }
    
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
    
    action default() {
        returnConditions();
    }
    
    event TokenBurned(uint256 amount);
}
`;

console.log('=== @inner_puzzle Decorator Demo ===\n');

// 1. Compile to formatted ChiaLisp (multiple puzzles)
console.log('1. Formatted ChiaLisp (multiple puzzles):');
console.log('=========================================');
const chialisp = compileCoinScriptWithOptions(coinScriptSource, {
    format: 'chialisp',
    indent: true
});

if (Array.isArray(chialisp)) {
    chialisp.forEach((puzzle, index) => {
        console.log(`\n--- Puzzle ${index + 1} (${index === 0 ? 'transfer action' : index === 1 ? 'burn action' : 'main puzzle'}) ---`);
        console.log(puzzle);
    });
} else {
    console.log(chialisp);
}

// 2. Single puzzle mode (curry inner puzzles)
console.log('\n\n2. Single Puzzle Mode (curried):');
console.log('==================================');
const singlePuzzle = compileCoinScriptWithOptions(coinScriptSource, {
    format: 'chialisp',
    single_puzzle: true,
    indent: true
});
console.log(singlePuzzle);

// 3. Compile to CLVM
console.log('\n\n3. Compiled CLVM:');
console.log('==================');
try {
    const clvm = compileCoinScriptWithOptions(coinScriptSource, {
        format: 'clvm',
        compiled: true
    });
    
    if (Array.isArray(clvm)) {
        clvm.forEach((puzzle, index) => {
            console.log(`\nPuzzle ${index + 1}: ${puzzle}`);
        });
    } else {
        console.log(clvm);
    }
} catch (error) {
    console.log('Error compiling to CLVM:', error.message);
}

// 4. Output as hex
console.log('\n\n4. Hex Output:');
console.log('===============');
try {
    const hex = compileCoinScriptWithOptions(coinScriptSource, {
        format: 'hex'
    });
    
    if (Array.isArray(hex)) {
        hex.forEach((puzzle, index) => {
            console.log(`\nPuzzle ${index + 1}: ${puzzle.substring(0, 64)}...`);
        });
    } else {
        console.log(hex.substring(0, 64) + '...');
    }
} catch (error) {
    console.log('Error converting to hex:', error.message);
}

// 5. Calculate module hashes
console.log('\n\n5. Module Hashes:');
console.log('==================');
try {
    const hashes = compileCoinScriptWithOptions(coinScriptSource, {
        format: 'modhash'
    });
    
    if (Array.isArray(hashes)) {
        hashes.forEach((hash, index) => {
            console.log(`\nPuzzle ${index + 1} hash: ${hash}`);
        });
    } else {
        console.log(`Puzzle hash: ${hashes}`);
    }
} catch (error) {
    console.log('Error calculating module hash:', error.message);
}

// Example of how inner puzzles work conceptually
console.log('\n\n=== How @inner_puzzle Works ===');
console.log('================================');
console.log(`
The @inner_puzzle decorator marks actions to be compiled as separate mod puzzles.
This enables modular puzzle composition where:

1. Each @inner_puzzle action becomes its own distinct puzzle
2. The main puzzle can reference these inner puzzles
3. In single_puzzle mode, all inner puzzles are curried into the main puzzle
4. This allows for upgradeable components and better code organization

Output formats:
- chialisp: Human-readable ChiaLisp code
- clvm: Compiled bytecode representation  
- hex: Hexadecimal encoding of the puzzle
- modhash: SHA256 tree hash used as the puzzle's unique identifier
`); 