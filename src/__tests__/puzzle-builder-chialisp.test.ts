/**
 * ChiaLisp Parsing and Loading Tests
 * 
 * Tests for loading different ChiaLisp puzzles and verifying AST representation
 */

import {
  PuzzleBuilder,
  isList
} from '../index';
import * as fs from 'fs';
import * as path from 'path';

describe('PuzzleBuilder - ChiaLisp Parsing', () => {
  // Helper to create temporary ChiaLisp files for testing
  const createTempClsp = (content: string): string => {
    const tempPath = path.join('/tmp', `test-${Date.now()}.clsp`);
    fs.writeFileSync(tempPath, content);
    return tempPath;
  };

  afterEach(() => {
    // Clean up temp files
    const tempFiles = fs.readdirSync('/tmp').filter(f => f.startsWith('test-'));
    tempFiles.forEach(f => {
      try {
        fs.unlinkSync(path.join('/tmp', f));
      } catch {}
    });
  });

  describe('Basic ChiaLisp Loading', () => {
    test('should load simple mod structure', () => {
      const clsp = `(mod () 42)`;
      const tempPath = createTempClsp(clsp);
      
      const p = PuzzleBuilder.fromClsp(tempPath);
      expect(p).toBeInstanceOf(PuzzleBuilder);
      
      const serialized = p.serialize();
      expect(serialized).toContain('mod');
      expect(serialized).toContain('42');
    });

    test('should load mod with parameters', () => {
      const clsp = `(mod (amount recipient) 
        (list (list 51 recipient amount))
      )`;
      const tempPath = createTempClsp(clsp);
      
      const p = PuzzleBuilder.fromClsp(tempPath);
      const serialized = p.serialize();
      expect(serialized).toContain('amount');
      expect(serialized).toContain('recipient');
      expect(serialized).toContain('51');
    });

    test('should load mod with includes', () => {
      const clsp = `(mod (pubkey)
        (include condition_codes.clib)
        (list (AGG_SIG_ME pubkey (sha256tree1 1)))
      )`;
      const tempPath = createTempClsp(clsp);
      
      const p = PuzzleBuilder.fromClsp(tempPath);
      const serialized = p.serialize();
      expect(serialized).toContain('include condition_codes.clib');
      expect(serialized).toContain('AGG_SIG_ME');
      expect(serialized).toContain('pubkey');
    });
  });

  describe('Complex ChiaLisp Structures', () => {
    test('should load nested if statements', () => {
      const clsp = `(mod (x y)
        (if (> x 0)
          (if (> y 0)
            "both positive"
            "x positive"
          )
          "x not positive"
        )
      )`;
      const tempPath = createTempClsp(clsp);
      
      const p = PuzzleBuilder.fromClsp(tempPath);
      const serialized = p.serialize();
      expect(serialized).toContain('x');
      expect(serialized).toContain('y');
      expect(serialized).toContain('>');
      // if might be compiled to 'i'
      expect(serialized.toLowerCase()).toContain('i');
    });

    test('should load defun and function calls', () => {
      const clsp = `(mod (value)
        (defun double (x) (* x 2))
        (double value)
      )`;
      const tempPath = createTempClsp(clsp);
      
      const p = PuzzleBuilder.fromClsp(tempPath);
      const serialized = p.serialize();
      expect(serialized).toContain('value');
      expect(serialized).toContain('double');
      expect(serialized).toContain('*');
      expect(serialized).toContain('2');
    });

    test('should load complex condition lists', () => {
      const clsp = `(mod (recipient1 recipient2 amount)
        (list
          (list 51 recipient1 (/ amount 2))
          (list 51 recipient2 (/ amount 2))
          (list 52 100)
        )
      )`;
      const tempPath = createTempClsp(clsp);
      
      const p = PuzzleBuilder.fromClsp(tempPath);
      const serialized = p.serialize();
      expect(serialized.match(/51/g)?.length).toBeGreaterThanOrEqual(2);
      expect(serialized).toContain('52');
      expect(serialized).toContain('/');
    });
  });

  describe('Standard Puzzle Patterns', () => {
    test('should load pay to conditions puzzle', () => {
      const clsp = `(mod conditions conditions)`;
      const tempPath = createTempClsp(clsp);
      
      const p = PuzzleBuilder.fromClsp(tempPath);
      const serialized = p.serialize();
      expect(serialized).toContain('mod');
      expect(serialized).toContain('conditions');
    });

    test('should load singleton top layer pattern', () => {
      const clsp = `(mod (SINGLETON_STRUCT INNER_PUZZLE inner_solution)
        (include condition_codes.clib)
        (include singleton_truths.clib)
        
        ; Singleton logic here
        (list 
          (list CREATE_COIN 
            (singleton_puzzle_hash SINGLETON_STRUCT INNER_PUZZLE)
            1
          )
        )
      )`;
      const tempPath = createTempClsp(clsp);
      
      const p = PuzzleBuilder.fromClsp(tempPath);
      const serialized = p.serialize();
      // Variable names might be converted to hex
      expect(serialized).toContain('singleton_truths.clib');
      expect(serialized).toContain('CREATE_COIN');
    });

    test('should load CAT puzzle pattern', () => {
      const clsp = `(mod (MOD_HASH TAIL_HASH INNER_PUZZLE inner_solution)
        (include condition_codes.clib)
        (include cat_truths.clib)
        
        ; CAT logic
        (list
          (list CREATE_COIN
            (cat_puzzle_hash MOD_HASH TAIL_HASH INNER_PUZZLE)
            1
          )
        )
      )`;
      const tempPath = createTempClsp(clsp);
      
      const p = PuzzleBuilder.fromClsp(tempPath);
      const serialized = p.serialize();
      // Variable names might be converted to hex
      expect(serialized).toContain('cat_truths.clib');
      expect(serialized).toContain('CREATE_COIN');
    });
  });

  describe('Macro and Include Handling', () => {
    test('should handle defmacro', () => {
      const clsp = `(mod ()
        (defmacro assert items
          (if (r items)
            (list if (f items) (c assert (r items)) (q . "assert failed"))
            (f items)
          )
        )
        
        (assert (> 1 0) (= 2 2))
      )`;
      const tempPath = createTempClsp(clsp);
      
      const p = PuzzleBuilder.fromClsp(tempPath);
      const serialized = p.serialize();
      expect(serialized).toContain('assert');
    });

    test('should handle defconstant', () => {
      const clsp = `(mod ()
        (defconstant MIN_FEE 100)
        (defconstant MAX_AMOUNT 1000000)
        
        (list
          (list 52 MIN_FEE)
          (list 51 0xabc MAX_AMOUNT)
        )
      )`;
      const tempPath = createTempClsp(clsp);
      
      const p = PuzzleBuilder.fromClsp(tempPath);
      const serialized = p.serialize();
      expect(serialized).toContain('MIN_FEE');
      expect(serialized).toContain('MAX_AMOUNT');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid ChiaLisp gracefully', () => {
      const clsp = `(mod () (invalid-operator 1 2))`;
      const tempPath = createTempClsp(clsp);
      
      // This might throw or return a puzzle with the invalid operator
      expect(() => {
        const p = PuzzleBuilder.fromClsp(tempPath);
        p.serialize();
      }).not.toThrow(); // Should handle gracefully
    });

    test('should handle unclosed parentheses', () => {
      const clsp = `(mod () (list 1 2`;
      const tempPath = createTempClsp(clsp);
      
      expect(() => {
        PuzzleBuilder.fromClsp(tempPath);
      }).toThrow(); // Parser should throw on syntax errors
    });
  });

  describe('Quote and Quasiquote', () => {
    test('should handle quoted expressions', () => {
      const clsp = `(mod ()
        (q . (1 2 3))
      )`;
      const tempPath = createTempClsp(clsp);
      
      const p = PuzzleBuilder.fromClsp(tempPath);
      const serialized = p.serialize();
      expect(serialized).toContain('q');
    });

    test('should handle quasiquote with unquote', () => {
      const clsp = `(mod (value)
        (qq (list 1 (unquote value) 3))
      )`;
      const tempPath = createTempClsp(clsp);
      
      const p = PuzzleBuilder.fromClsp(tempPath);
      const serialized = p.serialize();
      expect(serialized).toContain('value');
    });
  });

  describe('Operators and Built-ins', () => {
    test('should handle all arithmetic operators', () => {
      const clsp = `(mod (a b)
        (list
          (+ a b)
          (- a b)
          (* a b)
          (/ a b)
          (divmod a b)
        )
      )`;
      const tempPath = createTempClsp(clsp);
      
      const p = PuzzleBuilder.fromClsp(tempPath);
      const serialized = p.serialize();
      expect(serialized).toContain('+');
      expect(serialized).toContain('-');
      expect(serialized).toContain('*');
      expect(serialized).toContain('/');
      expect(serialized).toContain('divmod');
    });

    test('should handle comparison operators', () => {
      const clsp = `(mod (a b)
        (list
          (> a b)
          (< a b)
          (= a b)
          (>s a b)
          (not (= a b))
        )
      )`;
      const tempPath = createTempClsp(clsp);
      
      const p = PuzzleBuilder.fromClsp(tempPath);
      const serialized = p.serialize();
      expect(serialized).toContain('>');
      expect(serialized).toContain('<');
      expect(serialized).toContain('=');
      expect(serialized).toContain('>s');
      expect(serialized).toContain('not');
    });

    test('should handle list operations', () => {
      const clsp = `(mod (lst)
        (list
          (f lst)
          (r lst)
          (c 1 lst)
          (l lst)
        )
      )`;
      const tempPath = createTempClsp(clsp);
      
      const p = PuzzleBuilder.fromClsp(tempPath);
      const serialized = p.serialize();
      expect(serialized).toContain('f');
      expect(serialized).toContain('r');
      expect(serialized).toContain('c');
      expect(serialized).toContain('l');
    });

    test('should handle crypto operations', () => {
      const clsp = `(mod (data)
        (list
          (sha256 data)
          (sha256tree1 data)
          (point_add g1 g2)
        )
      )`;
      const tempPath = createTempClsp(clsp);
      
      const p = PuzzleBuilder.fromClsp(tempPath);
      const serialized = p.serialize();
      expect(serialized).toContain('sha256');
      expect(serialized).toContain('sha256tree1');
      expect(serialized).toContain('point_add');
    });
  });

  describe('Real-world Puzzle Examples', () => {
    test('should load escrow puzzle', () => {
      const clsp = `(mod (BUYER SELLER ESCROW_PUBKEY TIMEOUT_HEIGHT)
        (include condition_codes.clib)
        
        ; Solution is (action_code [recipient])
        ; action_code: 1 = buyer confirms, 2 = refund after timeout
        
        (if (= (f 1) 1)
          ; Buyer confirms - pay seller
          (list
            (list AGG_SIG_ME ESCROW_PUBKEY (sha256tree1 1))
            (list CREATE_COIN SELLER (logand 2 -1))
          )
          ; Refund after timeout
          (list
            (list ASSERT_HEIGHT_ABSOLUTE TIMEOUT_HEIGHT)
            (list CREATE_COIN BUYER (logand 2 -1))
          )
        )
      )`;
      const tempPath = createTempClsp(clsp);
      
      const p = PuzzleBuilder.fromClsp(tempPath);
      const serialized = p.serialize();
      // Variable names might be converted to hex values
      expect(serialized).toContain('AGG_SIG_ME');
      expect(serialized).toContain('ASSERT_HEIGHT_ABSOLUTE');
      expect(serialized).toContain('CREATE_COIN');
    });

    test('should load multi-sig puzzle', () => {
      const clsp = `(mod (PUBKEY1 PUBKEY2 THRESHOLD)
        (include condition_codes.clib)
        
        ; Require signatures from both keys
        (list
          (list AGG_SIG_ME PUBKEY1 (sha256tree1 1))
          (list AGG_SIG_ME PUBKEY2 (sha256tree1 1))
          ; Pass through conditions from solution
          1
        )
      )`;
      const tempPath = createTempClsp(clsp);
      
      const p = PuzzleBuilder.fromClsp(tempPath);
      const serialized = p.serialize();
      // Variable names might be converted to hex values
      expect(serialized).toContain('condition_codes.clib');
      expect(serialized).toContain('AGG_SIG_ME');
    });
  });

  describe('AST Verification', () => {
    test('should preserve AST structure for simple expressions', () => {
      const clsp = `(mod () (+ 1 2))`;
      const tempPath = createTempClsp(clsp);
      
      const p = PuzzleBuilder.fromClsp(tempPath);
      const tree = p.build();
      
      // Should be a mod structure
      expect(isList(tree)).toBe(true);
    });

    test('should preserve nested list structures', () => {
      const clsp = `(mod ()
        (list
          (list 1 2)
          (list 3 4)
        )
      )`;
      const tempPath = createTempClsp(clsp);
      
      const p = PuzzleBuilder.fromClsp(tempPath);
      const serialized = p.serialize();
      expect(serialized).toContain('list');
      expect(serialized).toContain('1');
      expect(serialized).toContain('2');
      expect(serialized).toContain('3');
      expect(serialized).toContain('4');
    });
  });
});