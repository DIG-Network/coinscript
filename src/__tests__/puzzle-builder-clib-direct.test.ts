/**
 * Direct .clib File Loading Tests
 * 
 * Tests that verify .clib files can be loaded directly and their
 * AST structure is preserved exactly as written
 */

import {
  serialize,
  isAtom,
  isList,
  TreeNode
} from '../index';
import { parseChialisp } from '../chialisp/parser';
import * as fs from 'fs';
import * as path from 'path';

describe('PuzzleBuilder - Direct .clib Loading', () => {
  const includesDir = path.join(__dirname, '../../lib/chialisp/includes');
  
  // Helper to verify AST order matches source order
  function verifyASTOrder(ast: TreeNode, expectedOrder: string[]): void {
    const serialized = serialize(ast);
    let lastIndex = -1;
    
    expectedOrder.forEach(item => {
      const index = serialized.indexOf(item);
      expect(index).toBeGreaterThan(lastIndex);
      lastIndex = index;
    });
  }
  
  describe('Direct parsing of .clib files', () => {
    test('condition_codes.clib should parse with all constants in order', () => {
      const filePath = path.join(includesDir, 'condition_codes.clib');
      const content = fs.readFileSync(filePath, 'utf-8');
      const ast = parseChialisp(content);
      
      // Should be a list containing defconstant statements
      expect(isList(ast)).toBe(true);
      
      // Verify all constants are present in order
      const expectedConstants = [
        'AGG_SIG_UNSAFE',
        'AGG_SIG_ME',
        'CREATE_COIN',
        'RESERVE_FEE',
        'CREATE_COIN_ANNOUNCEMENT',
        'ASSERT_COIN_ANNOUNCEMENT',
        'CREATE_PUZZLE_ANNOUNCEMENT',
        'ASSERT_PUZZLE_ANNOUNCEMENT',
        'ASSERT_MY_COIN_ID',
        'ASSERT_MY_PARENT_ID',
        'ASSERT_MY_PUZZLEHASH',
        'ASSERT_MY_AMOUNT',
        'ASSERT_SECONDS_RELATIVE',
        'ASSERT_SECONDS_ABSOLUTE',
        'ASSERT_HEIGHT_RELATIVE',
        'ASSERT_HEIGHT_ABSOLUTE',
        'REMARK'
      ];
      
      verifyASTOrder(ast, expectedConstants);
    });

    test('utility_macros.clib should parse with all macros in order', () => {
      const filePath = path.join(includesDir, 'utility_macros.clib');
      const content = fs.readFileSync(filePath, 'utf-8');
      const ast = parseChialisp(content);
      
      expect(isList(ast)).toBe(true);
      
      // Verify macros are in order
      const expectedMacros = ['assert', 'or', 'and'];
      verifyASTOrder(ast, expectedMacros.map(m => `defmacro ${m}`));
    });

    test('curry_and_treehash.clib should parse with functions in order', () => {
      const filePath = path.join(includesDir, 'curry_and_treehash.clib');
      const content = fs.readFileSync(filePath, 'utf-8');
      const ast = parseChialisp(content);
      
      expect(isList(ast)).toBe(true);
      
      // Verify functions are in order
      const expectedFunctions = [
        'update-hash-for-parameter-hash',
        'build-curry-list',
        'tree-hash-of-apply',
        'puzzle-hash-of-curried-function'
      ];
      
      verifyASTOrder(ast, expectedFunctions);
    });

    test('singleton_truths.clib should parse with all accessors in order', () => {
      const filePath = path.join(includesDir, 'singleton_truths.clib');
      const content = fs.readFileSync(filePath, 'utf-8');
      const ast = parseChialisp(content);
      
      expect(isList(ast)).toBe(true);
      
      // First function should be truth_data_to_truth_struct
      const serialized = serialize(ast);
      expect(serialized).toContain('truth_data_to_truth_struct');
      
      // Then truth accessors in order
      const expectedAccessors = [
        'my_id_truth',
        'my_full_puzzle_hash_truth',
        'my_inner_puzzle_hash_truth',
        'my_amount_truth',
        'my_lineage_proof_truth',
        'singleton_struct_truth',
        'singleton_mod_hash_truth',
        'singleton_launcher_id_truth',
        'singleton_launcher_puzzle_hash_truth'
      ];
      
      verifyASTOrder(ast, expectedAccessors);
    });

    test('cat_truths.clib should parse with all CAT functions in order', () => {
      const filePath = path.join(includesDir, 'cat_truths.clib');
      const content = fs.readFileSync(filePath, 'utf-8');
      const ast = parseChialisp(content);
      
      expect(isList(ast)).toBe(true);
      
      // First function should be cat_truth_data_to_truth_struct
      const serialized = serialize(ast);
      expect(serialized).toContain('cat_truth_data_to_truth_struct');
      
      // Then CAT accessors in order
      const expectedAccessors = [
        'my_inner_puzzle_hash_cat_truth',
        'cat_struct_truth',
        'my_id_cat_truth',
        'my_coin_info_truth',
        'my_amount_cat_truth',
        'my_full_puzzle_hash_cat_truth',
        'my_parent_cat_truth',
        'cat_mod_hash_truth',
        'cat_mod_hash_hash_truth',
        'cat_tail_program_hash_truth'
      ];
      
      verifyASTOrder(ast, expectedAccessors);
    });

    test('sha256tree.clib should parse with recursive function', () => {
      const filePath = path.join(includesDir, 'sha256tree.clib');
      const content = fs.readFileSync(filePath, 'utf-8');
      const ast = parseChialisp(content);
      
      expect(isList(ast)).toBe(true);
      
      const serialized = serialize(ast);
      expect(serialized).toContain('defun sha256tree');
      expect(serialized).toContain('(l TREE)');
      expect(serialized).toContain('sha256 2');
      expect(serialized).toContain('sha256 1');
    });
  });

  describe('Round-trip serialization of .clib files', () => {
    test('condition_codes.clib round-trip preserves structure', () => {
      const filePath = path.join(includesDir, 'condition_codes.clib');
      const content = fs.readFileSync(filePath, 'utf-8');
      const ast = parseChialisp(content);
      const serialized = serialize(ast);
      
      // Re-parse the serialized version
      const reparsedAst = parseChialisp(serialized);
      const reserialized = serialize(reparsedAst);
      
      // Should be functionally equivalent
      expect(reserialized).toContain('AGG_SIG_UNSAFE 49');
      expect(reserialized).toContain('CREATE_COIN 51');
      expect(reserialized).toContain('REMARK 1');
    });

    test('utility_macros.clib round-trip preserves macro structure', () => {
      const filePath = path.join(includesDir, 'utility_macros.clib');
      const content = fs.readFileSync(filePath, 'utf-8');
      const ast = parseChialisp(content);
      const serialized = serialize(ast);
      
      // Re-parse the serialized version
      const reparsedAst = parseChialisp(serialized);
      const reserialized = serialize(reparsedAst);
      
      // Should preserve macro definitions
      expect(reserialized).toContain('defmacro assert');
      expect(reserialized).toContain('defmacro or');
      expect(reserialized).toContain('defmacro and');
      
      // Check macro bodies are preserved
      expect(reserialized).toContain('(q (x))'); // assert failure - serializer uses list notation
      expect(reserialized).toContain('unquote'); // macro expansion
    });

    test('complex nested structures in curry_and_treehash.clib', () => {
      const filePath = path.join(includesDir, 'curry_and_treehash.clib');
      const content = fs.readFileSync(filePath, 'utf-8');
      const ast = parseChialisp(content);
      const serialized = serialize(ast);
      
      // Should preserve constants
      expect(serialized).toContain('defconstant ONE 1');
      expect(serialized).toContain('defconstant TWO 2');
      expect(serialized).toContain('defconstant A_KW #a');
      expect(serialized).toContain('defconstant Q_KW #q');
      expect(serialized).toContain('defconstant C_KW #c');
      
      // Should preserve complex sha256 nesting
      expect(serialized).toContain('sha256 TWO (sha256 ONE C_KW)');
    });
  });

  describe('AST structure verification', () => {
    test('verify exact AST nesting for assert macro', () => {
      const filePath = path.join(includesDir, 'utility_macros.clib');
      const content = fs.readFileSync(filePath, 'utf-8');
      const ast = parseChialisp(content);
      
      // Find the assert macro definition
      if (isList(ast)) {
        const assertMacro = ast.items.find(item => {
          if (isList(item) && item.items.length >= 3) {
            const first = item.items[0];
            const second = item.items[1];
            return isAtom(first) && first.value === 'defmacro' &&
                   isAtom(second) && second.value === 'assert';
          }
          return false;
        });
        
        expect(assertMacro).toBeDefined();
        if (assertMacro && isList(assertMacro)) {
          // Should have: defmacro, assert, items, body
          expect(assertMacro.items.length).toBe(4);
          
          // The body should be an if expression
          const body = assertMacro.items[3];
          expect(isList(body)).toBe(true);
          if (isList(body)) {
            const first = body.items[0];
            expect(isAtom(first) && first.value === 'if').toBe(true);
          }
        }
      }
    });

    test('verify exact AST structure for sha256tree recursion', () => {
      const filePath = path.join(includesDir, 'sha256tree.clib');
      const content = fs.readFileSync(filePath, 'utf-8');
      const ast = parseChialisp(content);
      
      if (isList(ast)) {
        const sha256treeDef = ast.items.find(item => {
          if (isList(item) && item.items.length >= 3) {
            const first = item.items[0];
            const second = item.items[1];
            return isAtom(first) && first.value === 'defun' &&
                   isAtom(second) && second.value === 'sha256tree';
          }
          return false;
        });
        
        expect(sha256treeDef).toBeDefined();
        if (sha256treeDef && isList(sha256treeDef)) {
          // Should have: defun, sha256tree, (TREE), body
          expect(sha256treeDef.items.length).toBe(4);
          
          // The body should be an if expression
          const body = sha256treeDef.items[3];
          expect(isList(body)).toBe(true);
          if (isList(body)) {
            const first = body.items[0];
            expect(isAtom(first) && first.value === 'if').toBe(true);
            
            // Check the recursive calls
            const serializedBody = serialize(body);
            expect(serializedBody).toContain('sha256tree (f TREE)');
            expect(serializedBody).toContain('sha256tree (r TREE)');
          }
        }
      }
    });
  });
});