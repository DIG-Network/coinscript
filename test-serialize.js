const { PuzzleBuilder } = require('../dist/builder');

console.log('Testing serialize...\n');

// Create a simple puzzle
const puzzle = new PuzzleBuilder();
puzzle.comment('Simple test');
puzzle.returnConditions();

console.log('Building puzzle...');
const tree = puzzle.build();
console.log('Tree:', JSON.stringify(tree, null, 2));

console.log('\nTrying to serialize...');
try {
  const result = puzzle.serialize();
  console.log('Type of result:', typeof result);
  console.log('Result:', result);
} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
} 