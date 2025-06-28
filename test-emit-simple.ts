import { compileCoinScript } from './src/coinscript/parser';

const coinscript = `
  coin TestCoin {
    event Transfer(address from, address to, uint256 amount);
    
    action test() {
      emit Transfer(0x1111111111111111111111111111111111111111111111111111111111111111, 0x2222222222222222222222222222222222222222222222222222222222222222, 100);
    }
  }
`;

try {
  const result = compileCoinScript(coinscript);
  const chialisp = result.mainPuzzle.serialize({ format: 'chialisp', single_puzzle: true });
  console.log('Generated ChiaLisp:');
  console.log(chialisp);
  
  // Also generate CLVM hex to see the actual data
  const clvm = result.mainPuzzle.serialize({ format: 'hex', compiled: true });
  console.log('\nCLVM Hex:');
  console.log(clvm);
} catch (e: any) {
  console.error('Error:', e.message);
  console.error(e.stack);
} 