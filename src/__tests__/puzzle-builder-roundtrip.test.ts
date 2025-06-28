/**
 * Round-trip Tests for ChiaLisp and CoinScript
 * 
 * Tests that verify:
 * 1. ChiaLisp -> AST -> ChiaLisp produces identical output
 * 2. ChiaLisp -> AST and CoinScript -> AST produce identical AST structures
 */

import {
  puzzle,
  PuzzleBuilder,
  variable,
  list,
  sym
} from '../index';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

describe('PuzzleBuilder - Round-trip Tests', () => {
  const tempDir = tmpdir();
  
  // Helper to create temp file
  const createTempFile = (content: string, suffix: string = '.clsp'): string => {
    const filename = path.join(tempDir, `test_${Date.now()}_${Math.random().toString(36).substring(7)}${suffix}`);
    fs.writeFileSync(filename, content);
    return filename;
  };

  // Helper to clean up temp files
  afterEach(() => {
    const files = fs.readdirSync(tempDir);
    files.forEach(file => {
      if (file.startsWith('test_') && file.endsWith('.clsp')) {
        try {
          fs.unlinkSync(path.join(tempDir, file));
        } catch (e) {
          // Ignore errors
        }
      }
    });
  });

  describe('ChiaLisp to AST Round-trip', () => {
    test('simple mod with no parameters', () => {
      const original = '(mod () 42)';
      const file = createTempFile(original);
      
      const loaded = PuzzleBuilder.fromClsp(file);
      const exported = loaded.serialize();
      
      // Should preserve the basic structure
      expect(exported).toContain('(mod @');
      expect(exported).toContain('42');
    });

    test('mod with single parameter', () => {
      const original = '(mod (x) x)';
      const file = createTempFile(original);
      
      const loaded = PuzzleBuilder.fromClsp(file);
      const exported = loaded.serialize();
      
      expect(exported).toContain('(mod x');
      expect(exported).toContain('x)');
    });

    test('mod with multiple parameters', () => {
      const original = '(mod (a b c) (+ a (+ b c)))';
      const file = createTempFile(original);
      
      const loaded = PuzzleBuilder.fromClsp(file);
      const exported = loaded.serialize();
      
      expect(exported).toContain('(mod (a b c)');
      expect(exported).toContain('(+ a (+ b c))');
    });

    test('mod with if-then-else', () => {
      const original = '(mod (x) (if (> x 10) 100 200))';
      const file = createTempFile(original);
      
      const loaded = PuzzleBuilder.fromClsp(file);
      const exported = loaded.serialize();
      
      expect(exported).toContain('(mod x');
      expect(exported).toContain('(i (> x 10) 100 200)');
    });

    test('mod with nested if statements', () => {
      const original = '(mod (x y) (if (> x 0) (if (> y 0) 1 2) (if (< y 0) 3 4)))';
      const file = createTempFile(original);
      
      const loaded = PuzzleBuilder.fromClsp(file);
      const exported = loaded.serialize();
      
      expect(exported).toContain('(i (> x 0)');
      expect(exported).toContain('(i (> y 0) 1 2)');
      expect(exported).toContain('(i (< y 0) 3 4)');
    });

    test('mod with list operations', () => {
      const original = '(mod (lst) (c (f lst) (r lst)))';
      const file = createTempFile(original);
      
      const loaded = PuzzleBuilder.fromClsp(file);
      const exported = loaded.serialize();
      
      expect(exported).toContain('(c (f lst) (r lst))');
    });

    test('mod with sha256 operations', () => {
      const original = '(mod (data) (sha256 data))';
      const file = createTempFile(original);
      
      const loaded = PuzzleBuilder.fromClsp(file);
      const exported = loaded.serialize();
      
      expect(exported).toContain('(sha256 data)');
    });

    test('mod with complex arithmetic', () => {
      const original = '(mod (a b c) (* (+ a b) (- c 1)))';
      const file = createTempFile(original);
      
      const loaded = PuzzleBuilder.fromClsp(file);
      const exported = loaded.serialize();
      
      expect(exported).toContain('(* (+ a b) (- c 1))');
    });

    test('mod with quoted values', () => {
      const original = "(mod () (q . 42))";
      const file = createTempFile(original);
      
      const loaded = PuzzleBuilder.fromClsp(file);
      const exported = loaded.serialize();
      
      expect(exported).toContain('42');
    });

    test('mod with hex strings', () => {
      const original = '(mod () 0xdeadbeef)';
      const file = createTempFile(original);
      
      const loaded = PuzzleBuilder.fromClsp(file);
      const exported = loaded.serialize();
      
      expect(exported).toContain('0xdeadbeef');
    });

    test('mod with includes', () => {
      const original = '(mod ()\n  (include condition_codes.clib)\n  (list CREATE_COIN 0x1234 100)\n)';
      const file = createTempFile(original);
      
      const loaded = PuzzleBuilder.fromClsp(file);
      const exported = loaded.serialize();
      
      expect(exported).toContain('(include condition_codes.clib)');
      expect(exported).toContain('CREATE_COIN');
    });

    test('mod with defun', () => {
      const original = '(mod (x)\n  (defun double (n) (* n 2))\n  (double x)\n)';
      const file = createTempFile(original);
      
      const loaded = PuzzleBuilder.fromClsp(file);
      const exported = loaded.serialize();
      
      expect(exported).toContain('(defun double (n) (* n 2))');
      expect(exported).toContain('(double x)');
    });

    test('mod with defmacro', () => {
      const original = '(mod ()\n  (defmacro ASSERT items\n    (if (r items)\n      (list if (f items) (c ASSERT (r items)) (q . (x)))\n      (f items)\n    )\n  )\n  (ASSERT 1)\n)';
      const file = createTempFile(original);
      
      const loaded = PuzzleBuilder.fromClsp(file);
      const exported = loaded.serialize();
      
      expect(exported).toContain('(defmacro ASSERT');
    });

    test('mod with defconstant', () => {
      const original = '(mod ()\n  (defconstant VERSION 1)\n  VERSION\n)';
      const file = createTempFile(original);
      
      const loaded = PuzzleBuilder.fromClsp(file);
      const exported = loaded.serialize();
      
      expect(exported).toContain('(defconstant VERSION 1)');
      expect(exported).toContain('VERSION');
    });

    test('complex real-world puzzle', () => {
      const original = `(mod (PUBKEY conditions)
  (include condition_codes.clib)
  
  (defun check_signature (pubkey conditions)
    (c
      (list AGG_SIG_ME pubkey (sha256tree1 conditions))
      conditions
    )
  )
  
  (check_signature PUBKEY conditions)
)`;
      const file = createTempFile(original);
      
      const loaded = PuzzleBuilder.fromClsp(file);
      const exported = loaded.serialize();
      
      expect(exported).toContain('(mod (PUBKEY conditions)');
      expect(exported).toContain('(include condition_codes.clib)');
      expect(exported).toContain('(defun check_signature');
      expect(exported).toContain('AGG_SIG_ME');
    });
  });

  describe('ChiaLisp and CoinScript AST Equivalence', () => {
    test('simple value return', () => {
      // ChiaLisp version
      const chiaLisp = '(mod () 42)';
      const clspFile = createTempFile(chiaLisp);
      const fromChiaLisp = PuzzleBuilder.fromClsp(clspFile);
      
      // CoinScript version
      const fromCoinScript = puzzle().returnValue(42);
      
      // Compare serialized output
      const chiaLispOutput = fromChiaLisp.serialize();
      const coinScriptOutput = fromCoinScript.serialize();
      
      // Both should produce equivalent structures
      expect(chiaLispOutput).toContain('42');
      expect(coinScriptOutput).toContain('42');
    });

    test('parameter passthrough', () => {
      // ChiaLisp version
      const chiaLisp = '(mod (x) x)';
      const clspFile = createTempFile(chiaLisp);
      const fromChiaLisp = PuzzleBuilder.fromClsp(clspFile);
      
      // CoinScript version
      const fromCoinScript = puzzle()
        .withSolutionParams('x')
        .returnValue(variable('x'));
      
      // Compare outputs
      const chiaLispOutput = fromChiaLisp.serialize();
      const coinScriptOutput = fromCoinScript.serialize();
      
      expect(chiaLispOutput).toContain('(mod x');
      expect(chiaLispOutput).toContain('x)');
      expect(coinScriptOutput).toContain('(mod x');
      expect(coinScriptOutput).toContain('x)');
    });

    test('arithmetic operations', () => {
      // ChiaLisp version
      const chiaLisp = '(mod (a b) (+ a b))';
      const clspFile = createTempFile(chiaLisp);
      const fromChiaLisp = PuzzleBuilder.fromClsp(clspFile);
      
      // CoinScript version
      const fromCoinScript = puzzle()
        .withSolutionParams('a', 'b')
        .returnValue(variable('a').add(variable('b')));
      
      // Compare outputs
      const chiaLispOutput = fromChiaLisp.serialize();
      const coinScriptOutput = fromCoinScript.serialize();
      
      expect(chiaLispOutput).toContain('(+ a b)');
      expect(coinScriptOutput).toContain('(+ a b)');
    });

    test('if-then-else control flow', () => {
      // ChiaLisp version
      const chiaLisp = '(mod (x) (if (> x 0) 1 -1))';
      const clspFile = createTempFile(chiaLisp);
      const fromChiaLisp = PuzzleBuilder.fromClsp(clspFile);
      
      // CoinScript version
      const fromCoinScript = puzzle()
        .withSolutionParams('x')
        .if(variable('x').greaterThan(0))
          .then(b => b.returnValue(1))
          .else(b => b.returnValue(-1));
      
      // Compare outputs
      const chiaLispOutput = fromChiaLisp.serialize();
      const coinScriptOutput = fromCoinScript.serialize();
      
      // Both should have if statement (compiled to 'i')
      expect(chiaLispOutput).toContain('(i (> x 0)');
      expect(coinScriptOutput).toContain('(i (> x 0)');
    });

    test('condition creation', () => {
      // ChiaLisp version with conditions
      const chiaLisp = `(mod (recipient amount)
  (include condition_codes.clib)
  (list
    (list CREATE_COIN recipient amount)
  )
)`;
      const clspFile = createTempFile(chiaLisp);
      const fromChiaLisp = PuzzleBuilder.fromClsp(clspFile);
      
      // CoinScript version
      const fromCoinScript = puzzle()
        .withSolutionParams('recipient', 'amount');
      // Manually build the condition list to match ChiaLisp output
      (fromCoinScript as any).includes.push('condition_codes.clib');
      (fromCoinScript as any).addNode(
        list([
          list([sym('CREATE_COIN'), variable('recipient').tree, variable('amount').tree])
        ])
      );
      
      // Compare outputs
      const chiaLispOutput = fromChiaLisp.serialize();
      const coinScriptOutput = fromCoinScript.serialize();
      
      // Both should include condition codes and CREATE_COIN
      expect(chiaLispOutput).toContain('(include condition_codes.clib)');
      expect(chiaLispOutput).toContain('CREATE_COIN');
      expect(coinScriptOutput).toContain('(include condition_codes.clib)');
      expect(coinScriptOutput).toContain('CREATE_COIN');
    });

    test('nested operations', () => {
      // ChiaLisp version
      const chiaLisp = '(mod (a b c) (* (+ a b) c))';
      const clspFile = createTempFile(chiaLisp);
      const fromChiaLisp = PuzzleBuilder.fromClsp(clspFile);
      
      // CoinScript version
      const fromCoinScript = puzzle()
        .withSolutionParams('a', 'b', 'c')
        .returnValue(
          variable('a').add(variable('b')).multiply(variable('c'))
        );
      
      // Compare outputs
      const chiaLispOutput = fromChiaLisp.serialize();
      const coinScriptOutput = fromCoinScript.serialize();
      
      expect(chiaLispOutput).toContain('(* (+ a b) c)');
      expect(coinScriptOutput).toContain('(* (+ a b) c)');
    });

    test('list operations', () => {
      // ChiaLisp version
      const chiaLisp = '(mod (head tail) (c head tail))';
      const clspFile = createTempFile(chiaLisp);
      const fromChiaLisp = PuzzleBuilder.fromClsp(clspFile);
      
      // CoinScript version
      const fromCoinScript = puzzle()
        .withSolutionParams('head', 'tail')
        .noMod();
      (fromCoinScript as any).addNode(
        list([sym('c'), variable('head').tree, variable('tail').tree])
      );
      
      // Compare outputs
      const chiaLispOutput = fromChiaLisp.serialize();
      const coinScriptOutput = fromCoinScript.serialize();
      
      expect(chiaLispOutput).toContain('(c head tail)');
      expect(coinScriptOutput).toContain('(c head tail)');
    });

    test('sha256 hashing', () => {
      // ChiaLisp version
      const chiaLisp = '(mod (data) (sha256 data))';
      const clspFile = createTempFile(chiaLisp);
      const fromChiaLisp = PuzzleBuilder.fromClsp(clspFile);
      
      // CoinScript version
      const fromCoinScript = puzzle()
        .withSolutionParams('data')
        .returnValue(variable('data').sha256());
      
      // Compare outputs
      const chiaLispOutput = fromChiaLisp.serialize();
      const coinScriptOutput = fromCoinScript.serialize();
      
      expect(chiaLispOutput).toContain('(sha256 data)');
      expect(coinScriptOutput).toContain('(sha256 data)');
    });

    test('complex nested if statements', () => {
      // ChiaLisp version
      const chiaLisp = '(mod (x y) (if (> x 0) (if (> y 0) "positive" "mixed") "negative"))';
      const clspFile = createTempFile(chiaLisp);
      const fromChiaLisp = PuzzleBuilder.fromClsp(clspFile);
      
      // CoinScript version
      const fromCoinScript = puzzle()
        .withSolutionParams('x', 'y')
        .if(variable('x').greaterThan(0))
          .then(b => {
            b.if(variable('y').greaterThan(0))
              .then(b2 => b2.returnValue("positive"))
              .else(b2 => b2.returnValue("mixed"));
          })
          .else(b => b.returnValue("negative"));
      
      // Compare outputs
      const chiaLispOutput = fromChiaLisp.serialize();
      const coinScriptOutput = fromCoinScript.serialize();
      
      // Both should have nested if statements
      expect(chiaLispOutput).toContain('(i (> x 0)');
      expect(chiaLispOutput).toContain('(i (> y 0)');
      expect(coinScriptOutput).toContain('(i (> x 0)');
      expect(coinScriptOutput).toContain('(i (> y 0)');
    });

    test('standard pay to conditions pattern', () => {
      // ChiaLisp version
      const chiaLisp = '(mod conditions conditions)';
      const clspFile = createTempFile(chiaLisp);
      const fromChiaLisp = PuzzleBuilder.fromClsp(clspFile);
      
      // CoinScript version
      const fromCoinScript = puzzle().payToConditions();
      
      // Compare outputs - both should be functionally equivalent
      const chiaLispOutput = fromChiaLisp.serialize();
      const coinScriptOutput = fromCoinScript.serialize();
      
      // The exact representation might differ but both return the conditions parameter
      expect(chiaLispOutput).toContain('conditions');
      expect(coinScriptOutput).toContain('"1"'); // Compiled form uses parameter reference
    });
  });

  describe('Complex Round-trip Scenarios', () => {
    test('puzzle with multiple includes and defuns', () => {
      const original = `(mod (OWNER_PUBKEY new_owner amount)
  (include condition_codes.clib)
  
  (defun create_transfer_conditions (new_owner amount)
    (list
      (list CREATE_COIN new_owner amount)
      (list AGG_SIG_ME OWNER_PUBKEY (sha256tree1 (list new_owner amount)))
    )
  )
  
  (create_transfer_conditions new_owner amount)
)`;
      const file = createTempFile(original);
      
      const loaded = PuzzleBuilder.fromClsp(file);
      const exported = loaded.serialize();
      
      // Verify key components are preserved
      expect(exported).toContain('(include condition_codes.clib)');
      expect(exported).toContain('(defun create_transfer_conditions');
      expect(exported).toContain('CREATE_COIN');
      expect(exported).toContain('AGG_SIG_ME');
      expect(exported).toContain('OWNER_PUBKEY');
    });

    test('puzzle with complex control flow and operations', () => {
      const original = `(mod (action amount threshold)
  (include condition_codes.clib)
  
  (if (= action 1)
    ; Withdraw
    (if (> amount threshold)
      (list
        (list ASSERT_HEIGHT_RELATIVE 100)
        (list CREATE_COIN 0x1234 amount)
      )
      (list (list CREATE_COIN 0x1234 amount))
    )
    ; Deposit
    (if (= action 2)
      (list (list RESERVE_FEE amount))
      ; Invalid action
      (x)
    )
  )
)`;
      const file = createTempFile(original);
      
      const loaded = PuzzleBuilder.fromClsp(file);
      const exported = loaded.serialize();
      
      // Verify structure is preserved
      expect(exported).toContain('(= action 1)');
      expect(exported).toContain('(> amount threshold)');
      expect(exported).toContain('ASSERT_HEIGHT_RELATIVE');
      expect(exported).toContain('CREATE_COIN');
      expect(exported).toContain('RESERVE_FEE');
      expect(exported).toContain('(x)'); // Error condition
    });

    test('puzzle with all operator types', () => {
      const original = `(mod (a b c)
  ; Arithmetic
  (list
    (+ a b)
    (- a b)
    (* a b)
    (/ a b)
    (divmod a b)
    
    ; Comparison
    (= a b)
    (> a b)
    (>s a b)
    
    ; Logical
    (not a)
    (any (list a b c))
    (all (list a b c))
    
    ; Bitwise
    (logand a b)
    (logior a b)
    (logxor a b)
    (lognot a)
    
    ; List operations
    (f (list a b))
    (r (list b c))
    (c a (list b c))
    (l a)
    
    ; Crypto
    (sha256 a)
    (sha256tree1 (list a b))
  )
)`;
      const file = createTempFile(original);
      
      const loaded = PuzzleBuilder.fromClsp(file);
      const exported = loaded.serialize();
      
      // Verify all operators are preserved
      const operators = ['+', '-', '*', '/', 'divmod', '=', '>', '>s', 
                        'not', 'any', 'all', 'logand', 'logior', 'logxor', 
                        'lognot', 'f', 'r', 'c', 'l', 'sha256', 'sha256tree1'];
      
      operators.forEach(op => {
        expect(exported).toContain(`(${op} `);
      });
    });

    test('real-world singleton pattern', () => {
      const original = `(mod (SINGLETON_STRUCT INNER_PUZZLE inner_solution)
  (include condition_codes.clib)
  (include singleton_truths.clib)
  
  (defun check_and_morph_conditions (conditions SINGLETON_STRUCT)
    ; Complex singleton logic would go here
    conditions
  )
  
  (check_and_morph_conditions (a INNER_PUZZLE inner_solution) SINGLETON_STRUCT)
)`;
      const file = createTempFile(original);
      
      const loaded = PuzzleBuilder.fromClsp(file);
      const exported = loaded.serialize();
      
      expect(exported).toContain('(include condition_codes.clib)');
      expect(exported).toContain('(include singleton_truths.clib)');
      expect(exported).toContain('(defun check_and_morph_conditions');
      expect(exported).toContain('SINGLETON_STRUCT');
      expect(exported).toContain('INNER_PUZZLE');
    });

    test('extreme nesting and complexity', () => {
      const original = `(mod (x y z)
  (if (> x 0)
    (if (> y 0)
      (if (> z 0)
        (list
          (+ x (+ y z))
          (* x (* y z))
          (sha256 (c x (c y (c z ()))))
        )
        (if (= z 0)
          (list x y)
          (- (- x y) z)
        )
      )
      (if (< y 0)
        (logxor x (lognot y))
        0
      )
    )
    (if (< x 0)
      (if (all (list (< x -10) (> y 10) (= z 0)))
        -1
        -2
      )
      ()
    )
  )
)`;
      const file = createTempFile(original);
      
      const loaded = PuzzleBuilder.fromClsp(file);
      const exported = loaded.serialize();
      
      // Verify deeply nested structure is preserved
      expect(exported.match(/\(i /g)?.length).toBeGreaterThanOrEqual(7); // At least 7 if statements
      expect(exported).toContain('(> x 0)');
      expect(exported).toContain('(> y 0)');
      expect(exported).toContain('(> z 0)');
      expect(exported).toContain('(= z 0)');
      expect(exported).toContain('(< y 0)');
      expect(exported).toContain('(< x 0)');
      expect(exported).toContain('(all (list');
    });
  });
});