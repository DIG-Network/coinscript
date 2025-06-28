const { compileCoinScript } = require('./dist/coinscript/parser');

// Test with strlen where the result is used
const coinscript1 = `
coin TestCoin {
  action test() {
    let len = strlen("hello");
    send(0x1234567890123456789012345678901234567890123456789012345678901234, len);
  }
}
`;

console.log('Test 1: strlen with result used');
const result1 = compileCoinScript(coinscript1);
const chialisp1 = result1.mainPuzzle.serialize({ format: 'chialisp', single_puzzle: true });
console.log(chialisp1);
console.log('---\n');

// Test with concat where result is not used
const coinscript2 = `
coin TestCoin {
  action test() {
    let s = concat("hello", " ", "world");
    send(0x1234567890123456789012345678901234567890123456789012345678901234, 1);
  }
}
`;

console.log('Test 2: concat with result not used');
const result2 = compileCoinScript(coinscript2);
const chialisp2 = result2.mainPuzzle.serialize({ format: 'chialisp', single_puzzle: true });
console.log(chialisp2); 