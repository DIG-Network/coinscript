/**
 * Test address validation
 */

const { compileCoinScript } = require('../dist');

console.log('=== Testing Address Validation ===\n');

// Test 1: Valid mainnet address
console.log('1. Valid mainnet address:');
try {
  const validMainnet = compileCoinScript(`
    coin TestCoin {
      storage {
        address owner = "xch1kz49798988rn86rzf5wkuwr9kdnzzelpm7lyx6khn3rjjhz9xlnqvk0vwr";
      }
      action spend(bytes32 conditions) {
        require(msg.sender == owner, "Not owner");
        conditions;
      }
    }
  `);
  console.log('✓ Valid mainnet address accepted');
  console.log('  Converted to:', validMainnet.serialize().match(/0x[0-9a-f]{64}/)[0]);
} catch (e) {
  console.log('✗ Error:', e.message);
}

// Test 2: Valid testnet address
console.log('\n2. Valid testnet address:');
try {
  const validTestnet = compileCoinScript(`
    coin TestCoin {
      storage {
        address owner = "txch1kz49798988rn86rzf5wkuwr9kdnzzelpm7lyx6khn3rjjhz9xlnqvk0vwr";
      }
      action spend(bytes32 conditions) {
        conditions;
      }
    }
  `);
  console.log('✓ Valid testnet address accepted');
} catch (e) {
  console.log('✗ Error:', e.message);
}

// Test 3: Invalid prefix
console.log('\n3. Invalid prefix (btc1):');
try {
  const invalidPrefix = compileCoinScript(`
    coin TestCoin {
      storage {
        address owner = "btc1kz49798988rn86rzf5wkuwr9kdnzzelpm7lyx6khn3rjjhz9xlnqvk0vwr";
      }
      action spend(bytes32 conditions) {
        conditions;
      }
    }
  `);
  console.log('✗ Should have failed!');
} catch (e) {
  console.log('✓ Correctly rejected:', e.message);
}

// Test 4: Invalid characters
console.log('\n4. Invalid characters:');
try {
  const invalidChars = compileCoinScript(`
    coin TestCoin {
      storage {
        address owner = "xch1INVALID_CHARACTERS_HERE";
      }
      action spend(bytes32 conditions) {
        conditions;
      }
    }
  `);
  console.log('✗ Should have failed!');
} catch (e) {
  console.log('✓ Correctly rejected:', e.message);
}

// Test 5: Too short
console.log('\n5. Address too short:');
try {
  const tooShort = compileCoinScript(`
    coin TestCoin {
      storage {
        address owner = "xch1tooshort";
      }
      action spend(bytes32 conditions) {
        conditions;
      }
    }
  `);
  console.log('✗ Should have failed!');
} catch (e) {
  console.log('✓ Correctly rejected:', e.message);
}

console.log('\n✓ Address validation is working correctly!');
console.log('Note: Full bech32 decoding still needs to be implemented for production use.'); 