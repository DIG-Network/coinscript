const { parseCoinScriptFile } = require('./dist');

// Simple coin to test formatting
const code = `
coin TestCoin {
    storage {
        address owner = "0x" + "00".repeat(32);
    }
    
    action transfer(address newOwner) {
        require(msg.sender == owner, "Only owner");
        owner = newOwner;
        send(newOwner, 1000);
    }
}
`;

const { compileCoinScript } = require('./dist');
const result = compileCoinScript(code);

console.log('=== Test Formatting ===\n');

// Test 1: Raw output
console.log('Raw serialize():');
console.log(result.mainPuzzle.serialize());
console.log('');

// Test 2: Indented output
console.log('With indent:');
console.log(result.mainPuzzle.serialize({ indent: true }));
console.log('');

// Test 3: Check if newlines are in the string
const indented = result.mainPuzzle.serialize({ indent: true });
console.log('Contains newlines?', indented.includes('\n'));
console.log('Number of newlines:', (indented.match(/\n/g) || []).length);

// Test 4: Display each line separately
console.log('\nLines:');
indented.split('\n').forEach((line, i) => {
    console.log(`${i}: ${line}`);
}); 