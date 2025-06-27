/**
 * Utility functions for CoinScript examples
 * Provides consistent formatting and output helpers
 */

const fs = require('fs');
const path = require('path');

/**
 * Display example header
 */
function showHeader(exampleNumber, title, description) {
  console.log('═'.repeat(60));
  console.log(`Example ${exampleNumber}: ${title}`);
  console.log('─'.repeat(60));
  console.log(description);
  console.log('═'.repeat(60));
  console.log();
}

/**
 * Display CoinScript source
 */
function showCoinScriptSource(filename) {
  console.log('📄 CoinScript Source:');
  console.log('─'.repeat(40));
  const source = fs.readFileSync(filename, 'utf8');
  console.log(source);
  console.log('─'.repeat(40));
  console.log();
}

/**
 * Display generated ChiaLisp puzzle
 */
function showPuzzle(puzzle, options = {}) {
  console.log('🧩 Generated ChiaLisp Puzzle:');
  console.log('─'.repeat(40));
  console.log(puzzle.serialize({ indent: true }));
  console.log('─'.repeat(40));
  
  if (options.showHash !== false) {
    console.log(`📍 Puzzle Hash: ${puzzle.toModHash()}`);
    console.log();
  }
}

/**
 * Display solution
 */
function showSolution(solution, description) {
  console.log('💡 Solution:');
  if (description) {
    console.log(`   ${description}`);
  }
  console.log('─'.repeat(40));
  console.log(solution.serialize({ indent: true }));
  console.log('─'.repeat(40));
  console.log();
}

/**
 * Display execution explanation
 */
function showExecution(steps) {
  console.log('⚡ Execution Flow:');
  steps.forEach((step, index) => {
    console.log(`   ${index + 1}. ${step}`);
  });
  console.log();
}

/**
 * Display key concepts
 */
function showConcepts(concepts) {
  console.log('📚 Key Concepts:');
  concepts.forEach(concept => {
    console.log(`   • ${concept}`);
  });
  console.log();
}

/**
 * Display notes or warnings
 */
function showNote(note, type = 'info') {
  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    success: '✅',
    error: '❌'
  };
  console.log(`${icons[type] || 'ℹ️'} Note: ${note}`);
  console.log();
}

/**
 * Display separator
 */
function showSeparator() {
  console.log('\n' + '─'.repeat(60) + '\n');
}

/**
 * Display footer
 */
function showFooter() {
  console.log('\n' + '═'.repeat(60));
}

module.exports = {
  showHeader,
  showCoinScriptSource,
  showPuzzle,
  showSolution,
  showExecution,
  showConcepts,
  showNote,
  showSeparator,
  showFooter
}; 