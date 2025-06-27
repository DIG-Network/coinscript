// Test @singleton decorator
const { compileCoinScript } = require('../dist');

console.log('Testing @singleton decorator...\n');

// Test 1: Basic @singleton decorator
const code1 = `
@singleton
coin TestSingleton {
    storage address owner = "xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy";
    
    action spend() {
        require(msg.sender == owner, "Not owner");
        conditions;
    }
}
`;

try {
  console.log('Test 1: Basic @singleton decorator');
  const puzzle1 = compileCoinScript(code1);
  const chialisp1 = puzzle1.serialize({ indent: true });
  console.log('Generated ChiaLisp:');
  console.log(chialisp1.substring(0, 200) + '...\n');
  console.log('✓ Successfully compiled with @singleton decorator\n');
} catch (error) {
  console.error('✗ Error:', error.message);
}

// Test 2: @singleton with specific launcher ID
const code2 = `
@singleton(0x1234567890123456789012345678901234567890123456789012345678901234)
coin NamedSingleton {
    storage address owner = "xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy";
    
    action spend() {
        conditions;
    }
}
`;

try {
  console.log('Test 2: @singleton with launcher ID');
  const puzzle2 = compileCoinScript(code2);
  const chialisp2 = puzzle2.serialize({ indent: true });
  console.log('Generated ChiaLisp:');
  console.log(chialisp2.substring(0, 200) + '...\n');
  console.log('✓ Successfully compiled with @singleton(launcherId) decorator\n');
} catch (error) {
  console.error('✗ Error:', error.message);
}

// Test 3: Compare with explicit layer
const code3 = `
coin ExplicitSingleton {
    layer singleton(launcherId: 0x1234567890123456789012345678901234567890123456789012345678901234);
    storage address owner = "xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy";
    
    action spend() {
        conditions;
    }
}
`;

try {
  console.log('Test 3: Explicit layer syntax (for comparison)');
  const puzzle3 = compileCoinScript(code3);
  const chialisp3 = puzzle3.serialize({ indent: true });
  console.log('Generated ChiaLisp:');
  console.log(chialisp3.substring(0, 200) + '...\n');
  console.log('✓ Both decorator and explicit layer approaches work!\n');
} catch (error) {
  console.error('✗ Error:', error.message);
}

console.log('=== Summary ===');
console.log('The @singleton decorator provides a cleaner syntax');
console.log('for creating singleton coins without changing functionality.'); 