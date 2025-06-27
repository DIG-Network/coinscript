/**
 * Run all CoinScript examples
 * This script executes each example in order to verify they compile
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('=== Running All CoinScript Examples ===\n');

// Find all .js example files (excluding this one and archived)
const exampleFiles = fs.readdirSync(__dirname)
  .filter(f => f.endsWith('.js') && f !== 'run-all.js' && f !== 'example-utils.js' && f !== 'demo-output.js')
  .filter(f => f.match(/^\d{2}-/)) // Only numbered examples
  .sort();

console.log(`Found ${exampleFiles.length} examples to run.\n`);

let passed = 0;
let failed = 0;
const failures = [];

// Run each example
exampleFiles.forEach((file, index) => {
  const exampleName = file.replace('.js', '');
  process.stdout.write(`[${index + 1}/${exampleFiles.length}] Running ${exampleName}... `);
  
  try {
    // Check if corresponding .coins file exists
    const coinsFile = file.replace('.js', '.coins');
    if (!fs.existsSync(path.join(__dirname, coinsFile))) {
      console.log('⚠️  SKIPPED (no .coins file)');
      return;
    }
    
    // Run the example
    execSync(`node ${file}`, { 
      cwd: __dirname,
      stdio: 'pipe' // Suppress output
    });
    
    console.log('✅ PASSED');
    passed++;
  } catch (error) {
    console.log('❌ FAILED');
    failed++;
    failures.push({
      file,
      error: error.message
    });
  }
});

// Summary
console.log('\n' + '='.repeat(50));
console.log(`\nSummary: ${passed} passed, ${failed} failed\n`);

if (failures.length > 0) {
  console.log('Failed examples:');
  failures.forEach(({ file, error }) => {
    console.log(`\n- ${file}`);
    console.log(`  Error: ${error.split('\n')[0]}`);
  });
}

// Exit with error code if any failed
process.exit(failed > 0 ? 1 : 0); 