/**
 * ChiaLisp/CLSP Formatter
 * Formats .clsp files to follow the standard indentation style where
 * opening parentheses and their first element stay on the same line
 */

const fs = require('fs');
const path = require('path');

class CLSPFormatter {
  constructor() {
    this.indentSize = 4;
  }

  /**
   * Format a CLSP file content
   */
  format(content) {
    // Preserve original line endings
    const lineEnding = content.includes('\r\n') ? '\r\n' : '\n';
    
    // Split into lines for processing
    let lines = content.split(/\r?\n/);
    
    // Process the content
    lines = this.processLines(lines);
    
    // Join back with original line endings
    return lines.join(lineEnding);
  }

  /**
   * Process lines to fix formatting
   */
  processLines(lines) {
    const result = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith(';')) {
        result.push(line);
        i++;
        continue;
      }
      
      // Check if this line is just an opening paren
      if (trimmed === '(' && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        const nextTrimmed = nextLine.trim();
        
        // If next line contains the first element, merge them
        if (nextTrimmed && !nextTrimmed.startsWith(';') && !nextTrimmed.startsWith('(')) {
          const indent = this.getIndent(line);
          result.push(indent + '(' + nextTrimmed);
          i += 2;
          continue;
        }
      }
      
      // Check for patterns like "(mod (" on separate lines
      if (trimmed.endsWith('(') && !trimmed.startsWith(';')) {
        // This line ends with opening paren
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1];
          const nextTrimmed = nextLine.trim();
          
          // If next line is just parameters or expressions, keep as is
          if (nextTrimmed && !nextTrimmed.startsWith('(')) {
            result.push(line);
            i++;
            continue;
          }
        }
      }
      
      result.push(line);
      i++;
    }
    
    return result;
  }

  /**
   * Get the indentation of a line
   */
  getIndent(line) {
    const match = line.match(/^(\s*)/);
    return match ? match[1] : '';
  }

  /**
   * Format a file
   */
  formatFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const formatted = this.format(content);
    return formatted;
  }

  /**
   * Format a file and save it
   */
  formatFileInPlace(filePath) {
    const formatted = this.formatFile(filePath);
    fs.writeFileSync(filePath, formatted);
  }

  /**
   * Format all .clsp files in a directory
   */
  formatDirectory(dirPath, recursive = true) {
    const files = fs.readdirSync(dirPath);
    
    files.forEach(file => {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && recursive) {
        this.formatDirectory(fullPath, recursive);
      } else if (file.endsWith('.clsp')) {
        console.log(`Formatting ${fullPath}...`);
        this.formatFileInPlace(fullPath);
      }
    });
  }
}

// Advanced formatter with better pattern detection
class AdvancedCLSPFormatter extends CLSPFormatter {
  format(content) {
    // First pass: fix specific patterns
    let formatted = content;
    
    // Fix pattern: "(\n    element" -> "(element"
    formatted = formatted.replace(/\(\s*\n\s+([a-zA-Z_][a-zA-Z0-9_\-]*)/g, '($1');
    
    // Fix pattern: "(\n    (" but preserve proper formatting for nested structures
    formatted = this.fixNestedParens(formatted);
    
    // Fix specific cases like (mod ( -> (mod (
    formatted = formatted.replace(/\(mod\s+\(\s*\n/g, '(mod (');
    formatted = formatted.replace(/\(defun\s+(\w+)\s+\(\s*\n/g, '(defun $1 (');
    formatted = formatted.replace(/\(defun-inline\s+(\w+)\s+\(\s*\n/g, '(defun-inline $1 (');
    
    return formatted;
  }

  fixNestedParens(content) {
    const lines = content.split(/\r?\n/);
    const result = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Look for lines that are just "("
      if (trimmed === '(') {
        if (i > 0 && i + 1 < lines.length) {
          const prevLine = lines[i - 1];
          const nextLine = lines[i + 1];
          const nextTrimmed = nextLine.trim();
          
          // Check if previous line could accept this paren
          if (prevLine.trim() && !prevLine.trim().endsWith(')')) {
            // Check if next line starts with a symbol (not another paren)
            if (nextTrimmed && /^[a-zA-Z_]/.test(nextTrimmed)) {
              // Merge with previous line
              result[result.length - 1] += ' (' + nextTrimmed;
              i++; // Skip next line
              continue;
            }
          }
        }
      }
      
      result.push(line);
    }
    
    return result.join('\n');
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node clsp-formatter.js <file.clsp or directory>');
    console.log('Options:');
    console.log('  --advanced    Use advanced formatting rules');
    process.exit(1);
  }
  
  const useAdvanced = args.includes('--advanced');
  const targetPath = args.find(arg => !arg.startsWith('--'));
  
  if (!targetPath) {
    console.error('Error: No file or directory specified');
    process.exit(1);
  }
  
  const formatter = useAdvanced ? new AdvancedCLSPFormatter() : new CLSPFormatter();
  
  try {
    const stat = fs.statSync(targetPath);
    
    if (stat.isDirectory()) {
      console.log(`Formatting all .clsp files in ${targetPath}...`);
      formatter.formatDirectory(targetPath);
      console.log('Done!');
    } else if (targetPath.endsWith('.clsp')) {
      console.log(`Formatting ${targetPath}...`);
      formatter.formatFileInPlace(targetPath);
      console.log('Done!');
    } else {
      console.error('Error: File must have .clsp extension');
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { CLSPFormatter, AdvancedCLSPFormatter }; 