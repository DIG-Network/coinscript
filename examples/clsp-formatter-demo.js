/**
 * Demo: CLSP Formatter Usage
 * Shows how to format ChiaLisp files in the slot-machine project
 */

const { AdvancedCLSPFormatter } = require('./clsp-formatter');
const fs = require('fs');
const path = require('path');

console.log('=== CLSP Formatter Demo ===\n');
console.log('This formatter fixes ChiaLisp indentation to follow the standard style:');
console.log('- Opening parenthesis and first element on same line: (i, (c, (defun, etc.');
console.log('- Proper alignment of nested expressions');
console.log('- Preserves comments and overall structure\n');

// Show before/after examples
console.log('BEFORE:');
console.log('-------');
console.log(`(mod (
    PARAM1
    PARAM2
)
    (defun myfunction (
        arg1
        arg2
    )
        (if condition
            (
                c
                value1
                value2
            )
            ; else
            ()
        )
    )
)`);

console.log('\nAFTER:');
console.log('------');
console.log(`(mod (PARAM1
    PARAM2
)
    (defun myfunction (arg1
        arg2
    )
        (if condition
            (c
                value1
                value2
            )
            ; else
            ()
        )
    )
)`);

console.log('\n' + '='.repeat(50) + '\n');

// Usage examples
console.log('USAGE EXAMPLES:\n');

console.log('1. Format a single file:');
console.log('   node clsp-formatter.js path/to/file.clsp --advanced\n');

console.log('2. Format all .clsp files in a directory:');
console.log('   node clsp-formatter.js ../slot-machine/puzzles/singleton --advanced\n');

console.log('3. Programmatic usage:');
console.log(`   const { AdvancedCLSPFormatter } = require('./clsp-formatter');
   const formatter = new AdvancedCLSPFormatter();
   const formatted = formatter.format(clspCode);
`);

console.log('='.repeat(50) + '\n');

// Check if we can access slot-machine files
const slotMachinePath = '../slot-machine/puzzles/singleton';
if (fs.existsSync(slotMachinePath)) {
  console.log('Found slot-machine singleton puzzles!\n');
  
  const files = fs.readdirSync(slotMachinePath)
    .filter(f => f.endsWith('.clsp'))
    .slice(0, 5); // Show first 5 files
  
  console.log('Files that can be formatted:');
  files.forEach(file => {
    const fullPath = path.join(slotMachinePath, file);
    const stats = fs.statSync(fullPath);
    console.log(`  - ${file} (${stats.size} bytes)`);
  });
  
  console.log('\nTo format all these files, run:');
  console.log(`  node clsp-formatter.js ${slotMachinePath} --advanced`);
} else {
  console.log('Slot-machine files not found at expected location.');
  console.log('Make sure the slot-machine directory is at ../slot-machine');
}

console.log('\n' + '='.repeat(50));
console.log('\nNOTE: The formatter is non-destructive and preserves:');
console.log('- Comments (both ; and ;;)');
console.log('- String literals');
console.log('- Overall code structure');
console.log('- Special formatting in data structures\n');

console.log('Always review changes and test your code after formatting!'); 