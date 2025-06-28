const { PuzzleBuilder, puzzle } = require('../dist/builder');

console.log('Available PuzzleBuilder methods:');
const pb = new PuzzleBuilder();
const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(pb))
  .filter(name => typeof pb[name] === 'function' && name !== 'constructor')
  .sort();

console.log(methods.join('\n'));
