const { compileCoinScript } = require('./dist/coinscript');

console.log('=== Solution Structure Test ===');

// Test with different parameter counts
const tests = [
  {
    name: 'No parameters',
    source: `
      coin Test {
        action test() {
          send(0x1111111111111111111111111111111111111111111111111111111111111111, 100);
        }
      }
    `,
    expectedSolution: '"test"'
  },
  {
    name: 'One parameter',
    source: `
      coin Test {
        action test(address recipient) {
          send(recipient, 100);
        }
      }
    `,
    expectedSolution: '("test" recipient)'
  },
  {
    name: 'Two parameters',
    source: `
      coin Test {
        action test(address recipient, uint256 amount) {
          send(recipient, amount);
        }
      }
    `,
    expectedSolution: '("test" recipient amount)'
  }
];

tests.forEach(test => {
  console.log(`\n### ${test.name}`);
  try {
    const result = compileCoinScript(test.source);
    const chialisp = result.mainPuzzle.serialize({ format: 'chialisp' });
    
    // Extract the mod line
    const modMatch = chialisp.match(/\(mod\s+([^)]+)\)/);
    if (modMatch) {
      console.log('Module parameters:', modMatch[1]);
    }
    
    console.log('Expected solution format:', test.expectedSolution);
    console.log('\nChiaLisp:');
    console.log(chialisp);
  } catch (error) {
    console.error('Error:', error.message);
  }
}); 