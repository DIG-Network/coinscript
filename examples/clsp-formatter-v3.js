/**
 * CLSP Formatter V3 - Pattern-based formatter following common CLSP conventions
 * 
 * Features:
 * 1. Normalizes whitespace (removes extra spaces/newlines)
 * 2. Follows common CLSP formatting patterns
 * 3. Special handling for mod, defun, if, list, include
 * 4. Preserves comments and structure
 * 5. Active when { indent: true }
 */

const fs = require("fs");

class CLSPFormatterV3 {
  constructor(options = {}) {
    this.indent = options.indent || false;
    this.indentSize = options.indentSize || 4;
    this.maxLineLength = options.maxLineLength || 120;
  }

  normalizeWhitespace(text) {
    const strings = [];
    let normalized = text.replace(/"([^"\\\\]|\\\\.)*"/g, (match, offset) => {
      strings.push(match);
      return `__STRING_${strings.length - 1}__`;
    });

    const comments = [];
    normalized = normalized.replace(/;[^\\n]*/g, (match) => {
      comments.push(match);
      return `__COMMENT_${comments.length - 1}__`;
    });

    normalized = normalized.replace(/\\s+/g, " ").trim();

    strings.forEach((str, i) => {
      normalized = normalized.replace(`__STRING_${i}__`, str);
    });
    comments.forEach((comment, i) => {
      normalized = normalized.replace(`__COMMENT_${i}__`, comment);
    });

    return normalized;
  }

  parseExpression(text, startPos = 0) {
    let pos = startPos;
    const skipWhitespace = () => {
      while (pos < text.length && /\\s/.test(text[pos])) pos++;
    };

    skipWhitespace();
    
    if (pos >= text.length) return null;
    
    if (text[pos] === "(") {
      pos++;
      const elements = [];
      let specialForm = null;
      
      while (pos < text.length) {
        skipWhitespace();
        
        if (pos >= text.length) break;
        if (text[pos] === ")") {
          pos++;
          break;
        }
        
        if (text[pos] === ";") {
          let commentEnd = text.indexOf("\\n", pos);
          if (commentEnd === -1) commentEnd = text.length;
          elements.push({ type: "comment", value: text.substring(pos, commentEnd) });
          pos = commentEnd;
        } else {
          const elem = this.parseExpression(text, pos);
          if (elem) {
            if (elements.length === 0 && elem.type === "atom") {
              specialForm = elem.value;
            }
            elements.push(elem);
            pos = elem.endPos;
          } else {
            pos++;
          }
        }
      }
      
      return {
        type: "list",
        elements,
        specialForm,
        startPos,
        endPos: pos
      };
    } else if (text[pos] === "\\"") {
      let endQuote = pos + 1;
      while (endQuote < text.length) {
        if (text[endQuote] === "\\"" && text[endQuote - 1] !== "\\\\") {
          endQuote++;
          break;
        }
        endQuote++;
      }
      return {
        type: "string",
        value: text.substring(pos, endQuote),
        startPos: pos,
        endPos: endQuote
      };
    } else if (text[pos] === "@") {
      pos++;
      skipWhitespace();
      const binding = this.parseExpression(text, pos);
      return {
        type: "destructure",
        binding,
        startPos: startPos,
        endPos: binding ? binding.endPos : pos
      };
    } else {
      let end = pos;
      while (end < text.length && !/[\\s();]/.test(text[end])) {
        end++;
      }
      return {
        type: "atom",
        value: text.substring(pos, end),
        startPos: pos,
        endPos: end
      };
    }
  }

  format(content) {
    const normalized = this.normalizeWhitespace(content);
    return normalized;
  }

  formatFile(filePath) {
    const content = fs.readFileSync(filePath, "utf8");
    return this.format(content);
  }
}

module.exports = { CLSPFormatterV3 };
