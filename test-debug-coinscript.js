const { compileCoinScript } = require('./dist/index.js');
const crypto = require('crypto');

// Test 1: Basic Payment
console.log('=== Basic Payment Test ===');
const ownerAddress = '0x' + crypto.randomBytes(32).toString('hex');
const coinscriptSource1 = `
  coin BasicPayment {
    storage address owner = ${ownerAddress};
    
    action pay(address recipient, uint256 amount) {
      require(msg.sender == owner, "Not authorized");
      send(recipient, amount);
    }
  }
`;

try {
  const result1 = compileCoinScript(coinscriptSource1);
  const chialisp = result1.mainPuzzle.serialize({ format: 'chialisp', compiled: false });
  console.log('ChiaLisp output:');
  console.log(chialisp);
  console.log('\n');
} catch (e) {
  console.error('Error:', e);
}

// Test 2: Multi-sig
console.log('=== Multi-Sig Test ===');
const signer1 = '0x' + crypto.randomBytes(32).toString('hex');
const signer2 = '0x' + crypto.randomBytes(32).toString('hex');
const signer3 = '0x' + crypto.randomBytes(32).toString('hex');

const coinscriptSource2 = `
  coin MultiSig2of3 {
    storage address signer1 = ${signer1};
    storage address signer2 = ${signer2};
    storage address signer3 = ${signer3};
    
    action spend(address to, uint256 amount, address sig1, address sig2) {
      uint256 validCount = 0;
      
      if (sig1 == signer1 || sig1 == signer2 || sig1 == signer3) {
        requireSignature(sig1);
        validCount = validCount + 1;
      }
      
      if (sig2 == signer1 || sig2 == signer2 || sig2 == signer3) {
        require(sig2 != sig1, "Duplicate signer");
        requireSignature(sig2);
        validCount = validCount + 1;
      }
      
      require(validCount == 2, "Need exactly 2 signatures");
      send(to, amount);
    }
  }
`;

try {
  const result2 = compileCoinScript(coinscriptSource2);
  const chialisp = result2.mainPuzzle.serialize({ format: 'chialisp', compiled: false });
  console.log('ChiaLisp output:');
  console.log(chialisp);
  console.log('\n');
} catch (e) {
  console.error('Error:', e);
}

// Test 3: String storage
console.log('=== String Storage Test ===');
const coinscriptSource3 = `
  coin StringTest {
    storage string name = "TestCoin";
    storage string symbol = "TC";
    
    action info() {
      send(0x1234567890123456789012345678901234567890123456789012345678901234, 1);
    }
  }
`;

try {
  const result3 = compileCoinScript(coinscriptSource3);
  const chialisp = result3.mainPuzzle.serialize({ format: 'chialisp', compiled: false });
  console.log('ChiaLisp output:');
  console.log(chialisp);
  console.log('\n');
} catch (e) {
  console.error('Error:', e);
} 