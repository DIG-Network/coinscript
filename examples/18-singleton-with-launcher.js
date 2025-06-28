/**
 * Singleton with Launcher Example
 * Demonstrates how @singleton generates both main and launcher puzzles
 */

const { parseCoinScriptFile } = require('../dist');
const path = require('path');

console.log('=== Singleton NFT with Launcher ===\n');

// Parse the singleton NFT
const puzzlePath = path.join(__dirname, '18-singleton-with-launcher.coins');
const result = parseCoinScriptFile(puzzlePath);

console.log('Compilation Result:');
console.log('─'.repeat(50));
console.log('Main puzzle:', result.mainPuzzle ? '✓' : '✗');
console.log('Launcher puzzle:', result.launcherPuzzle ? '✓' : '✗');
console.log('Metadata:', JSON.stringify(result.metadata, null, 2));

// Show the main puzzle (singleton-wrapped NFT logic)
console.log('\nMain Puzzle (Singleton NFT):');
console.log('─'.repeat(50));
console.log(result.mainPuzzle.serialize({ indent: true }));

// Show the launcher puzzle
if (result.launcherPuzzle) {
    console.log('\nLauncher Puzzle:');
    console.log('─'.repeat(50));
    console.log(result.launcherPuzzle.serialize({ indent: false }));
    
    console.log('\nLauncher Usage:');
    console.log('─'.repeat(50));
    console.log('The launcher puzzle is used to create the singleton:');
    console.log('1. Calculate the main puzzle hash');
    console.log('2. Create a solution with (singleton_puzzle_hash amount)');
    console.log('3. Spend a genesis coin with the launcher puzzle');
    console.log('4. This creates the singleton with a unique ID');
}

console.log('\nDeployment Process:');
console.log('─'.repeat(50));
console.log('1. Deploy launcher to a temporary coin');
console.log('2. Calculate singleton puzzle hash from main puzzle');
console.log('3. Spend launcher with solution: (puzzle_hash 1)');
console.log('4. Singleton NFT is created with unique launcher ID');
console.log('5. All future spends use the main puzzle');

console.log('\nBenefits of Singleton Pattern:');
console.log('─'.repeat(50));
console.log('• Guaranteed uniqueness - only one instance can exist');
console.log('• Trackable lineage - can trace history through spends');
console.log('• Standard pattern - works with wallets and explorers');
console.log('• Used for NFTs, DIDs, and unique assets');

console.log('\n✅ Singleton with launcher generation complete!'); 