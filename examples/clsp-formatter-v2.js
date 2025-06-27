/**
 * CLSP Formatter V2 - Enhanced with line length and nesting rules
 * 
 * Rules:
 * 1. Simple expressions without nesting go on one line: (x y z)
 * 2. If line > 300 chars, format vertically
 * 3. Nested expressions format with inner expressions on separate lines
 * 4. Preserves comments and structure
 */

const fs = require('fs');
const path = require('path');

class CLSPFormatterV2 {
  constructor(options = {}) {
    this.maxLineLength = options.maxLineLength || 300;
    this.indentSize = options.indentSize || 2;
  }

  /**
   * Parse a CLSP expression into a tree structure
   */
  parseExpression(text, startPos = 0) {
    let pos = startPos;
    const skipWhitespace = () => {
      while (pos < text.length && /\s/.test(text[pos])) pos++;
    };

    skipWhitespace();
    
    if (pos >= text.length) return null;
    
    if (text[pos] === '(') {
      // Parse list
      pos++; // skip opening paren
      const elements = [];
      
      while (pos < text.length) {
        skipWhitespace();
        
        if (pos >= text.length) break;
        if (text[pos] === ')') {
          pos++; // skip closing paren
          break;
        }
        
        if (text[pos] === ';') {
          // Handle inline comments
          let commentEnd = text.indexOf('\n', pos);
          if (commentEnd === -1) commentEnd = text.length;
          elements.push({ type: 'comment', value: text.substring(pos, commentEnd) });
          pos = commentEnd;
        } else {
          const elem = this.parseExpression(text, pos);
          if (elem) {
            elements.push(elem);
            pos = elem.endPos;
          } else {
            pos++;
          }
        }
      }
      
      return {
        type: 'list',
        elements,
        startPos,
        endPos: pos
      };
    } else if (text[pos] === '"') {
      // Parse string
      let endQuote = pos + 1;
      while (endQuote < text.length) {
        if (text[endQuote] === '"' && text[endQuote - 1] !== '\\') {
          endQuote++;
          break;
        }
        endQuote++;
      }
      return {
        type: 'string',
        value: text.substring(pos, endQuote),
        startPos: pos,
        endPos: endQuote
      };
    } else {
      // Parse atom/symbol
      let end = pos;
      while (end < text.length && !/[\s();]/.test(text[end])) {
        end++;
      }
      return {
        type: 'atom',
        value: text.substring(pos, end),
        startPos: pos,
        endPos: end
      };
    }
  }

  /**
   * Check if an expression contains nested lists
   */
  hasNestedLists(expr) {
    if (expr.type !== 'list') return false;
    
    for (const elem of expr.elements) {
      if (elem.type === 'list') return true;
    }
    return false;
  }

  /**
   * Calculate the length of an expression if rendered on one line
   */
  calculateLineLength(expr) {
    if (expr.type === 'atom' || expr.type === 'string') {
      return expr.value.length;
    }
    
    if (expr.type === 'comment') {
      return expr.value.length;
    }
    
    if (expr.type === 'list') {
      let length = 2; // for parens
      for (let i = 0; i < expr.elements.length; i++) {
        if (i > 0) length++; // space between elements
        length += this.calculateLineLength(expr.elements[i]);
      }
      return length;
    }
    
    return 0;
  }

  /**
   * Format an expression according to the rules
   */
  formatExpression(expr, indent = 0) {
    const indentStr = ' '.repeat(indent);
    
    if (expr.type === 'atom' || expr.type === 'string') {
      return expr.value;
    }
    
    if (expr.type === 'comment') {
      return expr.value;
    }
    
    if (expr.type === 'list') {
      if (expr.elements.length === 0) {
        return '()';
      }
      
      const hasNested = this.hasNestedLists(expr);
      const lineLength = this.calculateLineLength(expr);
      
      // Determine formatting style
      if (!hasNested && lineLength <= this.maxLineLength) {
        // Simple expression without nesting that fits on one line
        const parts = expr.elements.map(e => this.formatExpression(e, 0));
        return '(' + parts.join(' ') + ')';
      } else if (!hasNested && lineLength > this.maxLineLength) {
        // Simple expression that's too long - format vertically
        let result = '(\n';
        for (const elem of expr.elements) {
          result += indentStr + '  ' + this.formatExpression(elem, indent + 2) + '\n';
        }
        result += indentStr + ')';
        return result;
      } else {
        // Has nested expressions - format with each on its own line
        let result = '(';
        
        // First element on same line if it's an atom
        if (expr.elements.length > 0 && expr.elements[0].type === 'atom') {
          result += expr.elements[0].value;
          
          // Rest of elements on new lines
          for (let i = 1; i < expr.elements.length; i++) {
            result += '\n' + indentStr + '  ' + this.formatExpression(expr.elements[i], indent + 2);
          }
        } else {
          // All elements on new lines
          for (const elem of expr.elements) {
            result += '\n' + indentStr + '  ' + this.formatExpression(elem, indent + 2);
          }
        }
        
        result += '\n' + indentStr + ')';
        return result;
      }
    }
    
    return '';
  }

  /**
   * Format CLSP code
   */
  format(content) {
    // Split into lines to handle top-level comments
    const lines = content.split('\n');
    const result = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();
      
      // Handle comments and empty lines
      if (!trimmed || trimmed.startsWith(';')) {
        result.push(line);
        i++;
        continue;
      }
      
      // Check if this starts an expression
      if (trimmed.startsWith('(')) {
        // Find the complete expression
        let exprText = '';
        let parenCount = 0;
        let inString = false;
        let j = i;
        
        while (j < lines.length) {
          const currentLine = lines[j];
          exprText += (j > i ? '\n' : '') + currentLine;
          
          // Count parentheses
          for (let k = 0; k < currentLine.length; k++) {
            const char = currentLine[k];
            if (char === '"' && (k === 0 || currentLine[k-1] !== '\\')) {
              inString = !inString;
            }
            if (!inString) {
              if (char === '(') parenCount++;
              else if (char === ')') parenCount--;
            }
          }
          
          if (parenCount === 0) {
            break;
          }
          j++;
        }
        
        // Parse and format the expression
        try {
          const expr = this.parseExpression(exprText.trim());
          if (expr) {
            const formatted = this.formatExpression(expr);
            result.push(...formatted.split('\n'));
          } else {
            result.push(line);
          }
        } catch (e) {
          // If parsing fails, keep original
          result.push(line);
        }
        
        i = j + 1;
      } else {
        result.push(line);
        i++;
      }
    }
    
    return result.join('\n');
  }

  /**
   * Format a file
   */
  formatFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    return this.format(content);
  }

  /**
   * Format and save a file
   */
  formatFileInPlace(filePath) {
    const formatted = this.formatFile(filePath);
    fs.writeFileSync(filePath, formatted);
  }
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node clsp-formatter-v2.js <file.clsp> [options]');
    console.log('Options:');
    console.log('  --max-length <n>   Maximum line length (default: 300)');
    console.log('  --indent <n>       Indent size (default: 2)');
    process.exit(1);
  }
  
  const filePath = args[0];
  const options = {};
  
  for (let i = 1; i < args.length; i += 2) {
    if (args[i] === '--max-length') {
      options.maxLineLength = parseInt(args[i + 1]);
    } else if (args[i] === '--indent') {
      options.indentSize = parseInt(args[i + 1]);
    }
  }
  
  const formatter = new CLSPFormatterV2(options);
  
  try {
    console.log(`Formatting ${filePath}...`);
    formatter.formatFileInPlace(filePath);
    console.log('Done!');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { CLSPFormatterV2 }; 