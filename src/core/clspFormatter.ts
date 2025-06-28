/**
 * CLSP Formatter V4 - Professional ChiaLisp formatter matching src/chialisp patterns
 * 
 * Features:
 * 1. Follows exact indentation patterns from official ChiaLisp code
 * 2. Special handling for mod, include, defconstant, defun, if, etc.
 * 3. Preserves and properly formats comments
 * 4. Smart line breaking and alignment
 * 5. Handles special forms and macros
 * 6. Automatic blank lines between sections
 */

export interface CLSPFormatterOptions {
  indentSize?: number;
  maxLineLength?: number;
}

// Token types
enum TokenType {
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  ATOM = 'ATOM',
  STRING = 'STRING',
  COMMENT = 'COMMENT',
  WHITESPACE = 'WHITESPACE',
  NEWLINE = 'NEWLINE'
}

interface Token {
  type: TokenType;
  value: string;
  start: number;
  end: number;
}

interface ParsedExpression {
  type: 'list' | 'atom' | 'string' | 'comment' | 'newline';
  elements?: ParsedExpression[];
  value?: string;
  specialForm?: string;
  hasNewlineAfterOpen?: boolean;
  trailingComment?: ParsedExpression;
  inline?: boolean;
  startIdx?: number;
  endIdx?: number;
}

interface SpecialIndent {
  firstLine?: number;
  subsequent?: number;
  bodyIndent?: number;
  inline?: boolean;
  align?: boolean;
  thenIndent?: number;
  elseIndent?: number;
}

export class CLSPFormatter {
  private indentSize: number;
  private maxLineLength: number;

  constructor(options: CLSPFormatterOptions = {}) {
    this.indentSize = options.indentSize || 2;
    this.maxLineLength = options.maxLineLength || 120;
  }

  tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    let pos = 0;

    while (pos < text.length) {
      // Skip whitespace but track newlines
      if (/\s/.test(text[pos])) {
        const start = pos;
        let hasNewline = false;
        while (pos < text.length && /\s/.test(text[pos])) {
          if (text[pos] === '\n') hasNewline = true;
          pos++;
        }
        if (hasNewline) {
          tokens.push({ type: TokenType.NEWLINE, value: '\n', start, end: pos });
        } else {
          tokens.push({ type: TokenType.WHITESPACE, value: text.substring(start, pos), start, end: pos });
        }
        continue;
      }
      
      // Comments
      if (text[pos] === ';') {
        const start = pos;
        while (pos < text.length && text[pos] !== '\n') pos++;
        tokens.push({ type: TokenType.COMMENT, value: text.substring(start, pos), start, end: pos });
        continue;
      }

      // Strings
      if (text[pos] === '"') {
        const start = pos;
        pos++;
        while (pos < text.length) {
          if (text[pos] === '"' && text[pos-1] !== '\\') {
            pos++;
            break;
          }
          if (text[pos] === '\\' && pos + 1 < text.length) pos++;
          pos++;
        }
        tokens.push({ type: TokenType.STRING, value: text.substring(start, pos), start, end: pos });
        continue;
      }

      // Parentheses
      if (text[pos] === '(') {
        tokens.push({ type: TokenType.LPAREN, value: '(', start: pos, end: pos + 1 });
        pos++;
        continue;
      }
      if (text[pos] === ')') {
        tokens.push({ type: TokenType.RPAREN, value: ')', start: pos, end: pos + 1 });
        pos++;
        continue;
      }

      // Atoms
      const start = pos;
      while (pos < text.length && !/[\s();]/.test(text[pos])) pos++;
      tokens.push({ type: TokenType.ATOM, value: text.substring(start, pos), start, end: pos });
    }

