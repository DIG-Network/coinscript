const { compileCoinScript } = require('./dist/coinscript/parser');

// Test if basic variable assignment works
const basicAssignment = `coin TestCoin {
  action test() {
    let x = 5;
    send(0x1234567890123456789012345678901234567890123456789012345678901234, x);
  }
}`;

console.log('Testing basic assignment...');
try {
  const result = compileCoinScript(basicAssignment);
  console.log('SUCCESS: Basic assignment works');
} catch (e) {
  console.error('FAILED: Basic assignment failed:', e.message);
}

// Test basic function call
const basicFunction = `coin TestCoin {
  action test() {
    let x = abs(-5);
    send(0x1234567890123456789012345678901234567890123456789012345678901234, x);
  }
}`;

console.log('\nTesting basic function call...');
try {
  const result = compileCoinScript(basicFunction);
  console.log('SUCCESS: Basic function call works');
} catch (e) {
  console.error('FAILED: Basic function call failed:', e.message);
}

// Test strlen with number (should work)
const strlenNumber = `coin TestCoin {
  action test() {
    let x = strlen(5);
    send(0x1234567890123456789012345678901234567890123456789012345678901234, x);
  }
}`;

console.log('\nTesting strlen with number...');
try {
  const result = compileCoinScript(strlenNumber);
  console.log('SUCCESS: strlen with number works');
} catch (e) {
  console.error('FAILED: strlen with number failed:', e.message);
}

// Test strlen with single quotes
const strlenString = `coin TestCoin {
  action test() {
    let x = strlen('hello');
    send(0x1234567890123456789012345678901234567890123456789012345678901234, x);
  }
}`;

console.log('\nTesting strlen with single quotes...');
try {
  const result = compileCoinScript(strlenString);
  console.log('SUCCESS: strlen with single quotes works');
  const chialisp = result.mainPuzzle.serialize({ format: 'chialisp', single_puzzle: true });
  console.log('Output contains strlen:', chialisp.includes('strlen'));
} catch (e) {
  console.error('FAILED: strlen with single quotes failed:', e.message);
} 