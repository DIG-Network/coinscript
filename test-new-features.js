const { compileCoinScript } = require('./dist/coinscript');

console.log('Testing new ChiaLisp features...\n');

// Test 1: Modulo operator
console.log('1. Testing modulo operator (%)');
try {
  const modCode = `
    coin ModuloTest {
      action calculate(uint256 a, uint256 b) {
        uint256 remainder = a % b;
        send(0x1234567890123456789012345678901234567890123456789012345678901234, remainder);
      }
    }
  `;
  
  const result = compileCoinScript(modCode);
  const chialisp = result.mainPuzzle.serialize({ format: 'chialisp', compiled: false });
  
  if (chialisp.includes('divmod') && chialisp.includes('(r')) {
    console.log('✓ Modulo operator correctly uses divmod and r');
  } else {
    console.log('✗ Modulo operator not working correctly');
    console.log(chialisp);
  }
} catch (e) {
  console.log('✗ Error:', e.message);
}

// Test 2: String operations
console.log('\n2. Testing string operations');
try {
  const stringCode = `
    coin StringTest {
      action testString(string s1, string s2) {
        string combined = concat(s1, " ", s2);
        uint256 length = strlen(combined);
        string sub = substr(combined, 0, 5);
        send(0x1234567890123456789012345678901234567890123456789012345678901234, length);
      }
    }
  `;
  
  const result = compileCoinScript(stringCode);
  const chialisp = result.mainPuzzle.serialize({ format: 'chialisp', compiled: false });
  
  const hasConcat = chialisp.includes('concat');
  const hasStrlen = chialisp.includes('strlen');
  const hasSubstr = chialisp.includes('substr');
  
  if (hasConcat && hasStrlen && hasSubstr) {
    console.log('✓ String operations (concat, strlen, substr) working');
  } else {
    console.log('✗ Missing string operations:');
    if (!hasConcat) console.log('  - concat');
    if (!hasStrlen) console.log('  - strlen');
    if (!hasSubstr) console.log('  - substr');
  }
} catch (e) {
  console.log('✗ Error:', e.message);
}

// Test 3: Bitwise operations
console.log('\n3. Testing bitwise operations');
try {
  const bitwiseCode = `
    coin BitwiseTest {
      action testBitwise(uint256 a, uint256 b) {
        uint256 andResult = a & b;
        uint256 orResult = a | b;
        uint256 xorResult = a ^ b;
        uint256 notResult = ~a;
        uint256 leftShift = a << 2;
        uint256 rightShift = a >> 2;
        
        send(0x1234567890123456789012345678901234567890123456789012345678901234, andResult);
      }
    }
  `;
  
  const result = compileCoinScript(bitwiseCode);
  const chialisp = result.mainPuzzle.serialize({ format: 'chialisp', compiled: false });
  
  const hasAnd = chialisp.includes('logand');
  const hasOr = chialisp.includes('logior');
  const hasXor = chialisp.includes('logxor');
  const hasNot = chialisp.includes('lognot');
  const hasLsh = chialisp.includes('lsh');
  const hasAsh = chialisp.includes('ash');
  
  if (hasAnd && hasOr && hasXor && hasNot && hasLsh && hasAsh) {
    console.log('✓ All bitwise operations working');
  } else {
    console.log('✗ Missing bitwise operations:');
    if (!hasAnd) console.log('  - logand');
    if (!hasOr) console.log('  - logior');
    if (!hasXor) console.log('  - logxor');
    if (!hasNot) console.log('  - lognot');
    if (!hasLsh) console.log('  - lsh');
    if (!hasAsh) console.log('  - ash');
  }
} catch (e) {
  console.log('✗ Error:', e.message);
}

// Test 4: Function definitions
console.log('\n4. Testing function definitions');
try {
  const functionCode = `
    coin FunctionTest {
      function square(uint256 x) returns (uint256) {
        return x * x;
      }
      
      inline function double(uint256 x) returns (uint256) {
        return x * 2;
      }
      
      action calculate(uint256 value) {
        uint256 squared = square(value);
        uint256 doubled = double(value);
        send(0x1234567890123456789012345678901234567890123456789012345678901234, squared);
      }
    }
  `;
  
  const result = compileCoinScript(functionCode);
  const chialisp = result.mainPuzzle.serialize({ format: 'chialisp', compiled: false });
  
  const hasDefun = chialisp.includes('defun square');
  const hasDefunInline = chialisp.includes('defun-inline double');
  
  if (hasDefun && hasDefunInline) {
    console.log('✓ Function definitions (defun and defun-inline) working');
  } else {
    console.log('✗ Function definition issues:');
    if (!hasDefun) console.log('  - defun not found');
    if (!hasDefunInline) console.log('  - defun-inline not found');
  }
} catch (e) {
  console.log('✗ Error:', e.message);
}

// Test 5: Constants
console.log('\n5. Testing constants');
try {
  const constCode = `
    coin ConstantTest {
      const uint256 MAX_VALUE = 1000000;
      const address TREASURY = 0x1234567890123456789012345678901234567890123456789012345678901234;
      
      action check(uint256 value) {
        require(value <= MAX_VALUE, "Too large");
        send(TREASURY, value);
      }
    }
  `;
  
  const result = compileCoinScript(constCode);
  const chialisp = result.mainPuzzle.serialize({ format: 'chialisp', compiled: false });
  
  const hasDefconstant = chialisp.includes('defconstant');
  const hasMaxValue = chialisp.includes('MAX_VALUE');
  const hasTreasury = chialisp.includes('TREASURY');
  
  if (hasDefconstant && hasMaxValue && hasTreasury) {
    console.log('✓ Constant definitions working');
  } else {
    console.log('✗ Constant definition issues:');
    if (!hasDefconstant) console.log('  - defconstant not found');
    if (!hasMaxValue) console.log('  - MAX_VALUE not found');
    if (!hasTreasury) console.log('  - TREASURY not found');
  }
} catch (e) {
  console.log('✗ Error:', e.message);
}

console.log('\nDone!'); 