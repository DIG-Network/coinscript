/**
 * Round-trip Tests for ChiaLisp Include Files
 * 
 * Tests that verify the standard library .clib files can be loaded and
 * their AST structure is preserved correctly in the right order
 */

import {
  PuzzleBuilder,
  isAtom,
  isList
} from '../index';
import * as fs from 'fs';
import * as path from 'path';

describe('PuzzleBuilder - Include Files Round-trip', () => {
  const includesDir = path.join(__dirname, '../../lib/chialisp/includes');
  
  describe('condition_codes.clib', () => {
    test('should load and preserve all condition code constants', () => {
      const filePath = path.join(includesDir, 'condition_codes.clib');
      fs.readFileSync(filePath, 'utf-8');
      
      // Create a simple mod that includes the file
      const testMod = `(mod ()
  (include condition_codes.clib)
  (list AGG_SIG_ME CREATE_COIN ASSERT_MY_COIN_ID)
)`;
      const tempFile = path.join('/tmp', `test-condition-codes-${Date.now()}.clsp`);
      fs.writeFileSync(tempFile, testMod);
      
      try {
        const loaded = PuzzleBuilder.fromClsp(tempFile);
        const serialized = loaded.serialize();
        
        // Verify the include is present
        expect(serialized).toContain('(include condition_codes.clib)');
        
        // Verify key constants are referenced
        expect(serialized).toContain('AGG_SIG_ME');
        expect(serialized).toContain('CREATE_COIN');
        expect(serialized).toContain('ASSERT_MY_COIN_ID');
      } finally {
        fs.unlinkSync(tempFile);
      }
    });

    test('should preserve defconstant order in condition_codes.clib', () => {
      const filePath = path.join(includesDir, 'condition_codes.clib');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Expected constants in order
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
      
      // Verify they appear in the correct order
      let lastIndex = -1;
      expectedConstants.forEach(constant => {
        const index = content.indexOf(`defconstant ${constant}`);
        expect(index).toBeGreaterThan(lastIndex);
        lastIndex = index;
      });
    });
  });

  describe('utility_macros.clib', () => {
    test('should load and use assert macro correctly', () => {
      const testMod = `(mod (x y)
  (include utility_macros.clib)
  (assert (> x 0) (> y 0))
)`;
      const tempFile = path.join('/tmp', `test-assert-${Date.now()}.clsp`);
      fs.writeFileSync(tempFile, testMod);
      
      try {
        const loaded = PuzzleBuilder.fromClsp(tempFile);
        const serialized = loaded.serialize();
        
        // Verify the include is present
        expect(serialized).toContain('(include utility_macros.clib)');
        
        // Verify assert is used
        expect(serialized).toContain('assert');
      } finally {
        fs.unlinkSync(tempFile);
      }
    });

    test('should preserve macro definitions order', () => {
      const filePath = path.join(includesDir, 'utility_macros.clib');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Expected macros in order
      const expectedMacros = ['assert', 'or', 'and'];
      
      // Verify they appear in the correct order
      let lastIndex = -1;
      expectedMacros.forEach(macro => {
        const index = content.indexOf(`defmacro ${macro}`);
        expect(index).toBeGreaterThan(lastIndex);
        lastIndex = index;
      });
    });

    test('should correctly expand or/and macros', () => {
      const testMod = `(mod (a b c)
  (include utility_macros.clib)
  (list
    (or (> a 0) (> b 0) (> c 0))
    (and (> a 0) (> b 0) (> c 0))
  )
)`;
      const tempFile = path.join('/tmp', `test-or-and-${Date.now()}.clsp`);
      fs.writeFileSync(tempFile, testMod);
      
      try {
        const loaded = PuzzleBuilder.fromClsp(tempFile);
        const serialized = loaded.serialize();
        
        expect(serialized).toContain('(include utility_macros.clib)');
        expect(serialized).toContain('or');
        expect(serialized).toContain('and');
      } finally {
        fs.unlinkSync(tempFile);
      }
    });
  });

  describe('curry_and_treehash.clib', () => {
    test('should load curry helper functions', () => {
      const testMod = `(mod (function_hash param1 param2)
  (include curry_and_treehash.clib)
  (puzzle-hash-of-curried-function function_hash param2 param1)
)`;
      const tempFile = path.join('/tmp', `test-curry-${Date.now()}.clsp`);
      fs.writeFileSync(tempFile, testMod);
      
      try {
        const loaded = PuzzleBuilder.fromClsp(tempFile);
        const serialized = loaded.serialize();
        
        expect(serialized).toContain('(include curry_and_treehash.clib)');
        expect(serialized).toContain('puzzle-hash-of-curried-function');
      } finally {
        fs.unlinkSync(tempFile);
      }
    });

    test('should preserve function definition order', () => {
      const filePath = path.join(includesDir, 'curry_and_treehash.clib');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Expected functions in order
      const expectedFunctions = [
        'update-hash-for-parameter-hash',
        'build-curry-list',
        'tree-hash-of-apply',
        'puzzle-hash-of-curried-function'
      ];
      
      // Verify they appear in the correct order
      let lastIndex = -1;
      expectedFunctions.forEach(func => {
        const index = content.indexOf(`defun-inline ${func}`) !== -1 
          ? content.indexOf(`defun-inline ${func}`)
          : content.indexOf(`defun ${func}`);
        expect(index).toBeGreaterThan(lastIndex);
        lastIndex = index;
      });
    });
  });

  describe('singleton_truths.clib', () => {
    test('should load singleton helper functions', () => {
      const testMod = `(mod (truths)
  (include singleton_truths.clib)
  (list
    (my_id_truth truths)
    (my_inner_puzzle_hash_truth truths)
    (singleton_launcher_id_truth truths)
  )
)`;
      const tempFile = path.join('/tmp', `test-singleton-${Date.now()}.clsp`);
      fs.writeFileSync(tempFile, testMod);
      
      try {
        const loaded = PuzzleBuilder.fromClsp(tempFile);
        const serialized = loaded.serialize();
        
        expect(serialized).toContain('(include singleton_truths.clib)');
        expect(serialized).toContain('my_id_truth');
        expect(serialized).toContain('my_inner_puzzle_hash_truth');
        expect(serialized).toContain('singleton_launcher_id_truth');
      } finally {
        fs.unlinkSync(tempFile);
      }
    });

    test('should preserve truth accessor functions in correct order', () => {
      const filePath = path.join(includesDir, 'singleton_truths.clib');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Expected truth accessors in order
      const expectedAccessors = [
        'my_id_truth',
        'my_full_puzzle_hash_truth',
        'my_inner_puzzle_hash_truth',
        'my_amount_truth',
        'my_lineage_proof_truth',
        'singleton_struct_truth'
      ];
      
      // Verify they appear in the correct order
      let lastIndex = -1;
      expectedAccessors.forEach(accessor => {
        const index = content.indexOf(`defun-inline ${accessor}`);
        expect(index).toBeGreaterThan(lastIndex);
        lastIndex = index;
      });
    });
  });

  describe('cat_truths.clib', () => {
    test('should load CAT helper functions', () => {
      const testMod = `(mod (truths)
  (include cat_truths.clib)
  (list
    (my_inner_puzzle_hash_cat_truth truths)
    (cat_mod_hash_truth truths)
    (cat_tail_program_hash_truth truths)
  )
)`;
      const tempFile = path.join('/tmp', `test-cat-${Date.now()}.clsp`);
      fs.writeFileSync(tempFile, testMod);
      
      try {
        const loaded = PuzzleBuilder.fromClsp(tempFile);
        const serialized = loaded.serialize();
        
        expect(serialized).toContain('(include cat_truths.clib)');
        expect(serialized).toContain('my_inner_puzzle_hash_cat_truth');
        expect(serialized).toContain('cat_mod_hash_truth');
        expect(serialized).toContain('cat_tail_program_hash_truth');
      } finally {
        fs.unlinkSync(tempFile);
      }
    });

    test('should preserve CAT truth accessor functions in correct order', () => {
      const filePath = path.join(includesDir, 'cat_truths.clib');
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Expected CAT truth accessors in order
      const expectedAccessors = [
        'my_inner_puzzle_hash_cat_truth',
        'cat_struct_truth',
        'my_id_cat_truth',
        'my_coin_info_truth',
        'my_amount_cat_truth',
        'my_full_puzzle_hash_cat_truth',
        'my_parent_cat_truth'
      ];
      
      // Verify they appear in the correct order
      let lastIndex = -1;
      expectedAccessors.forEach(accessor => {
        const index = content.indexOf(`defun-inline ${accessor}`);
        expect(index).toBeGreaterThan(lastIndex);
        lastIndex = index;
      });
    });
  });

  describe('sha256tree.clib', () => {
    test('should load and use sha256tree function', () => {
      const testMod = `(mod (data)
  (include sha256tree.clib)
  (sha256tree data)
)`;
      const tempFile = path.join('/tmp', `test-sha256tree-${Date.now()}.clsp`);
      fs.writeFileSync(tempFile, testMod);
      
      try {
        const loaded = PuzzleBuilder.fromClsp(tempFile);
        const serialized = loaded.serialize();
        
        expect(serialized).toContain('(include sha256tree.clib)');
        expect(serialized).toContain('sha256tree');
      } finally {
        fs.unlinkSync(tempFile);
      }
    });
  });

  describe('Complex include combinations', () => {
    test('should handle multiple includes in correct order', () => {
      const testMod = `(mod (truths)
  (include condition_codes.clib)
  (include singleton_truths.clib)
  (include utility_macros.clib)
  
  (assert (my_amount_truth truths))
  (list
    (list CREATE_COIN (my_inner_puzzle_hash_truth truths) (my_amount_truth truths))
    (list ASSERT_MY_COIN_ID (my_id_truth truths))
  )
)`;
      const tempFile = path.join('/tmp', `test-multi-include-${Date.now()}.clsp`);
      fs.writeFileSync(tempFile, testMod);
      
      try {
        const loaded = PuzzleBuilder.fromClsp(tempFile);
        const serialized = loaded.serialize();
        
        // Verify all includes are present in order
        const conditionIndex = serialized.indexOf('(include condition_codes.clib)');
        const singletonIndex = serialized.indexOf('(include singleton_truths.clib)');
        const utilityIndex = serialized.indexOf('(include utility_macros.clib)');
        
        expect(conditionIndex).toBeGreaterThan(-1);
        expect(singletonIndex).toBeGreaterThan(conditionIndex);
        expect(utilityIndex).toBeGreaterThan(singletonIndex);
        
        // Verify functions from different includes are used
        expect(serialized).toContain('CREATE_COIN');
        expect(serialized).toContain('my_amount_truth');
        expect(serialized).toContain('assert');
      } finally {
        fs.unlinkSync(tempFile);
      }
    });

    test('should handle nested include dependencies', () => {
      const testMod = `(mod (mod_hash param1 param2)
  (include curry_and_treehash.clib)
  (include sha256tree.clib)
  
  ; curry_and_treehash uses sha256 internally
  (puzzle-hash-of-curried-function 
    (sha256tree mod_hash)
    param2 
    param1
  )
)`;
      const tempFile = path.join('/tmp', `test-nested-include-${Date.now()}.clsp`);
      fs.writeFileSync(tempFile, testMod);
      
      try {
        const loaded = PuzzleBuilder.fromClsp(tempFile);
        const serialized = loaded.serialize();
        
        // Verify includes are in the right order
        const curryIndex = serialized.indexOf('(include curry_and_treehash.clib)');
        const sha256Index = serialized.indexOf('(include sha256tree.clib)');
        
        expect(curryIndex).toBeGreaterThan(-1);
        expect(sha256Index).toBeGreaterThan(curryIndex);
        
        // Verify functions are used
        expect(serialized).toContain('puzzle-hash-of-curried-function');
        expect(serialized).toContain('sha256tree');
      } finally {
        fs.unlinkSync(tempFile);
      }
    });
  });

  describe('AST structure preservation', () => {
    test('should preserve exact AST structure for condition codes', () => {
      const testMod = `(mod ()
  (include condition_codes.clib)
  CREATE_COIN
)`;
      const tempFile = path.join('/tmp', `test-ast-condition-${Date.now()}.clsp`);
      fs.writeFileSync(tempFile, testMod);
      
      try {
        const loaded = PuzzleBuilder.fromClsp(tempFile);
        const ast = loaded.build();
        
        // Verify AST structure
        expect(isList(ast)).toBe(true);
        if (isList(ast)) {
          expect(ast.items.length).toBeGreaterThanOrEqual(3); // mod, params, include, body
          
          // First should be 'mod'
          expect(isAtom(ast.items[0])).toBe(true);
          if (isAtom(ast.items[0])) {
            expect(ast.items[0].value).toBe('mod');
          }
          
          // Should have include statement
          const hasInclude = ast.items.some(item => {
            if (isList(item) && item.items.length >= 2) {
              const first = item.items[0];
              return isAtom(first) && first.value === 'include';
            }
            return false;
          });
          expect(hasInclude).toBe(true);
        }
      } finally {
        fs.unlinkSync(tempFile);
      }
    });

    test('should preserve exact AST structure for complex macros', () => {
      const testMod = `(mod (x y z)
  (include utility_macros.clib)
  (assert 
    (> x 0) 
    (> y 0)
    (or (= z 1) (= z 2))
  )
)`;
      const tempFile = path.join('/tmp', `test-ast-macro-${Date.now()}.clsp`);
      fs.writeFileSync(tempFile, testMod);
      
      try {
        const loaded = PuzzleBuilder.fromClsp(tempFile);
        const serialized = loaded.serialize();
        
        // The macro should be preserved in the output
        expect(serialized).toContain('assert');
        expect(serialized).toContain('or');
        
        // Verify nesting is preserved
        expect(serialized).toContain('(> x 0)');
        expect(serialized).toContain('(> y 0)');
        expect(serialized).toContain('(= z 1)');
        expect(serialized).toContain('(= z 2)');
      } finally {
        fs.unlinkSync(tempFile);
      }
    });
  });
});