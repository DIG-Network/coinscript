const { compileCoinScript } = require('./dist/coinscript');

// Test with arithmetic
const source = `
  coin VariableTest {
    storage uint256 factor = 50;
    
    action test() {
      uint256 total = coinAmount();
      uint256 half = total / 2;
      uint256 calculated = (total * factor) / 100;
      
      send(0x1111111111111111111111111111111111111111111111111111111111111111, calculated);
    }
  }
`;

console.log('=== Variable Resolution Test ===');
try {
  const result = compileCoinScript(source);
  const chialisp = result.mainPuzzle.serialize({ format: 'chialisp', indent: true });
  console.log('ChiaLisp output:');
  console.log(chialisp);
  console.log('\nExpected: total should be replaced with @');
  console.log('Actual: ', chialisp.includes(' total ') ? 'total is NOT replaced' : 'total is replaced');
  console.log('\nExpected: calculated should be (/ (* @ 50) 100)');
  console.log('Actual ChiaLisp contains:', chialisp.includes('(/ (* total') ? '(/ (* total...' : 'something else');
} catch (error) {
  console.error('Error:', error.message);
} 