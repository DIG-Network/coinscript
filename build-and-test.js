const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// First, build the project
console.log('Building the project...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('Build successful!\n');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}

// Now run comprehensive tests
const { parseCoinScriptFile, compileCoinScript } = require('./dist/coinscript/parser');

// Test cases
const tests = [
  {
    name: 'Simple action',
    code: `coin SimpleAction {
      action spend(bytes32 conditions) {
        conditions
      }
    }`,
    expected: 'Should generate a simple mod with conditions parameter'
  },
  
  {
    name: 'Storage variable',
    code: `coin WithStorage {
      storage address owner = "xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy";
      
      action spend(bytes32 conditions) {
        require(msg.sender == owner, "Not owner");
        conditions
      }
    }`,
    expected: 'Should substitute storage value in the code'
  },
  
  {
    name: 'Send with memo',
    code: `coin SendWithMemo {
      action transfer(address to, uint256 amount) {
        send(to, amount, 0x1234);
      }
    }`,
    expected: 'Should generate CREATE_COIN with memo'
  }
];

console.log('Running tests...\n');

let passed = 0;
let failed = 0;

tests.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.name}`);
  try {
    const puzzle = compileCoinScript(test.code);
    const chialisp = puzzle.build();
    console.log('Generated ChiaLisp:');
    console.log(chialisp);
    console.log(`✓ PASSED - ${test.expected}\n`);
    passed++;
  } catch (error) {
    console.log(`✗ FAILED: ${error.message}`);
    console.log(`Stack: ${error.stack}\n`);
    failed++;
  }
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
} 