const { execSync } = require('child_process');
const path = require('path');

console.log('Building the project...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('Build successful!');
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}

// Simple test to verify build
console.log('Testing build...');
console.log('Current directory:', process.cwd());
console.log('Build complete!');

// Try to load the compiled module
try {
  const parser = require('./dist/coinscript/parser.js');
  console.log('Module loaded successfully');
  console.log('Available exports:', Object.keys(parser));
} catch (e) {
  console.error('Failed to load module:', e.message);
} 