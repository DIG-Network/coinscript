/**
 * Test the CLSP formatter
 */

const { AdvancedCLSPFormatter } = require('./clsp-formatter');
const fs = require('fs');

// Sample CLSP code with formatting issues
const sampleCLSP = `; action.clsp by yakuhito
;; Test file with formatting issues

(mod (
    FINALZIER
    MERKLE_ROOT
    STATE
    puzzles
    selectors_and_proofs
)
    (include merkle_utils.clib)
    (include sha256tree.clib)

    (defun item_in_list (the_item (@ the_list (first_item . remaining_list)))
        (if (= the_item first_item)
            1
            (item_in_list the_item remaining_list)
        )
    )

    (defun reduce_and_verify_proofs (
        MERKLE_ROOT
        puzzles
        selectors_so_far
        (@ pending_selectors_and_proofs ((selector . proof) . remaining_pending_selectors_and_proofs))
    )
        (if pending_selectors_and_proofs
            (if 
                (if proof
                    (= MERKLE_ROOT (simplify_merkle_proof (sha256tree (a selector puzzles)) proof))
                    ; else
                    (item_in_list selector selectors_so_far)
                )
                (reduce_and_verify_proofs
                    MERKLE_ROOT
                    puzzles
                    (c selector selectors_so_far)
                    remaining_pending_selectors_and_proofs
                )
                ; else
                (x)
            )
            ; else
            selectors_so_far
        )
    )
    
    (a
        FINALZIER
        (list
            MERKLE_ROOT
            STATE
            (run_actions
                puzzles                
                ()
                (list (c () STATE))
                (reduce_and_verify_proofs MERKLE_ROOT puzzles () selectors_and_proofs)
                solutions
            )
            finalizer_solution
        )
    )
)`;

console.log('=== CLSP Formatter Test ===\n');
console.log('Original code has formatting issues like:');
console.log('- "(mod (" on separate lines');
console.log('- "(defun reduce_and_verify_proofs (" with params on next line');
console.log('- "(\n    element" patterns\n');

const formatter = new AdvancedCLSPFormatter();
const formatted = formatter.format(sampleCLSP);

console.log('--- ORIGINAL ---');
console.log(sampleCLSP.substring(0, 200) + '...\n');

console.log('--- FORMATTED ---');
console.log(formatted.substring(0, 200) + '...\n');

// Save to files for comparison
fs.writeFileSync('test-original.clsp', sampleCLSP);
fs.writeFileSync('test-formatted.clsp', formatted);

console.log('Full files saved as:');
console.log('- test-original.clsp (before formatting)');
console.log('- test-formatted.clsp (after formatting)\n');

// Show specific fixes
console.log('Key fixes applied:');
console.log('1. "(mod (" -> "(mod ("');
console.log('2. Standalone "(" followed by element merged to same line');
console.log('3. Function definitions properly formatted');
console.log();

// Test on actual file if it exists
const testFile = '../slot-machine/puzzles/singleton/action.clsp';
if (fs.existsSync(testFile)) {
  console.log(`\nTesting on real file: ${testFile}`);
  const originalContent = fs.readFileSync(testFile, 'utf8');
  const formattedContent = formatter.format(originalContent);
  
  // Count fixes
  const originalLines = originalContent.split('\n');
  const formattedLines = formattedContent.split('\n');
  
  let fixes = 0;
  for (let i = 0; i < Math.min(originalLines.length, formattedLines.length); i++) {
    if (originalLines[i] !== formattedLines[i]) {
      fixes++;
    }
  }
  
  console.log(`Found ${fixes} lines that need formatting fixes.`);
  
  if (fixes > 0) {
    console.log('\nExample fixes:');
    let shown = 0;
    for (let i = 0; i < Math.min(originalLines.length, formattedLines.length) && shown < 3; i++) {
      if (originalLines[i] !== formattedLines[i]) {
        console.log(`\nLine ${i + 1}:`);
        console.log(`  Before: "${originalLines[i].substring(0, 50)}..."`);
        console.log(`  After:  "${formattedLines[i].substring(0, 50)}..."`);
        shown++;
      }
    }
  }
} 