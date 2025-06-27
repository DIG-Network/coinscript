/**
 * CLSP Formatter - Formats ChiaLisp code with intelligent line length and nesting rules
 */

export interface CLSPFormatterOptions {
  maxLineLength?: number;
  indentSize?: number;
}

interface ParsedExpression {
  type: 'list' | 'atom' | 'string' | 'comment';
  elements?: ParsedExpression[];
  value?: string;
  startPos: number;
  endPos: number;
}

export class CLSPFormatter {
  private maxLineLength: number;
  private indentSize: number;

  constructor(options: CLSPFormatterOptions = {}) {
    this.maxLineLength = options.maxLineLength || 120;
    this.indentSize = options.indentSize || 2;
  }

  /**
   * Format CLSP code
   */
  format(content: string): string {
    // First normalize whitespace
    const normalized = this.normalizeWhitespace(content);
    
    // Split into lines to handle top-level comments
    const lines = normalized.split('\n');
    const result: string[] = [];
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
   * Normalize whitespace - removes extra spaces and newlines
   */
  private normalizeWhitespace(text: string): string {
    // Preserve strings
    const strings: string[] = [];
    let normalized = text.replace(/"([^"\\]|\\.)*"/g, (match) => {
      strings.push(match);
      return `__STRING_${strings.length - 1}__`;
    });

    // Preserve comments
    const comments: string[] = [];
    normalized = normalized.replace(/;[^\n]*/g, (match) => {
      comments.push(match);
      return `__COMMENT_${comments.length - 1}__`;
    });

    // Normalize whitespace - replace multiple spaces/newlines with single space
    normalized = normalized.replace(/\s+/g, ' ').trim();

    // Restore strings and comments
    strings.forEach((str, i) => {
      normalized = normalized.replace(`__STRING_${i}__`, str);
    });
    comments.forEach((comment, i) => {
      normalized = normalized.replace(`__COMMENT_${i}__`, comment);
    });

    return normalized;
  }

  /**
   * Parse a CLSP expression into a tree structure
   */
  private parseExpression(text: string, startPos = 0): ParsedExpression | null {
    let pos = startPos;
    const skipWhitespace = () => {
      while (pos < text.length && /\s/.test(text[pos])) pos++;
    };

    skipWhitespace();
    
    if (pos >= text.length) return null;
    
    if (text[pos] === '(') {
      // Parse list
      pos++; // skip opening paren
      const elements: ParsedExpression[] = [];
      
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
          elements.push({ type: 'comment', value: text.substring(pos, commentEnd), startPos: pos, endPos: commentEnd });
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
  private hasNestedLists(expr: ParsedExpression): boolean {
    if (expr.type !== 'list' || !expr.elements) return false;
    
    for (const elem of expr.elements) {
      if (elem.type === 'list') return true;
    }
    return false;
  }

  /**
   * Calculate the length of an expression if rendered on one line
   */
  private calculateLineLength(expr: ParsedExpression): number {
    if ((expr.type === 'atom' || expr.type === 'string' || expr.type === 'comment') && expr.value) {
      return expr.value.length;
    }
    
    if (expr.type === 'list' && expr.elements) {
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
  private formatExpression(expr: ParsedExpression, indent = 0): string {
    const indentStr = ' '.repeat(indent);
    
    if ((expr.type === 'atom' || expr.type === 'string' || expr.type === 'comment') && expr.value) {
      return expr.value;
    }
    
    if (expr.type === 'list' && expr.elements) {
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
          result += indentStr + ' '.repeat(this.indentSize) + this.formatExpression(elem, indent + this.indentSize) + '\n';
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
}

/**
 * Format CLSP code with default options
 */
export function formatCLSP(content: string, options?: CLSPFormatterOptions): string {
  const formatter = new CLSPFormatter(options);
  return formatter.format(content);
} 