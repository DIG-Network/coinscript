const { compileCoinScript } = require('./dist/coinscript');
const { Program } = require('clvm-lib');

// Test 1: Basic Payment Contract
console.log('=== Test 1: Basic Payment Contract ===');
const basicPayment = `
  coin PaymentCoin {
    storage address owner = 0x1234567890123456789012345678901234567890123456789012345678901234;
    
    action pay(address recipient, uint256 amount) {
      require(msg.sender == owner, "Not authorized");
      send(recipient, amount);
    }
  }
`;

try {
  const result = compileCoinScript(basicPayment);
  const chialisp = result.mainPuzzle.serialize({ format: 'chialisp', indent: true });
  console.log('ChiaLisp output:');
  console.log(chialisp);
  
  // Try to compile to hex
  console.log('\nTrying to compile to hex...');
  const hex = result.mainPuzzle.serialize({ format: 'hex', compiled: true });
  console.log('Hex output:', hex);
  
  // Try to run with clvm-lib directly
  console.log('\nTrying to create Program from ChiaLisp...');
  const program = Program.fromSource(chialisp);
  console.log('Program created successfully');
  
  // Try to compile
  console.log('\nTrying to compile program...');
  const compiled = program.compile();
  console.log('Compiled:', compiled);
  
} catch (error) {
  console.error('Error:', error.message);
  console.error('Stack:', error.stack);
}

// Test 2: Payment Splitter (failing simulator test)
console.log('\n\n=== Test 2: Payment Splitter ===');
const variableTest = `
  coin PaymentSplitter {
    storage address recipient1 = 0x1111111111111111111111111111111111111111111111111111111111111111;
    storage uint256 share1 = 60;
    
    storage address recipient2 = 0x2222222222222222222222222222222222222222222222222222222222222222;
    storage uint256 share2 = 30;
    
    storage address recipient3 = 0x3333333333333333333333333333333333333333333333333333333333333333;
    storage uint256 share3 = 10;
    
    action split() {
      uint256 total = coinAmount();
      
      uint256 amount1 = (total * share1) / 100;
      uint256 amount2 = (total * share2) / 100;
      uint256 amount3 = total - amount1 - amount2;
      
      send(recipient1, amount1);
      send(recipient2, amount2);
      send(recipient3, amount3);
    }
  }
`;

try {
  const result = compileCoinScript(variableTest);
  const chialisp = result.mainPuzzle.serialize({ format: 'chialisp', indent: true });
  console.log('ChiaLisp output:');
  console.log(chialisp);
} catch (error) {
  console.error('Error:', error.message);
}

// Test 3: Address conversion
console.log('\n\n=== Test 3: Address Conversion ===');
const addressTest = `
  coin AddressTest {
    storage address owner = xch1xf23pd3ludh8chksgaxcs6dkhcwpfm0gv64h02q9rmy6mwwp8w7qtsp7ph;
    
    action transfer() {
      send(owner, 1000);
    }
  }
`;

try {
  const result = compileCoinScript(addressTest);
  const chialisp = result.mainPuzzle.serialize({ format: 'chialisp', indent: true });
  console.log('ChiaLisp output:');
  console.log(chialisp);
  console.log('\nIf address was converted correctly, it should show as a hex value (0x...)');
} catch (error) {
  console.error('Error:', error.message);
}

const coinscript = `
  coin TestCoin {
    action test(uint256 amount) {
      if ((amount > 100 && amount < 1000) || amount == 5000) {
        send(0x1234567890123456789012345678901234567890123456789012345678901234, amount);
      }
    }
  }
`;

try {
  const result = compileCoinScript(coinscript);
  const chialisp = result.mainPuzzle.serialize({ format: 'chialisp', single_puzzle: true });
  console.log('Generated ChiaLisp:');
  console.log(chialisp);
  console.log('\\nChecking for "all" and "any":');
  console.log('Contains "all":', chialisp.includes('all'));
  console.log('Contains "any":', chialisp.includes('any'));
} catch (e) {
  console.error('Error:', e.message);
  console.error(e.stack);
} 