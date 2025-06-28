import { compileCoinScript } from './src/coinscript/parser';

const coinscript = `
  coin TestCoin {
    action test() {
      require(msg.sender == 0x97f1d3a73197d7942695638c4fa9ac0fc3688c4f9774b905a14e3a3f171bac586c55e83ff97a1aeffb3af00adb22c6bb);
    }
  }
`;

try {
  const result = compileCoinScript(coinscript);
  const chialisp = result.mainPuzzle.serialize({ format: 'chialisp', single_puzzle: true });
  console.log('Generated ChiaLisp:');
  console.log(chialisp);
  console.log('\nChecking for AGG_SIG_ME:');
  console.log('Contains "AGG_SIG_ME":', chialisp.includes('AGG_SIG_ME'));
  console.log('Contains "(50":', chialisp.includes('(50'));
} catch (e: any) {
  console.error('Error:', e.message);
  console.error(e.stack);
} 