const { compileCoinScript } = require('./dist/coinscript/parser');

const code = `
coin TestCoin {
  action test() {
    let len = strlen('hello');
    send(0x1234567890123456789012345678901234567890123456789012345678901234, len);
  }
}
`;

console.log('Compiling CoinScript with strlen...');
try {
  const result = compileCoinScript(code);
  console.log('Compilation successful');
  
  // Try different serialization formats
  try {
    const chialisp = result.mainPuzzle.serialize({ format: 'chialisp', single_puzzle: true });
    console.log('\nChiaLisp format:');
    console.log(chialisp);
  } catch (e) {
    console.error('\nChiaLisp serialization failed:', e.message);
  }
  
  try {
    const clvm = result.mainPuzzle.serialize({ format: 'clvm' });
    console.log('\nCLVM format:');
    console.log(clvm);
  } catch (e) {
    console.error('\nCLVM serialization failed:', e.message);
  }
  
  try {
    const hex = result.mainPuzzle.serialize({ format: 'hex' });
    console.log('\nHex format:');
    console.log(hex);
  } catch (e) {
    console.error('\nHex serialization failed:', e.message);
  }
} catch (e) {
  console.error('Compilation failed:', e.message);
  console.error(e.stack);
} 