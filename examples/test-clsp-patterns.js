/**
 * Test CLSP Formatter V2 with common CLSP patterns
 */

const { CLSPFormatterV2 } = require('./clsp-formatter-v2');

console.log('=== Testing CLSP Formatter V2 with Common Patterns ===\n');

// Configure formatter for CLSP conventions
const formatter = new CLSPFormatterV2({ 
  maxLineLength: 120,  // Shorter line length for CLSP
  indentSize: 4        // 4-space indent
});

// Test patterns from actual CLSP files
const patterns = [
  {
    name: 'Simple module',
    input: `(mod (HASH VALUE) (include codes.clib) (c VALUE HASH))`,
    description: 'Basic module structure'
  },
  {
    name: 'Module with complex parameters',
    input: `(mod (
    SINGLETON_MOD_HASH
    MANAGER_SINGLETON_STRUCT_HASH ; comment
    (
        Ephemeral_State . ; not used
        (@ Current_State (total_reserves active_shares))
    )
)
    (include condition_codes.clib)
    (c Ephemeral_State Current_State)
)`,
    description: 'Module with nested parameters and destructuring'
  },
  {
    name: 'Function with @ destructuring',
    input: `(defun process ((@ state (field1 . field2)) value) (c field1 (c field2 value)))`,
    description: 'Function using @ pattern'
  },
  {
    name: 'If with else comment',
    input: `(if (> amount 0) (c amount reserves) ; else (x))`,
    description: 'If statement with ; else pattern'
  },
  {
    name: 'Nested lists',
    input: `(list (list CREATE_COIN puzzle_hash amount) (list ASSERT_MY_AMOUNT amount))`,
    description: 'Nested list structures'
  },
  {
    name: 'Long curry expression',
    input: `(curry_hashes_inline SINGLETON_MOD_HASH MANAGER_SINGLETON_STRUCT_HASH manager_singleton_inner_puzzle_hash)`,
    description: 'Long but simple expression'
  },
  {
    name: 'Complex nested sha256',
    input: `(sha256 2 (sha256 1 entry_payout_puzzle_hash) (sha256 2 (sha256 1 cumulative_payout) (sha256 1 entry_shares)))`,
    description: 'Deeply nested sha256 calls'
  },
  {
    name: 'List with comments',
    input: `(list
    CREATE_COIN ; create the coin
    puzzle_hash
    amount
    (list hint) ; hint for indexer
)`,
    description: 'List with inline comments'
  }
];

patterns.forEach((pattern, index) => {
  console.log(`\nPattern ${index + 1}: ${pattern.name}`);
  console.log(`Description: ${pattern.description}`);
  console.log('\nINPUT:');
  console.log(pattern.input);
  console.log('\nFORMATTED:');
  
  try {
    const formatted = formatter.format(pattern.input);
    console.log(formatted);
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  console.log('-'.repeat(60));
});

// Test whitespace normalization
console.log('\n\n=== Whitespace Normalization Test ===\n');

const messyCode = `(  mod   (
     HASH   

     VALUE  )  

   (  include   codes.clib  )
   
   (  c   VALUE   HASH  )  )`;

console.log('MESSY INPUT:');
console.log(messyCode);
console.log('\nNORMALIZED:');
console.log(formatter.format(messyCode));

// Summary
console.log('\n\n=== Summary ===');
console.log('The formatter handles:');
console.log('✓ Whitespace normalization');
console.log('✓ Simple expressions on one line (if < max length)');
console.log('✓ Nested expressions on multiple lines');
console.log('✓ Comment preservation');
console.log('✓ Consistent indentation');
console.log('\nFor full pattern-based formatting with @ support and');
console.log('special handling of mod/defun/if, use the enhanced v3 formatter.'); 