    return tokens;
  }

  parseExpression(tokens: Token[], startIdx = 0): ParsedExpression | null {
    let idx = startIdx;
    
    // Skip whitespace and newlines
    while (idx < tokens.length && 
           (tokens[idx].type === TokenType.WHITESPACE || 
            tokens[idx].type === TokenType.NEWLINE)) {
      idx++;
    }

    if (idx >= tokens.length) return null;

    const token = tokens[idx];

    if (token.type === TokenType.COMMENT) {
      return {
        type: 'comment',
        value: token.value,
        startIdx: idx,
        endIdx: idx + 1
      };
    }

    if (token.type === TokenType.LPAREN) {
      idx++; // Skip opening paren
      const elements: ParsedExpression[] = [];
      let specialForm: string | undefined;
      let hasNewlineAfterOpen = false;

      // Check for newline after opening paren
      if (idx < tokens.length && tokens[idx].type === TokenType.NEWLINE) {
        hasNewlineAfterOpen = true;
      }

      while (idx < tokens.length) {
        // Skip only whitespace, not newlines
        while (idx < tokens.length && tokens[idx].type === TokenType.WHITESPACE) {
          idx++;
        }

        if (idx >= tokens.length) break;
        
        if (tokens[idx].type === TokenType.RPAREN) {
          idx++; // Skip closing paren
          break;
        }
        
        if (tokens[idx].type === TokenType.NEWLINE) {
          elements.push({ type: 'newline' });
          idx++;
          continue;
        }

        // Check for inline comment
        if (tokens[idx].type === TokenType.COMMENT) {
          // For inline comments, check if there was whitespace before
          const hasSpace = idx > 0 && tokens[idx-1].type === TokenType.WHITESPACE;
          elements.push({ 
            type: 'comment', 
            value: tokens[idx].value,
            inline: hasSpace 
          });
          idx++;
          continue;
        }

        const elem = this.parseExpression(tokens, idx);
          if (elem) {
          if (elements.filter(e => e.type !== 'newline' && e.type !== 'comment').length === 0 && elem.type === 'atom') {
            specialForm = elem.value;
          }
          elements.push(elem);
          idx = elem.endIdx || idx + 1;
        } else {
          idx++;
        }
      }

      // Check for trailing comment after closing paren
      let trailingComment: ParsedExpression | undefined;
      let checkIdx = idx;
      while (checkIdx < tokens.length && tokens[checkIdx].type === TokenType.WHITESPACE) {
        checkIdx++;
      }
      if (checkIdx < tokens.length && tokens[checkIdx].type === TokenType.COMMENT) {
        trailingComment = {
          type: 'comment',
          value: tokens[checkIdx].value,
          inline: true
        };
        idx = checkIdx + 1;
      }
      
      return {
        type: 'list',
        elements,
        specialForm,
        hasNewlineAfterOpen,
        trailingComment,
        startIdx,
        endIdx: idx
      };
    }

    if (token.type === TokenType.STRING) {
      return {
        type: 'string',
        value: token.value,
        startIdx: idx,
        endIdx: idx + 1
      };
    }

    if (token.type === TokenType.ATOM) {
      return {
        type: 'atom',
        value: token.value,
        startIdx: idx,
        endIdx: idx + 1
      };
    }

    return null;
  }

  private getSpecialIndent(specialForm?: string): SpecialIndent | undefined {
    // Special indentation rules based on form
    const specialIndents: Record<string, SpecialIndent> = {
      'mod': { firstLine: 4, subsequent: 2, bodyIndent: 3 },
      'defun': { firstLine: 0, subsequent: 2, bodyIndent: 2 },
      'defun-inline': { firstLine: 0, subsequent: 2, bodyIndent: 2 },
      'defmacro': { firstLine: 0, subsequent: 2, bodyIndent: 2 },
      'defconstant': { inline: true },
      'include': { inline: true },
      'if': { firstLine: 0, subsequent: 4, thenIndent: 4, elseIndent: 4 },
      'let': { firstLine: 0, subsequent: 2, bodyIndent: 2 },
      'list': { align: true },
      'c': { align: true },
      'lambda': { firstLine: 0, subsequent: 2, bodyIndent: 2 },
      'qq': { firstLine: 0, subsequent: 2 },
      'assert': { firstLine: 0, subsequent: 2 }
    };

    return specialForm ? specialIndents[specialForm] : undefined;
  }

  private formatExpression(expr: ParsedExpression, indent = 0): string {
    if (!expr) return '';

    if (expr.type === 'comment') {
      // Preserve comment formatting
      return expr.value || '';
    }

    if (expr.type === 'newline') {
      return '\n';
    }

    if (expr.type === 'atom' || expr.type === 'string') {
      return expr.value || '';
    }

    if (expr.type === 'list') {
      const specialIndent = this.getSpecialIndent(expr.specialForm);
      
      // Handle empty lists
      if (!expr.elements || expr.elements.length === 0) {
        return '()';
      }

      // Filter out newline elements for counting
      const nonNewlineElements = expr.elements.filter(e => e.type !== 'newline');

      // Special handling for mod
      if (expr.specialForm === 'mod') {
        return this.formatMod(expr, indent);
      }

      // Special handling for defun/defun-inline
      if (expr.specialForm === 'defun' || expr.specialForm === 'defun-inline') {
        return this.formatDefun(expr, indent);
      }

      // Special handling for if
      if (expr.specialForm === 'if') {
        return this.formatIf(expr, indent);
      }

      // Special handling for defconstant with inline comments
      if (expr.specialForm === 'defconstant') {
        return this.formatDefconstant(expr, indent);
      }

      // Special handling for single-line forms
      if (specialIndent?.inline) {
        const parts = ['('];
        nonNewlineElements.forEach((elem, idx) => {
          if (idx > 0) parts.push(' ');
          parts.push(this.formatExpression(elem, 0));
        });
        parts.push(')');
        return parts.join('');
      }

      // Check if this should be formatted on one line
      const oneLine = this.tryFormatOneLine(expr, indent);
      if (oneLine && oneLine.length <= this.maxLineLength - indent) {
        return oneLine;
      }

      // Multi-line formatting
      return this.formatMultiLine(expr, indent, specialIndent);
    }

    return '';
  }

  private formatMod(expr: ParsedExpression, indent: number): string {
    const result = ['(mod'];
    const elements = expr.elements?.filter(e => e.type !== 'newline') || [];
    
    // Check if params are on same line or next line
    if (elements.length > 1 && elements[1].type === 'list') {
      // Parameters list
      const params = elements[1];
      if (!params.elements || params.elements.length === 0) {
        result.push(' ()');
      } else {
        result.push(' (');
        const paramElements = params.elements.filter(e => e.type !== 'newline');
        if (paramElements.length === 1) {
          result.push(this.formatExpression(paramElements[0], 0));
          result.push(')');
        } else {
          // Multi-line parameters
          result.push('\n');
          paramElements.forEach((param, idx) => {
            result.push(' '.repeat(indent + 4));
            result.push(this.formatExpression(param, indent + 4));
            if (idx < paramElements.length - 1) {
              result.push('\n');
            }
          });
          result.push('\n');
          result.push(' '.repeat(indent + 3));
          result.push(')');
        }
      }
      
      // Body elements - add blank line after params if multi-line
      if (elements.length > 2) {
        result.push('\n');
        
        // Track types for spacing
        let lastType: string | null = null;
        
        for (let i = 2; i < elements.length; i++) {
          const elem = elements[i];
          const currentType = this.getExpressionType(elem);
          
          // Check if we need a blank line before this element
          if (lastType && this.needsBlankLineBefore(lastType, currentType)) {
            result.push('\n'); // Extra newline for blank line
          }
          
          result.push('\n');
          result.push(' '.repeat(indent + 3));
          result.push(this.formatExpression(elem, indent + 3));
          
          lastType = currentType;
        }
      }
    } else {
      // No parameters list, just body elements
      let lastType: string | null = null;
      
      for (let i = 1; i < elements.length; i++) {
        const elem = elements[i];
        const currentType = this.getExpressionType(elem);
        
        // Check if we need a blank line before this element
        if (lastType && this.needsBlankLineBefore(lastType, currentType)) {
          result.push('\n'); // Extra newline for blank line
        }
        
        result.push('\n');
        result.push(' '.repeat(indent + 3));
        result.push(this.formatExpression(elem, indent + 3));
        
        lastType = currentType;
      }
    }
    
    result.push('\n');
    result.push(' '.repeat(indent));
    result.push(')');
    
    return result.join('');
  }

  private formatDefun(expr: ParsedExpression, indent: number): string {
    const result = ['('];
    const elements = expr.elements?.filter(e => e.type !== 'newline') || [];
    
    // Function name and parameters on first line
    result.push(this.formatExpression(elements[0], 0)); // defun or defun-inline
    
    if (elements.length > 1) {
      result.push(' ');
      result.push(this.formatExpression(elements[1], 0)); // function name
      
      if (elements.length > 2) {
        result.push(' ');
        result.push(this.formatExpression(elements[2], 0)); // parameters
      }
    }
    
    // Body on new lines - properly indented
    if (elements.length > 3) {
      for (let i = 3; i < elements.length; i++) {
        result.push('\n');
        result.push(' '.repeat(indent + 2)); // Changed from 5 to 2 for proper alignment
        result.push(this.formatExpression(elements[i], indent + 2));
      }
    }
    
    result.push('\n');
    result.push(' '.repeat(indent)); // Changed from indent + 3
    result.push(')');
    
    return result.join('');
  }

  private formatIf(expr: ParsedExpression, indent: number): string {
    const result = ['(if'];
    const elements = expr.elements?.filter(e => e.type !== 'newline') || [];
    
    if (elements.length > 1) {
      // Condition
      result.push(' ');
      result.push(this.formatExpression(elements[1], 0));
      
      // Then branch
      if (elements.length > 2) {
        result.push('\n');
        
        // Check for comment before then branch
        let thenIdx = 2;
        if (elements[2].type === 'comment' && elements[2].value?.includes('then')) {
          result.push(' '.repeat(indent + 2));
          result.push(elements[2].value);
          result.push('\n');
          thenIdx = 3;
        }
        
        if (elements[thenIdx]) {
          result.push(' '.repeat(indent + 2));
          result.push(this.formatExpression(elements[thenIdx], indent + 2));
        }
        
        // Else branch
        const elseIdx = thenIdx + 1;
        if (elements[elseIdx]) {
          result.push('\n');
          result.push(' '.repeat(indent + 2));
          result.push(this.formatExpression(elements[elseIdx], indent + 2));
        }
      }
    }
    
    result.push('\n');
    result.push(' '.repeat(indent));
    result.push(')');
    
    return result.join('');
  }

  private formatDefconstant(expr: ParsedExpression, _indent: number): string {
    const result = ['(defconstant'];
    const elements = expr.elements?.filter(e => e.type !== 'newline') || [];
    
    // Add atoms
    for (let i = 1; i < elements.length; i++) {
      if (elements[i].type !== 'comment') {
        result.push(' ');
        result.push(this.formatExpression(elements[i], 0));
      }
    }
    
    result.push(')');
    
    // Add trailing comment if present
    if (expr.trailingComment) {
      result.push('  '); // Two spaces before comment
      result.push(expr.trailingComment.value || '');
    }
    
    return result.join('');
  }

  private tryFormatOneLine(expr: ParsedExpression, _indent: number): string | null {
    const elements = expr.elements?.filter(e => e.type !== 'newline' && e.type !== 'comment') || [];
    
    // Don't format certain forms on one line
    const multiLineForms = ['mod', 'defun', 'defun-inline', 'defmacro', 'if', 'let', 'lambda'];
    if (expr.specialForm && multiLineForms.includes(expr.specialForm)) {
      return null;
    }
    
    // Try to format on one line
    const parts = ['('];
    elements.forEach((elem, idx) => {
      if (idx > 0) parts.push(' ');
      parts.push(this.formatExpression(elem, 0));
    });
    parts.push(')');
    
    const result = parts.join('');
    
    // Check if any element is a multi-line list
    const hasMultiLine = elements.some(elem => 
      elem.type === 'list' && this.tryFormatOneLine(elem, 0) === null
    );
    
    if (hasMultiLine) return null;
    
        return result;
  }

  private formatMultiLine(expr: ParsedExpression, indent: number, specialIndent?: SpecialIndent): string {
    const result = ['('];
    const elements = expr.elements?.filter(e => e.type !== 'newline') || [];
    
    elements.forEach((elem, idx) => {
      if (idx === 0) {
        // First element (function/macro name)
        result.push(this.formatExpression(elem, 0));
      } else {
        result.push('\n');
        const elemIndent = specialIndent?.align ? indent + result[0].length : indent + this.indentSize;
        result.push(' '.repeat(elemIndent));
        result.push(this.formatExpression(elem, elemIndent));
      }
    });
    
    result.push(')');
    return result.join('');
  }

  format(content: string): string {
    // Tokenize
    const tokens = this.tokenize(content);
    
    // Parse - special handling for mod
    let idx = 0;
    
    // Skip leading whitespace
    while (idx < tokens.length && tokens[idx].type === TokenType.WHITESPACE) {
      idx++;
    }
    
    // Check if the first expression is a mod
    if (idx < tokens.length) {
      const firstExpr = this.parseExpression(tokens, idx);
      if (firstExpr && firstExpr.type === 'list' && firstExpr.specialForm === 'mod') {
        // This is a mod, format it as a single unit
        return this.formatExpression(firstExpr, 0) + '\n';
      }
    }
    
    // Otherwise, parse all expressions normally
    const expressions: ParsedExpression[] = [];
    idx = 0;
    
    while (idx < tokens.length) {
      // Skip leading whitespace
      while (idx < tokens.length && tokens[idx].type === TokenType.WHITESPACE) {
        idx++;
      }
      
      if (idx >= tokens.length) break;
      
      // Preserve leading comments and newlines
      if (tokens[idx].type === TokenType.COMMENT) {
        expressions.push({
          type: 'comment',
          value: tokens[idx].value
        });
        idx++;
        continue;
      }
      
      if (tokens[idx].type === TokenType.NEWLINE) {
        idx++;
        continue;
      }
      
      const expr = this.parseExpression(tokens, idx);
      if (expr) {
        expressions.push(expr);
        idx = expr.endIdx || idx + 1;
      } else {
        idx++;
      }
    }
    
    // Format expressions with proper spacing
    const formatted: string[] = [];
    let lastType: string | null = null;
    let lastWasComment = false;
    
    expressions.forEach((expr, idx) => {
      const currentType = this.getExpressionType(expr);
      const isComment = expr.type === 'comment';
      
      // Determine if we need blank lines
      if (idx > 0 && !isComment && !lastWasComment) {
        const needsBlankLine = this.needsBlankLineBefore(lastType, currentType);
        if (needsBlankLine) {
          // Add two newlines to create a blank line
          formatted.push('\n\n');
        } else if (lastType !== null) {
          formatted.push('\n');
        }
      } else if (idx > 0 && !isComment) {
        formatted.push('\n');
      }
      
      formatted.push(this.formatExpression(expr, 0));
      
      lastType = currentType;
      lastWasComment = isComment;
    });
    
    return formatted.join('') + '\n';
  }
  
  private getExpressionType(expr: ParsedExpression): string {
    if (expr.type === 'comment') return 'comment';
    if (expr.type === 'list' && expr.specialForm) {
      if (expr.specialForm === 'include') return 'include';
      if (expr.specialForm === 'defconstant') return 'defconstant';
      if (expr.specialForm === 'defun' || expr.specialForm === 'defun-inline') return 'defun';
      if (expr.specialForm === 'defmacro') return 'defmacro';
      if (expr.specialForm === 'mod') return 'mod';
    }
    return 'other';
  }
  
  private needsBlankLineBefore(lastType: string | null, currentType: string): boolean {
    // Always add blank line before defun/defmacro
    if (currentType === 'defun' || currentType === 'defmacro') return true;
    
    // Add blank line when transitioning between different groups
    if (lastType === 'include' && currentType !== 'include') return true;
    if (lastType === 'defconstant' && currentType !== 'defconstant') return true;
    
    // Add blank line after defun/defmacro
    if ((lastType === 'defun' || lastType === 'defmacro') && currentType !== 'comment') return true;
    
    return false;
  }
}

/**
 * Format CLSP code with default options
 */
export function formatCLSP(content: string, options?: CLSPFormatterOptions): string {
  const formatter = new CLSPFormatter(options);
  return formatter.format(content);
} 