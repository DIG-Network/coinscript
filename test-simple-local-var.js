const { compileCoinScript } = require('./dist/coinscript');

// Test with arithmetic
const source = `
  coin Test {
    storage uint256 factor = 50;
    action test() {
      uint256 total = coinAmount();
      uint256 result = (total * factor) / 100;
      send(0x1111111111111111111111111111111111111111111111111111111111111111, result);
    }
  }
`;

console.log('=== Simple Local Variable Test ===');
try {
  const result = compileCoinScript(source);
  const chialisp = result.mainPuzzle.serialize({ format: 'chialisp' });
  console.log('ChiaLisp:');
  console.log(chialisp);
  console.log('\nExpected: result should be (/ (* @ 50) 100)');
  console.log('Actual: total is', chialisp.includes(' total ') ? 'NOT replaced' : 'replaced');
  console.log('Output contains:', chialisp.match(/CREATE_COIN[^)]+\s([^)]+)\)/)?.[1]);
} catch (error) {
  console.error('Error:', error.message);
} 