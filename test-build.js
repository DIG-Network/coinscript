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