const { compileCoinScript } = require('./dist/coinscript');

// Test with debug output
const source = `
  coin Test {
    storage uint256 factor = 50;
    action test() {
      uint256 total = coinAmount();
      uint256 half = total / 2;
      uint256 result = (total * factor) / 100;
      
      send(0x1111111111111111111111111111111111111111111111111111111111111111, half);
      send(0x2222222222222222222222222222222222222222222222222222222222222222, result);
    }
  }
`;

console.log('=== Debug Variable Resolution ===');
try {
  const result = compileCoinScript(source);
  const chialisp = result.mainPuzzle.serialize({ format: 'chialisp', indent: true });
  console.log('ChiaLisp:');
  console.log(chialisp);
  
  // Check what happened to each variable
  console.log('\nVariable Resolution:');
  console.log('- "total" in first send:', chialisp.includes('(/ total 2)') ? 'NOT replaced' : 'replaced');
  console.log('- "total" in second send:', chialisp.includes('(* total') ? 'NOT replaced' : 'replaced');
  console.log('- "factor" in second send:', chialisp.includes('factor') ? 'NOT replaced (should be 50)' : 'replaced with 50');
  
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
} 