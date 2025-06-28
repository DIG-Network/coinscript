/**
 * Serializer
 * 
 * Converts tree nodes to ChiaLisp string representation.
 */

import {
  TreeNode,
  Cons,
  isAtom,
  isList,
  isCons,
  isNil,
  SerializeOptions,
  SerializeError
} from './types';

/**
 * Convert a tree to ChiaLisp string
 */
export function serialize(node: TreeNode, options: SerializeOptions = {}): string {
  const {
    hexPrefix = true,
    indent = false,
    indentString = '  ',
    blockComments = [],
    includedLibraries = []
  } = options;
  
  // Ensure comments is properly typed
  const comments: Map<TreeNode, string> = options.comments || new Map<TreeNode, string>();

  return serializeNode(node, 0);

  function serializeNode(n: TreeNode, depth: number, skipComment = false): string {
    let result = '';
    
    // Add comment if this node has one
    if (!skipComment && comments.has(n) && indent) {
      const comment = comments.get(n);
      if (comment) {
        result = ` ;; ${comment}`;
      }
    }
    
    if (isAtom(n)) {
      return serializeAtom(n.value) + result;
    } else if (isList(n)) {
      return serializeList(n.items, depth, n) + result;
    } else if (isCons(n)) {
      return serializeCons(n, depth) + result;
    }
    throw new SerializeError(`Unknown node type: ${JSON.stringify(n)}`);
  }

  function serializeAtom(value: unknown): string {
    // Nil
    if (value === null) {
      return '()';
    }

    // Number or bigint
    if (typeof value === 'number' || typeof value === 'bigint') {
      // Check if this numeric value should be replaced based on included libraries
      const numValue = Number(value);
      
      // If opcodes.clib is included, use keyword forms (q, a, i, etc.)
      if (includedLibraries.some(lib => lib.includes('opcodes.clib'))) {
        const keyword = getKeyword(numValue);
        if (keyword) return keyword;
      }
      
      return value.toString();
    }

    // Boolean
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }

    // String (symbol)
    if (typeof value === 'string') {
      // Check if this symbol should be replaced based on included libraries
      // BUT: if opcodes.clib is included, prefer keeping opcode constants as-is
      const isOpcodesIncluded = includedLibraries.some(lib => lib.includes('opcodes.clib'));
      const isOpcodeConstant = isOpcodesIncluded && value in getOpcodeConstants();
      
      if (!isOpcodeConstant) {
        const replacement = getSymbolReplacement(value, includedLibraries);
        if (replacement !== null) {
          return replacement;
        }
      }
      
      // Check if it needs quoting
      if (needsQuoting(value)) {
        return `"${escapeString(value)}"`;
      }
      return value;
    }

    // Bytes
    if (value instanceof Uint8Array) {
      const hexStr = Array.from(value)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return hexPrefix ? `0x${hexStr}` : hexStr;
    }

    throw new SerializeError(`Cannot serialize atom value: ${String(value)}`);
  }

  function serializeList(items: TreeNode[], depth: number, _node: TreeNode): string {
    if (items.length === 0) return '()';

    if (indent) {
      const spacing = indentString.repeat(depth);
      const nextSpacing = indentString.repeat(depth + 1);
      
      // Special handling for certain forms
      const firstItem = items[0];
      
      // Handle mod structure specially - matches cat_v2.clsp style
      if (isAtom(firstItem) && firstItem.value === 'mod' && items.length >= 3) {
        const params = items[1];
        const bodyItems = items.slice(2);
        
        // Check if params should be on same line (simple case)
        const paramStr = serializeNode(params, 0);
        if (paramStr.length <= 60 && !paramStr.includes('\n')) {
          // Simple mod - like singleton_output_inner_puzzle.clsp
          const bodySimple = bodyItems.length === 1 && !serializeNode(bodyItems[0], 0).includes('\n');
          if (bodySimple && serializeNode(bodyItems[0], 0).length <= 40) {
            return `(mod ${paramStr}\n${nextSpacing}${serializeNode(bodyItems[0], depth + 1)}\n${spacing})`;
          }
        }
        
        // Complex mod - like cat_v2.clsp
        let result = '(mod';
        
        // Parameters - check if it's a list with many items
        if (isList(params) && params.items.length > 3) {
          // Multi-line parameters
          result += ' (\n';
          params.items.forEach((param, idx) => {
            result += `${indentString.repeat(depth + 2)}${serializeNode(param, 0)}`;
            // Add comment space for alignment if needed
            const comment = getCommentForParam(param);
            if (comment) {
              result += `${' '.repeat(Math.max(1, 25 - serializeNode(param, 0).length))};; ${comment}`;
            }
            if (idx < params.items.length - 1) result += '\n';
          });
          result += `\n${nextSpacing})\n`;
        } else {
          // Single line parameters
          result += ` ${serializeNode(params, 0)}\n`;
        }
        
        // Add block comments before body
        if (blockComments.length > 0 && indent) {
          blockComments.forEach(comment => {
            result += `\n${nextSpacing};; ${comment}`;
          });
          if (bodyItems.length > 0) {
            result += '\n';
          }
        }
        
        // Body items
        bodyItems.forEach((item, idx) => {
          result += '\n';
          // Group includes together without extra spacing
          if (isInclude(item) && idx > 0 && !isInclude(bodyItems[idx - 1])) {
            result += '\n';
          }
          result += `${nextSpacing}${serializeNode(item, depth + 1)}`;
        });
        
        result += `\n${spacing})`;
        return result;
      }
      
      // Handle defun/defun-inline specially - matches ChiaLisp style
      if (isAtom(firstItem) && ['defun', 'defun-inline', 'defmacro'].includes(firstItem.value as string) && items.length >= 3) {
        const form = firstItem.value as string;
        const name = serializeNode(items[1], 0);
        const params = serializeNode(items[2], 0);
        const bodyItems = items.slice(3);
        
        // defun name and params on same line
        let result = `(${form} ${name} ${params}`;
        
        if (bodyItems.length > 0) {
          bodyItems.forEach(item => {
            result += `\n${nextSpacing}${serializeNode(item, depth + 1)}`;
          });
          result += `\n${spacing})`;
        } else {
          result += ')';
        }
        
        return result;
      }
      
      // Handle if specially
      if (isAtom(firstItem) && firstItem.value === 'if' && items.length >= 3) {
        const condition = serializeNode(items[1], depth + 1);
        const thenExpr = items[2];
        const elseExpr = items.length > 3 ? items[3] : null;
        
        // Check if condition is simple
        if (condition.length <= 40 && !condition.includes('\n')) {
          // Check if then/else are simple too
          const thenStr = serializeNode(thenExpr, 0);
          const elseStr = elseExpr ? serializeNode(elseExpr, 0) : '';
          
          if (thenStr.length <= 60 && !thenStr.includes('\n') && 
              (!elseExpr || (elseStr.length <= 60 && !elseStr.includes('\n')))) {
            // All on one line
            return `(if ${condition} ${thenStr}${elseExpr ? ' ' + elseStr : ''})`;
          }
        }
        
        // Multi-line if
        let result = `(if ${condition}`;
        result += `\n${nextSpacing}${serializeNode(thenExpr, depth + 1)}`;
        if (elseExpr) {
          result += `\n${nextSpacing}${serializeNode(elseExpr, depth + 1)}`;
        }
        result += `\n${spacing})`;
        return result;
      }
      
      // Handle list specially - for condition lists
      if (isAtom(firstItem) && firstItem.value === 'list' && items.length > 2) {
        let result = '(list';
        items.slice(1).forEach(item => {
          result += `\n${nextSpacing}${serializeNode(item, depth + 1)}`;
        });
        result += `\n${spacing})`;
        return result;
      }
      
      // Handle include specially - always one line
      if (isAtom(firstItem) && firstItem.value === 'include') {
        return `(${items.map(item => serializeNode(item, 0)).join(' ')})`;
      }
      
      // Handle cons (c) operations - check if we should inline
      if (isAtom(firstItem) && firstItem.value === 'c' && items.length === 3) {
        const allSimple = items.slice(1).every(item => {
          const str = serializeNode(item, 0);
          return str.length <= 40 && !str.includes('\n');
        });
        if (allSimple) {
          return `(${items.map(item => serializeNode(item, 0)).join(' ')})`;
        }
      }
      
      // Check if it's simple enough to fit on one line
      const serializedItems = items.map(item => serializeNode(item, 0));
      const totalLength = serializedItems.reduce((sum, s) => sum + s.length, 0) + items.length - 1;
      const allSimple = items.every(item => 
        isAtom(item) || (isList(item) && item.items.length <= 3)
      );
      
      if (totalLength <= 80 && allSimple && !serializedItems.some(s => s.includes('\n'))) {
        return `(${serializedItems.join(' ')})`;
      }

      // Multi-line format for everything else
      const parts = items.map((item, _index) => {
        return `${nextSpacing}${serializeNode(item, depth + 1)}`;
      });
      
      return `(\n${parts.join('\n')}\n${spacing})`;
    }

    return `(${items.map(item => serializeNode(item, depth + 1)).join(' ')})`;
  }

  function serializeCons(node: Cons, depth: number): string {
    // Collect all elements in the cons chain
    const elements: TreeNode[] = [];
    let current: TreeNode = node;
    
    while (isCons(current)) {
      elements.push(current.first);
      current = current.rest;
    }
    
    // Check if it ends in nil (proper list)
    if (isNil(current)) {
      return serializeList(elements, depth, node);
    }
    
    // Improper list
    elements.push(current);
    const parts = elements.map((elem, i) => {
      const sep = i === elements.length - 2 ? ' . ' : ' ';
      return serializeNode(elem, depth + 1) + (i < elements.length - 1 ? sep : '');
    });
    
    return `(${parts.join('')})`;
  }

  // Helper function to check if a node is an include
  function isInclude(node: TreeNode): boolean {
    return isList(node) && node.items.length >= 2 && 
           isAtom(node.items[0]) && node.items[0].value === 'include';
  }
  
  // Helper to get parameter comments (would need more context in real implementation)
  function getCommentForParam(param: TreeNode): string | null {
    if (!isAtom(param)) return null;
    const paramName = String(param.value);
    const commonComments: Record<string, string> = {
      'MOD_HASH': 'curried into puzzle',
      'TAIL_PROGRAM_HASH': 'curried into puzzle', 
      'INNER_PUZZLE': 'curried into puzzle',
      'inner_puzzle_solution': 'if invalid, INNER_PUZZLE will fail',
      'lineage_proof': 'This is the parent\'s coin info, used to check if the parent was a CAT. Optional if using tail_program.',
      'prev_coin_id': 'used in this coin\'s announcement, prev_coin ASSERT_COIN_ANNOUNCEMENT will fail if wrong',
      'this_coin_info': 'verified with ASSERT_MY_COIN_ID',
      'next_coin_proof': 'used to generate ASSERT_COIN_ANNOUNCEMENT',
      'prev_subtotal': 'included in announcement, prev_coin ASSERT_COIN_ANNOUNCEMENT will fail if wrong',
      'extra_delta': 'this is the "legal discrepancy" between your real delta and what you\'re announcing your delta is'
    };
    return commonComments[paramName] || null;
  }
}

