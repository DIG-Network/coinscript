/**
 * Test that @singleton decorator returns the complete set of puzzles
 */

const { compileCoinScript } = require('../dist');

console.log('Testing @singleton decorator - complete puzzle set\n');

// CoinScript with @singleton decorator
const coinScript = `
@singleton
coin SingletonCoin {
  action default() {
    // Simple logic that requires a signature
    require(msg.sender == 0xb0b5e86ae04b01f6ee391a54fb9340a821fb8011f5da87e387f2b7feebe4a456061fb967c69a3f6f95e5b5e4c21bbfca);
    
    // Return conditions
    conditions;
  }
}`;

console.log('=== CoinScript Source ===\n');
console.log(coinScript);

// Compile the CoinScript
const result = compileCoinScript(coinScript);

console.log('\n=== Compilation Result ===\n');

// Check what puzzles were generated
console.log('Puzzles returned:');
console.log('- mainPuzzle:', result.mainPuzzle ? '✓' : '✗', '(singleton-wrapped puzzle)');
console.log('- innerPuzzle:', result.innerPuzzle ? '✓' : '✗', '(unwrapped CoinScript logic)');
console.log('- launcherPuzzle:', result.launcherPuzzle ? '✓' : '✗', '(singleton launcher)');

console.log('\nMetadata:');
console.log('- coinName:', result.metadata?.coinName);
console.log('- hasSingleton:', result.metadata?.hasSingleton);
console.log('- launcherId:', result.metadata?.launcherId);

// Serialize the puzzles to see their structure
console.log('\n=== Inner Puzzle (CoinScript logic) ===\n');
if (result.innerPuzzle) {
  console.log(result.innerPuzzle.serialize({ indent: true }));
} else {
  console.log('ERROR: Inner puzzle not generated!');
}

console.log('\n=== Main Puzzle (Singleton-wrapped) ===\n');
if (result.mainPuzzle) {
  const mainCode = result.mainPuzzle.serialize({ indent: true });
  console.log(mainCode.substring(0, 500) + '...\n(truncated for readability)');
  
  // Check if it includes singleton structure
  if (mainCode.includes('SINGLETON_STRUCT')) {
    console.log('✓ Contains SINGLETON_STRUCT (properly wrapped)');
  } else {
    console.log('✗ Missing SINGLETON_STRUCT!');
  }
} else {
  console.log('ERROR: Main puzzle not generated!');
}

console.log('\n=== Launcher Puzzle ===\n');
if (result.launcherPuzzle) {
  console.log(result.launcherPuzzle.serialize({ indent: true }));
} else {
  console.log('ERROR: Launcher puzzle not generated!');
}

console.log('\n=== Summary ===\n');
console.log('The @singleton decorator should generate:');
console.log('1. innerPuzzle - The actual CoinScript logic (unwrapped)');
console.log('2. mainPuzzle - The singleton-wrapped version of innerPuzzle');
console.log('3. launcherPuzzle - The launcher to create the singleton');
console.log('\nAll three are needed for a complete singleton implementation:');
console.log('- Use launcherPuzzle once to create the singleton coin');
console.log('- Use mainPuzzle for all subsequent spends of the singleton');
console.log('- innerPuzzle is useful for debugging or creating custom solutions');

// Calculate puzzle hashes (placeholder)
console.log('\n=== Puzzle Hashes ===\n');
if (result.innerPuzzle && result.mainPuzzle && result.launcherPuzzle) {
  console.log('Inner puzzle hash:', result.innerPuzzle.toModHash());
  console.log('Main puzzle hash:', result.mainPuzzle.toModHash());
  console.log('Launcher puzzle hash:', result.launcherPuzzle.toModHash());
} else {
  console.log('Cannot calculate hashes - missing puzzles!');
} 