const fs = require('fs');
const path = require('path');

// Function to copy directory recursively
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  
  if (isDirectory) {
    fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(function(childItemName) {
      copyRecursiveSync(path.join(src, childItemName),
                        path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Copy ChiaLisp directories
const sourceBase = path.join(__dirname, '..', 'src', 'chialisp');
const destBase = path.join(__dirname, '..', 'dist', 'chialisp');

// List of directories to copy
const directories = [
  'base',
  'cat',
  'did',
  'exchange',
  'nft',
  'notification',
  'offer',
  'plot_nft',
  'singleton',
  'standard'
];

console.log('Copying ChiaLisp files to dist...');

// Create the destination directory
fs.mkdirSync(destBase, { recursive: true });

// Copy each directory
directories.forEach(dir => {
  const srcPath = path.join(sourceBase, dir);
  const destPath = path.join(destBase, dir);
  
  if (fs.existsSync(srcPath)) {
    console.log(`  Copying ${dir}/...`);
    copyRecursiveSync(srcPath, destPath);
  }
});

console.log('ChiaLisp files copied successfully!'); 