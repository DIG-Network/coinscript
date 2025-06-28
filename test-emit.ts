import { compileCoinScript } from './src/coinscript/parser';

const coinscript = `
  coin TestCoin {
    event Transfer(address from, address to, uint256 amount);
    
    action transfer(address to, uint256 amount) {
      emit Transfer(msg.sender, to, amount);
      send(to, amount);
    }
  }
`;

try {
  const result = compileCoinScript(coinscript);
  const chialisp = result.mainPuzzle.serialize({ format: 'chialisp', single_puzzle: true });
  console.log('Generated ChiaLisp:');
  console.log(chialisp);
  console.log('\nChecking for Transfer event:');
  console.log('Contains "Transfer":', chialisp.includes('Transfer'));
} catch (e: any) {
  console.error('Error:', e.message);
  console.error(e.stack);
} 