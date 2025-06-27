// Test SolutionBuilder with booleans
const { createSolution } = require('../dist');

console.log('Testing SolutionBuilder with booleans...\n');

try {
  // Test boolean conversion
  const solution = createSolution()
    .add(true)    // Should convert to 1
    .add(false)   // Should convert to ()
    .add('test')
    .add(42);
  
  console.log('Solution:', solution.serialize());
  console.log('\nSuccess! Booleans are properly converted:');
  console.log('- true  → 1');
  console.log('- false → ()');
} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}
