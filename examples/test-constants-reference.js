const { compileCoinScript } = require('../dist/coinscript');

// Test constants compilation to defconstant
const coinScriptSource = `
coin ConstantsTest {
    // Constants should compile to defconstant
    const NEW_OWNER_CONDITION = -10;
    const ANNOUNCEMENT_PREFIX = 0xad4c;  // first 2 bytes of (sha256 "Ownership Layer")
    const DEFAULT_FEE = 1000;
    
    action transfer(address newOwner, uint256 amount) {
        require(amount > DEFAULT_FEE, "Amount must cover fee");
        
        // Create announcement with prefix
        emit AnnouncementCreated(ANNOUNCEMENT_PREFIX);
        
        // Send coins minus fee
        send(newOwner, amount - DEFAULT_FEE);
    }
    
    event AnnouncementCreated(bytes32 prefix);
}
`;

console.log('=== Testing Constants as defconstant ===\n');

try {
    const result = compileCoinScript(coinScriptSource);
    
    console.log('Serialized output:');
    console.log(result.mainPuzzle.serialize({ indent: true }));
    
} catch (error) {
    console.error('Error:', error.message);
} 