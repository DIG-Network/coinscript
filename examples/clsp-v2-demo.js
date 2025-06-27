/**
 * CLSP Formatter V2 Demo
 * Shows the specific formatting rules requested
 */

const { CLSPFormatterV2 } = require('./clsp-formatter-v2');

console.log('=== CLSP Formatter V2 - Line Length & Nesting Rules ===\n');

// Show the rules with examples
console.log('RULE 1: Simple expressions without nesting go on one line');
console.log('─'.repeat(55));
console.log('BEFORE:  (\\n  x\\n  y\\n  z\\n)');
console.log('AFTER:   (x y z)\n');

console.log('RULE 2: If line > 300 chars, format vertically');
console.log('─'.repeat(55));
console.log('BEFORE:  (very-long-expression with many parameters ...)');
console.log('AFTER:   (');
console.log('           x');
console.log('           y');
console.log('           z');
console.log('         )\n');

console.log('RULE 3: Nested expressions format with inner on separate lines');
console.log('─'.repeat(55));
console.log('BEFORE:  (x (x y z))');
console.log('AFTER:   (x');
console.log('           (x y z)');
console.log('         )\n');

console.log('═'.repeat(60));
console.log('\nLet\'s see these rules in action:\n');

const formatter = new CLSPFormatterV2({ maxLineLength: 300 });

// Example 1: Simple expressions
console.log('Example 1: Simple expressions (no nesting)\n');

const examples = [
  {
    input: `(
  assert
  condition
  "error message"
)`,
    description: 'Badly formatted simple expression'
  },
  {
    input: `(= MERKLE_ROOT (simplify_merkle_proof (sha256tree (a selector puzzles)) proof))`,
    description: 'Long but simple expression (< 300 chars)'
  },
  {
    input: `(c selector selectors_so_far)`,
    description: 'Short simple expression'
  }
];

examples.forEach(ex => {
  console.log(`${ex.description}:`);
  console.log('INPUT:');
  console.log(ex.input);
  console.log('\nFORMATTED:');
  console.log(formatter.format(ex.input));
  console.log('\n' + '─'.repeat(40) + '\n');
});

// Example 2: Nested expressions
console.log('\nExample 2: Nested expressions\n');

const nestedExamples = [
  {
    input: `(if pending_selectors (run_actions puzzles (c new_conditions current_conditions) (a (a selector puzzles) (list ephemeral_and_actual_state solution)) remaining_selectors remaining_solutions) (c ephemeral_and_actual_state (c new_conditions current_conditions)))`,
    description: 'Complex if statement with nested calls'
  },
  {
    input: `(list (list CREATE_COIN puzzle_hash amount) (list ASSERT_MY_AMOUNT amount))`,
    description: 'Nested list structures'
  },
  {
    input: `(a FINALIZER (list MERKLE_ROOT STATE (run_actions puzzles () (list (c () STATE)) selectors) finalizer_solution))`,
    description: 'Function application with nested arguments'
  }
];

nestedExamples.forEach(ex => {
  console.log(`${ex.description}:`);
  console.log('INPUT (truncated):');
  console.log(ex.input.substring(0, 80) + '...');
  console.log('\nFORMATTED:');
  console.log(formatter.format(ex.input));
  console.log('\n' + '─'.repeat(40) + '\n');
});

// Example 3: Line length demonstration
console.log('\nExample 3: Line length affects formatting\n');

// Create a very long simple expression
const longParams = Array.from({length: 50}, (_, i) => `param${i}`).join(' ');
const longExpr = `(function ${longParams})`;

console.log(`Expression length: ${longExpr.length} characters`);
console.log('Since it\'s > 300 chars, it formats vertically:\n');
console.log('FORMATTED:');
const formattedLong = formatter.format(longExpr);
console.log(formattedLong.substring(0, 200) + '...\n');

// Show with custom max length
const shortFormatter = new CLSPFormatterV2({ maxLineLength: 80 });
const mediumExpr = `(define-constant LONG_ADDRESS "xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy")`;

console.log('\nWith max length = 80:');
console.log(`Expression (${mediumExpr.length} chars):`);
console.log(mediumExpr);
console.log('\nFORMATTED:');
console.log(shortFormatter.format(mediumExpr));

console.log('\n' + '═'.repeat(60));
console.log('\nSummary:');
console.log('✓ Simple expressions stay on one line (unless > max length)');
console.log('✓ Nested expressions format with each nested part on its own line');
console.log('✓ Line length threshold is configurable (default: 300)');
console.log('✓ Preserves code structure and readability'); 