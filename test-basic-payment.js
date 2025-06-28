const { compileCoinScript } = require('./dist/coinscript');

const ownerAddress = '0x1234567890123456789012345678901234567890123456789012345678901234';

const source = `
  coin BasicPayment {
    storage address owner = ${ownerAddress};
    
    action pay(address recipient, uint256 amount) {
      require(msg.sender == owner, "Not authorized");
      send(recipient, amount);
    }
  }
`;

console.log('=== Basic Payment Contract Test ===');
try {
  const result = compileCoinScript(source);
  const chialisp = result.mainPuzzle.serialize({ format: 'chialisp', indent: true });
  console.log('ChiaLisp output:');
  console.log(chialisp);
  
  console.log('\nAttempting to compile to hex...');
  try {
    const hex = result.mainPuzzle.serialize({ format: 'hex', compiled: true });
    console.log('Hex output:', hex.substring(0, 100) + '...');
  } catch (hexError) {
    console.error('Hex compilation error:', hexError.message);
  }
  
} catch (error) {
  console.error('Error:', error.message);
  console.error(error.stack);
} 