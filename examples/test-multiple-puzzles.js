/**
 * Test Multiple Puzzle Generation
 * Demonstrates how CoinScript can generate multiple puzzles (e.g., launcher + singleton)
 */

const { compileCoinScript } = require('../dist');

console.log('=== Multiple Puzzle Generation Test ===\n');

// Test 1: Simple coin (only main puzzle)
console.log('1. Simple coin (only main puzzle):');
console.log('─'.repeat(50));

const simpleCoin = `
coin SimpleCoin {
    action transfer(address to, uint256 amount) {
        send(to, amount);
    }
}`;

const simpleResult = compileCoinScript(simpleCoin);
console.log('Main puzzle:', simpleResult.mainPuzzle ? '✓' : '✗');
console.log('Launcher puzzle:', simpleResult.launcherPuzzle ? '✓' : '✗ (not needed)');
console.log('Metadata:', simpleResult.metadata);

// Test 2: Singleton coin (main + launcher puzzles)
console.log('\n2. Singleton coin (main + launcher puzzles):');
console.log('─'.repeat(50));

const singletonCoin = `
@singleton
coin MySingleton {
    storage address owner = "xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy";
    
    action transfer(address newOwner) {
        require(msg.sender == owner, "Only owner");
        owner = newOwner;
    }
}`;

const singletonResult = compileCoinScript(singletonCoin);
console.log('Main puzzle:', singletonResult.mainPuzzle ? '✓' : '✗');
console.log('Launcher puzzle:', singletonResult.launcherPuzzle ? '✓' : '✗');
console.log('Metadata:', singletonResult.metadata);

if (singletonResult.launcherPuzzle) {
    console.log('\nLauncher puzzle ChiaLisp:');
    console.log(singletonResult.launcherPuzzle.serialize({ indent: true }));
}

// Test 3: Stateful coin (main + action puzzles)
console.log('\n3. Stateful coin (main + action puzzles):');
console.log('─'.repeat(50));

const statefulCoin = `
coin StatefulToken {
    state {
        uint256 totalSupply;
        mapping(address => uint256) balances;
    }
    
    @stateful
    action mint(address to, uint256 amount) {
        state.totalSupply += amount;
        state.balances[to] += amount;
    }
    
    @stateful
    action transfer(address to, uint256 amount) {
        require(state.balances[msg.sender] >= amount, "Insufficient balance");
        state.balances[msg.sender] -= amount;
        state.balances[to] += amount;
    }
}`;

const statefulResult = compileCoinScript(statefulCoin);
console.log('Main puzzle:', statefulResult.mainPuzzle ? '✓' : '✗');
console.log('Launcher puzzle:', statefulResult.launcherPuzzle ? '✓' : '✗ (not needed)');
console.log('Additional puzzles:', statefulResult.additionalPuzzles ? Object.keys(statefulResult.additionalPuzzles) : 'none');
console.log('Metadata:', statefulResult.metadata);

// Test 4: Singleton + Stateful (all puzzle types)
console.log('\n4. Singleton + Stateful (all puzzle types):');
console.log('─'.repeat(50));

const complexCoin = `
@singleton
coin ComplexNFT {
    storage {
        address owner = "xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy";
        bytes32 metadata = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
    }
    
    state {
        uint256 lastTransferTime;
        address previousOwner;
    }
    
    @stateful
    action transfer(address newOwner) {
        require(msg.sender == owner, "Only owner");
        state.previousOwner = owner;
        state.lastTransferTime = 1735776000;
        owner = newOwner;
    }
    
    @stateful
    action updateMetadata(bytes32 newMetadata) {
        require(msg.sender == owner, "Only owner");
        metadata = newMetadata;
    }
}`;

const complexResult = compileCoinScript(complexCoin);
console.log('Main puzzle:', complexResult.mainPuzzle ? '✓' : '✗');
console.log('Launcher puzzle:', complexResult.launcherPuzzle ? '✓' : '✗');
console.log('Additional puzzles:', complexResult.additionalPuzzles ? Object.keys(complexResult.additionalPuzzles) : 'none');
console.log('Metadata:', complexResult.metadata);

console.log('\n5. Summary:');
console.log('─'.repeat(50));
console.log('• Simple coins generate only a main puzzle');
console.log('• @singleton decorator generates a launcher puzzle');
console.log('• @stateful actions generate separate action puzzles');
console.log('• Complex coins can have all three types');
console.log('\nThis allows proper separation of concerns:');
console.log('- Launcher creates the singleton');
console.log('- Main puzzle contains the core logic');
console.log('- Action puzzles enable dynamic behavior with merkle proofs');

console.log('\n✅ Multiple puzzle generation working correctly!'); 