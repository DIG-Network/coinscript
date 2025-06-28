const { compileCoinScript } = require('./dist/coinscript');

const source = `
  coin SimpleTest {
    action transfer(address recipient, uint256 amount) {
      send(recipient, amount);
    }
  }
`;

console.log('=== Simple Action Test ===');
try {
  const result = compileCoinScript(source);
  const chialisp = result.mainPuzzle.serialize({ format: 'chialisp', indent: true });
  console.log('ChiaLisp output:');
  console.log(chialisp);
  
  console.log('\nAttempting to compile to hex...');
  try {
    const hex = result.mainPuzzle.serialize({ format: 'hex', compiled: true });
    console.log('Success! Hex:', hex.substring(0, 50) + '...');
  } catch (err) {
    console.log('Hex compilation error:', err.message);
  }
} catch (error) {
  console.error('Error:', error.message);
} 