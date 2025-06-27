/**
 * Test CLSP Formatter V2 with line length and nesting rules
 */

const { CLSPFormatterV2 } = require('./clsp-formatter-v2');

console.log('=== CLSP Formatter V2 Test ===\n');
console.log('New formatting rules:');
console.log('1. Simple expressions without nesting go on one line');
console.log('2. Lines > 300 chars get formatted vertically');
console.log('3. Nested expressions format with inner on separate lines\n');

// Test cases
const testCases = [
  {
    name: 'Simple expression (short)',
    input: `(define MAX_HEIGHT 100)`,
    description: 'Should stay on one line'
  },
  {
    name: 'Simple expression (formatted badly)',
    input: `(
    define
    MAX_HEIGHT
    100
)`,
    description: 'Should be reformatted to one line'
  },
  {
    name: 'Nested expression',
    input: `(if (> x 10) (list x y z) ())`,
    description: 'Should format with nested expressions on separate lines'
  },
  {
    name: 'Complex nested',
    input: `(mod (SINGLETON_STRUCT inner_puzzle_hash)
    (curry_hashes_inline (f SINGLETON_STRUCT) (sha256tree SINGLETON_STRUCT) inner_puzzle_hash))`,
    description: 'Nested expressions each on their own line'
  },
  {
    name: 'Long simple expression',
    input: `(this_is_a_very_long_function_name with_many_parameters param1 param2 param3 param4 param5 param6 param7 param8 param9 param10 param11 param12 param13 param14 param15 param16 param17 param18 param19 param20 param21 param22 param23 param24 param25 param26 param27 param28 param29 param30 param31 param32 param33 param34 param35 param36)`,
    description: 'Should format vertically (> 300 chars)'
  },
  {
    name: 'Real example from slot-machine',
    input: `(list
    (list CREATE_COIN
        (curry_hashes ACTION_LAYER_MOD_HASH
            (curry_hashes FINALIZER_SELF_HASH
                (sha256 1 FINALIZER_SELF_HASH)) ; finalizer puzzle hash
            (sha256 1 Merkle_Root)
            (sha256tree New_State)) ; new inner ph
        1
        (list HINT))
    (flatten_list Conditions))`,
    description: 'Complex nested structure'
  }
];

const formatter = new CLSPFormatterV2({ maxLineLength: 300 });

testCases.forEach((test, index) => {
  console.log(`\nTest ${index + 1}: ${test.name}`);
  console.log(`Description: ${test.description}`);
  console.log('\nINPUT:');
  console.log(test.input);
  
  const formatted = formatter.format(test.input);
  console.log('\nOUTPUT:');
  console.log(formatted);
  console.log('-'.repeat(60));
});

// Test with shorter max line length
console.log('\n\nTesting with max line length = 50:\n');

const shortFormatter = new CLSPFormatterV2({ maxLineLength: 50 });

const shortTest = `(define-constant TREASURY_ADDRESS "xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy")`;

console.log('INPUT:');
console.log(shortTest);
console.log('\nOUTPUT (max 50 chars):');
console.log(shortFormatter.format(shortTest));

// Show line length calculation
console.log('\nLine length:', shortTest.length, 'characters');
console.log('Since it\'s > 50 chars, it formats vertically');

// Test preservation of comments
console.log('\n\nComment preservation test:\n');

const commentTest = `; This is a top-level comment
(mod (STATE)
    ; Inner comment
    (if (> STATE 0)
        (c STATE ()) ; inline comment
        ()))`;

console.log('INPUT:');
console.log(commentTest);
console.log('\nOUTPUT:');
console.log(formatter.format(commentTest)); 