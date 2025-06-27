/**
 * Comprehensive test of all CoinScript features
 */

const fs = require('fs');

// Test cases covering all features
const testCases = [
  // Basic tests
  {
    name: '20-basic-spend',
    code: `coin BasicSpend {
    action spend(bytes32 conditions) {
        conditions
    }
}`
  },
  
  {
    name: '21-default-action',
    code: `coin DefaultAction {
    action default(bytes32 conditions) {
        conditions
    }
}`
  },
  
  // Storage tests
  {
    name: '22-single-storage',
    code: `coin SingleStorage {
    storage address owner = "xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy";
    
    action spend(bytes32 conditions) {
        require(msg.sender == owner, "Not owner");
        conditions
    }
}`
  },
  
  {
    name: '23-multiple-storage',
    code: `coin MultipleStorage {
    storage address admin = "xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy";
    storage uint256 maxAmount = 1000000;
    storage bool isActive = true;
    
    action spend(uint256 amount, bytes32 conditions) {
        require(msg.sender == admin, "Not admin");
        require(amount <= maxAmount, "Too much");
        require(isActive, "Not active");
        conditions
    }
}`
  },
  
  // State tests
  {
    name: '24-state-variables',
    code: `coin StateVariables {
    state uint256 counter = 0;
    state address lastUser = "xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy";
    
    action increment() {
        counter += 1;
        lastUser = msg.sender;
        conditions
    }
}`
  },
  
  // Send tests
  {
    name: '25-send-simple',
    code: `coin SendSimple {
    action transfer(address to, uint256 amount) {
        send(to, amount);
    }
}`
  },
  
  {
    name: '26-send-with-memo',
    code: `coin SendWithMemo {
    action transfer(address to, uint256 amount) {
        send(to, amount, 0x74657374);
    }
}`
  },
  
  // Event tests
  {
    name: '27-events',
    code: `coin Events {
    event Transfer(address to, uint256 amount);
    event Approval(address owner, address spender);
    
    action transfer(address to, uint256 amount) {
        send(to, amount);
        emit Transfer(to, amount);
    }
}`
  },
  
  // Control flow tests
  {
    name: '28-if-statement',
    code: `coin IfStatement {
    storage uint256 threshold = 1000;
    
    action spend(uint256 amount, bytes32 conditions) {
        if (amount > threshold) {
            require(msg.sender == 0x1234567890123456789012345678901234567890123456789012345678901234, "Admin required");
        }
        conditions
    }
}`
  },
  
  {
    name: '29-if-else',
    code: `coin IfElse {
    action spend(uint256 amount, address recipient) {
        if (amount > 1000) {
            send(recipient, amount - 100);
        } else {
            send(recipient, amount);
        }
    }
}`
  },
  
  // Multiple actions
  {
    name: '30-multiple-actions',
    code: `coin MultipleActions {
    storage address owner = "xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy";
    
    action default(bytes32 conditions) {
        conditions
    }
    
    action mint(uint256 amount) {
        require(msg.sender == owner, "Not owner");
        send(msg.sender, amount);
    }
    
    action burn() {
        require(msg.sender == owner, "Not owner");
        conditions
    }
}`
  },
  
  // Expression tests
  {
    name: '31-arithmetic',
    code: `coin Arithmetic {
    action calculate(uint256 x, uint256 y) {
        require(x + y > 100, "Sum too small");
        require(x * 2 <= y, "X too large");
        send(0x0000000000000000000000000000000000000000000000000000000000000000, x + y);
    }
}`
  },
  
  {
    name: '32-boolean-logic',
    code: `coin BooleanLogic {
    storage address admin = "xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy";
    storage address operator = "xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy";
    
    action spend(address sender, bytes32 conditions) {
        require(sender == admin || sender == operator, "Not authorized");
        require(!(sender == 0x0000000000000000000000000000000000000000000000000000000000000000), "Invalid sender");
        conditions
    }
}`
  },
  
  // Complex example
  {
    name: '33-complex-example',
    code: `coin ComplexExample {
    storage address treasury = "xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy";
    storage uint256 feePercent = 5;
    
    state uint256 totalVolume = 0;
    
    event Trade(address from, address to, uint256 amount, uint256 fee);
    
    action trade(address to, uint256 amount) {
        require(amount > 0, "Invalid amount");
        
        uint256 fee = (amount * feePercent) / 100;
        uint256 netAmount = amount - fee;
        
        send(treasury, fee);
        send(to, netAmount, 0x7472616465);
        
        totalVolume += amount;
        
        emit Trade(msg.sender, to, amount, fee);
    }
}`
  }
];

// Write all test files
console.log('Creating test files...\n');
testCases.forEach(test => {
  fs.writeFileSync(`${test.name}.coins`, test.code);
  console.log(`Created ${test.name}.coins`);
});

// Now try to compile each one
console.log('\n\nAttempting to compile test cases...\n');

try {
  const { parseCoinScriptFile } = require('../dist/coinscript/parser');
  
  let passed = 0;
  let failed = 0;
  
  testCases.forEach(test => {
    process.stdout.write(`Testing ${test.name}... `);
    
    try {
      const puzzle = parseCoinScriptFile(`${test.name}.coins`);
      const chialisp = puzzle.build();
      console.log('✓ PASSED');
      
      // Save the output
      fs.writeFileSync(`${test.name}.clsp`, chialisp);
      passed++;
    } catch (error) {
      console.log(`✗ FAILED: ${error.message}`);
      failed++;
    }
  });
  
  console.log(`\n\nResults: ${passed} passed, ${failed} failed`);
} catch (error) {
  console.error('\nCannot run tests - build may have failed:', error.message);
  console.error('\nPlease run: cd .. && npm run build');
} 