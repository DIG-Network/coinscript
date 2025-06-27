/**
 * CLSP Formatter - Specific Pattern Fixes
 * Demonstrates the exact formatting issues mentioned by the user
 */

const { AdvancedCLSPFormatter } = require('./clsp-formatter');

console.log('=== CLSP Formatter: Specific Pattern Fixes ===\n');
console.log('This demonstrates the exact formatting patterns you mentioned:\n');

// Pattern 1: (i on separate lines
const pattern1Before = `(if condition
    (
        i
        first-arg
        second-arg
    )
    else-clause
)`;

const pattern1After = `(if condition
    (i
        first-arg
        second-arg
    )
    else-clause
)`;

console.log('Pattern 1: "(\\n    i" should be "(i"\n');
console.log('BEFORE:');
console.log(pattern1Before);
console.log('\nAFTER:');
console.log(pattern1After);
console.log('\n' + '-'.repeat(50) + '\n');

// Pattern 2: (c on separate lines
const pattern2Before = `(defun build-list (items)
    (
        c
        first-item
        (build-list rest)
    )
)`;

const pattern2After = `(defun build-list (items)
    (c
        first-item
        (build-list rest)
    )
)`;

console.log('Pattern 2: "(\\n    c" should be "(c"\n');
console.log('BEFORE:');
console.log(pattern2Before);
console.log('\nAFTER:');
console.log(pattern2After);
console.log('\n' + '-'.repeat(50) + '\n');

// Pattern 3: Complete example from slot-machine
const slotMachineExample = `; From action.clsp
(mod (
    FINALIZER
    MERKLE_ROOT
    STATE
    puzzles
    selectors_and_proofs
)
    (include merkle_utils.clib)
    
    (a
        FINALIZER
        (list
            MERKLE_ROOT
            STATE
            (run_actions
                puzzles                
                ()
                (list (
                    c
                    ()
                    STATE
                ))
                selectors
            )
        )
    )
)`;

console.log('Pattern 3: Real example from slot-machine/action.clsp\n');
console.log('Issues to fix:');
console.log('- "(mod (" should be "(mod ("');
console.log('- "(list (" with "c" on next line should be "(list (c"\n');

const formatter = new AdvancedCLSPFormatter();
const formatted = formatter.format(slotMachineExample);

console.log('ORIGINAL:');
console.log(slotMachineExample);
console.log('\nFORMATTED:');
console.log(formatted);

console.log('\n' + '='.repeat(60) + '\n');

console.log('Summary of fixes:');
console.log('✓ Opening paren and first element always on same line');
console.log('✓ Applies to: i, c, defun, mod, list, a, etc.');
console.log('✓ Preserves all other formatting and indentation');
console.log('✓ Maintains comments and structure');

console.log('\nTo apply these fixes to all slot-machine CLSP files:');
console.log('node clsp-formatter.js ../../slot-machine/puzzles/singleton --advanced'); 