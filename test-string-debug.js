const { compileCoinScript } = require('./dist/coinscript/parser');

// Create a simple debug test
console.log('Testing string tokenization with single quotes only...');

// Test the most basic case
const simpleTest = 'strlen("hello")';
console.log('Input:', simpleTest);

// Try to compile a minimal program
const minimalProgram = `coin TestCoin {
  action test() {
    send(0x1234567890123456789012345678901234567890123456789012345678901234, 5);
  }
}`;

try {
  const result = compileCoinScript(minimalProgram);
  console.log('\nMinimal program compiled successfully');
  const chialisp = result.mainPuzzle.serialize({ format: 'chialisp', single_puzzle: true });
  console.log('Output:', chialisp);
} catch (e) {
  console.error('\nMinimal program failed:', e.message);
}

// Now try with strlen using single quotes
const withStrlen = `coin TestCoin {
  action test() {
    let len = strlen('hello');
    send(0x1234567890123456789012345678901234567890123456789012345678901234, len);
  }
}`;

console.log('\n\nTesting with strlen and single quotes...');
try {
  const result = compileCoinScript(withStrlen);
  console.log('Compilation successful');
  const chialisp = result.mainPuzzle.serialize({ format: 'chialisp', single_puzzle: true });
  console.log('Output:', chialisp);
} catch (e) {
  console.error('Compilation failed:', e.message);
  console.error('Stack:', e.stack);
}

// Test double quotes should fail
const withDoubleQuotes = `coin TestCoin {
  action test() {
    let len = strlen("hello");
    send(0x1234567890123456789012345678901234567890123456789012345678901234, len);
  }
}`;

console.log('\n\nTesting with double quotes (should fail)...');
try {
  const result = compileCoinScript(withDoubleQuotes);
  console.log('ERROR: Compilation should have failed!');
} catch (e) {
  console.log('Good: Compilation correctly failed:', e.message);
}

// Try different string formats
const tests = [
  {
    name: 'Single quotes',
    code: `
coin TestCoin {
  action test() {
    let len = strlen('hello');
    send(0x1234567890123456789012345678901234567890123456789012345678901234, len);
  }
}
`
  },
  {
    name: 'Double quotes in template literal',
    code: `
coin TestCoin {
  action test() {
    let len = strlen("hello");
    send(0x1234567890123456789012345678901234567890123456789012345678901234, len);
  }
}
`
  },
  {
    name: 'Escaped double quotes',
    code: `
coin TestCoin {
  action test() {
    let len = strlen(\\"hello\\");
    send(0x1234567890123456789012345678901234567890123456789012345678901234, len);
  }
}
`
  }
];

tests.forEach(test => {
  console.log(`\n=== ${test.name} ===`);
  try {
    const result = compileCoinScript(test.code);
    console.log('Compilation successful');
    
    // Serialize to ChiaLisp
    const chialisp = result.mainPuzzle.serialize({ format: 'chialisp', single_puzzle: true });
    console.log('\nGenerated ChiaLisp:');
    console.log(chialisp);
  } catch (e) {
    console.error('Compilation error:', e.message);
  }
}); 