/**
 * Check if a string needs quoting
 */
function needsQuoting(s: string): boolean {
  if (s.length === 0) return true;
  
  // Check for special characters
  if (/[\s()";]/.test(s)) return true;
  
  // Check if it looks like a number
  if (/^-?\d+$/.test(s)) return true;
  
  // Check if it starts with 0x (hex)
  if (s.startsWith('0x')) return true;
  
  return false;
}

/**
 * Escape special characters in strings
 */
function escapeString(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Get keyword for common operators
 */
function getKeyword(value: number): string | null {
  const keywords: Record<number, string> = {
    1: 'q',
    2: 'a',
    3: 'i',
    4: 'c',
    5: 'f',
    6: 'r',
    7: 'l',
    8: 'x',
    9: '=',
    10: '>s',
    11: 'sha256',
    12: 'substr',
    13: 'strlen',
    14: 'concat',
    16: '+',
    17: '-',
    18: '*',
    19: '/',
    20: 'divmod',
    21: '>',
    22: 'ash',
    23: 'lsh',
    24: 'logand',
    25: 'logior',
    26: 'logxor',
    27: 'lognot',
    28: 'point_add',
    29: 'pubkey_for_exp',
    30: 'not',
    31: 'any',
    32: 'all',
    33: 'softfork'
  };
  
  return keywords[value] || null;
}



/**
 * Get symbol replacement based on included libraries
 */
function getSymbolReplacement(symbol: string, includedLibraries: string[]): string | null {
  // Define which symbols come from which libraries
  const librarySymbols: Record<string, Record<string, string>> = {
    'opcodes.clib': {
      'QUOTE': 'q',
      'APPLY': 'a',
      'IF': 'i',
      'CONS': 'c',
      'FIRST': 'f',
      'REST': 'r',
      'LISTP': 'l',
      'RAISE': 'x',
      'EQ': '=',
      'GTS': '>s',
      'SHA256': 'sha256',
      'SUBSTR': 'substr',
      'STRLEN': 'strlen',
      'CONCAT': 'concat',
      'ADD': '+',
      'SUBTRACT': '-',
      'MULTIPLY': '*',
      'DIVIDE': '/',
      'DIVMOD': 'divmod',
      'GT': '>',
      'ASH': 'ash',
      'LSH': 'lsh',
      'LOGAND': 'logand',
      'LOGIOR': 'logior',
      'LOGXOR': 'logxor',
      'LOGNOT': 'lognot',
      'POINT_ADD': 'point_add',
      'PUBKEY_FOR_EXP': 'pubkey_for_exp',
      'NOT': 'not',
      'ANY': 'any',
      'ALL': 'all',
      'SOFTFORK': 'softfork',
      'SHA256TREE': 'sha256tree',
      'SHA256TREE1': 'sha256tree1',
      'KECCAK256': 'keccak256',
      'COINID': 'coinid',
      'SECP256K1_VERIFY': 'secp256k1_verify',
      'SECP256R1_VERIFY': 'secp256r1_verify',
      'G1_ADD': 'g1_add',
      'G1_SUBTRACT': 'g1_subtract',
      'G1_MULTIPLY': 'g1_multiply',
      'BLS_VERIFY': 'bls_verify',
      'IS_ERROR': 'is_error',
      'CONTAINS': 'contains',
      // Note: ASSERT is from utility_macros.clib, not opcodes.clib
      // Also handle common forms that should be lowercase
      'MOD': 'mod',
      'DEFUN': 'defun',
      'DEFMACRO': 'defmacro',
      'DEFCONSTANT': 'defconstant',
      'INCLUDE': 'include',
      'LIST': 'list'
    },
    'condition_codes.clib': {
      'CREATE_COIN': '51',
      'AGG_SIG_ME': '50',
      'AGG_SIG_UNSAFE': '49',
      'RESERVE_FEE': '52',
      'CREATE_COIN_ANNOUNCEMENT': '60',
      'ASSERT_COIN_ANNOUNCEMENT': '61',
      'CREATE_PUZZLE_ANNOUNCEMENT': '62',
      'ASSERT_PUZZLE_ANNOUNCEMENT': '63',
      'ASSERT_MY_COIN_ID': '70',
      'ASSERT_MY_PARENT_ID': '71',
      'ASSERT_MY_PUZZLEHASH': '72',
      'ASSERT_MY_AMOUNT': '73',
      'ASSERT_SECONDS_RELATIVE': '80',
      'ASSERT_SECONDS_ABSOLUTE': '81',
      'ASSERT_HEIGHT_RELATIVE': '82',
      'ASSERT_HEIGHT_ABSOLUTE': '83',
      'REMARK': '1'
    },
    'utility_macros.clib': {
      'ASSERT': 'assert'
    }
  };
  
  // Check each included library to see if it defines this symbol
  for (const lib of includedLibraries) {
    // Handle both full paths and simple names
    const libName = lib.includes('/') ? lib.split('/').pop() || lib : lib;
    
    if (librarySymbols[libName] && librarySymbols[libName][symbol]) {
      return librarySymbols[libName][symbol];
    }
  }
  
  return null;
}

/**
 * Get the opcode constants that should be preserved when opcodes.clib is included
 */
function getOpcodeConstants(): Record<string, boolean> {
  return {
    'QUOTE': true,
    'APPLY': true,
    'IF': true,
    'CONS': true,
    'FIRST': true,
    'REST': true,
    'LISTP': true,
    'RAISE': true,
    'EQ': true,
    'GTS': true,
    'SHA256': true,
    'SUBSTR': true,
    'STRLEN': true,
    'CONCAT': true,
    'ADD': true,
    'SUBTRACT': true,
    'MULTIPLY': true,
    'DIVIDE': true,
    'DIVMOD': true,
    'GT': true,
    'ASH': true,
    'LSH': true,
    'LOGAND': true,
    'LOGIOR': true,
    'LOGXOR': true,
    'LOGNOT': true,
    'POINT_ADD': true,
    'PUBKEY_FOR_EXP': true,
    'NOT': true,
    'ANY': true,
    'ALL': true,
    'SOFTFORK': true,
    'SHA256TREE': true,
    'SHA256TREE1': true,
    'KECCAK256': true,
    'COINID': true,
    'SECP256K1_VERIFY': true,
    'SECP256R1_VERIFY': true,
    'G1_ADD': true,
    'G1_SUBTRACT': true,
    'G1_MULTIPLY': true,
    'BLS_VERIFY': true,
    'IS_ERROR': true,
    'CONTAINS': true,
    'MOD': true,
    'DEFUN': true,
    'DEFMACRO': true,
    'DEFCONSTANT': true,
    'INCLUDE': true,
    'LIST': true
  };
} 