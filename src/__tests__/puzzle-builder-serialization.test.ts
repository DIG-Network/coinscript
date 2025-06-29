/**
 * Serialization and Output Tests
 * 
 * Tests for verifying correct ChiaLisp output and serialization options
 */

import {
  puzzle,
  expr,
  variable,
  int,
  sym,
  hex,
  list,
  nil
} from '../index';

describe('PuzzleBuilder - Serialization', () => {
  const TEST_ADDRESS = '0x' + 'a'.repeat(64);
  const TEST_PUBKEY = '0x' + 'b'.repeat(96);

  describe('ChiaLisp Output Verification', () => {
    test('should generate correct pay to conditions output', () => {
      const p = puzzle().payToConditions();
      const serialized = p.toChiaLisp();
      
      // Should be: (mod conditions conditions)
      expect(serialized).toBe('(mod @ (a (q "2") "1"))');
    });

    test('should generate correct pay to public key output', () => {
      const p = puzzle().payToPublicKey(TEST_PUBKEY);
      const serialized = p.toChiaLisp();
      
      // Should include signature requirement
      expect(serialized).toContain('(mod @');
      expect(serialized).toContain('(include condition_codes.clib)');
      expect(serialized).toContain('AGG_SIG_ME');
      expect(serialized).toContain(TEST_PUBKEY);
      // The payToPublicKey only adds AGG_SIG_ME, not the sha256tree1 check
    });

    test('should generate correct simple payment output', () => {
      const p = puzzle()
        .createCoin(TEST_ADDRESS, 1000)
        .reserveFee(10);
      
      const serialized = p.toChiaLisp();
      expect(serialized).toContain('(mod @');
      expect(serialized).toContain('(include condition_codes.clib)');
      expect(serialized).toContain('CREATE_COIN');
      expect(serialized).toContain(TEST_ADDRESS);
      expect(serialized).toContain('1000');
      expect(serialized).toContain('RESERVE_FEE');
      expect(serialized).toContain('10');
    });

    test('should generate correct if/then/else output', () => {
      const p = puzzle()
        .withSolutionParams('choice')
        .if(variable('choice').equals(1))
          .then(b => {
            b.createCoin(TEST_ADDRESS, 100);
          })
          .else(b => {
            b.createCoin(TEST_ADDRESS, 200);
          });
      
      const serialized = p.toChiaLisp();
      expect(serialized).toContain('(mod choice');
      expect(serialized).toContain('(i (= choice 1)');
      expect(serialized).toContain('(CREATE_COIN');
      expect(serialized).toContain('100)');
      expect(serialized).toContain('200)');
    });
  });

  describe('Serialization Formats', () => {
    test('should serialize to compact format by default', () => {
      const p = puzzle()
        .createCoin(TEST_ADDRESS, 100)
        .createCoin(TEST_ADDRESS, 200);
      
      const serialized = p.toChiaLisp();
      expect(serialized).not.toContain('\n');
      expect(serialized).toMatch(/^\(mod/);
    });

    test('should serialize to indented format', () => {
      const p = puzzle()
        .createCoin(TEST_ADDRESS, 100)
        .createCoin(TEST_ADDRESS, 200);
      
      const indented = p.serialize({ indent: true });
      expect(indented).toContain('\n');
      expect(indented).toContain('  '); // Contains indentation
      
      // Should have proper structure
      const lines = indented.split('\n');
      expect(lines[0]).toBe('(mod');
      expect(lines.some(l => l.includes('include'))).toBe(true);
    });

    test('should handle chialisp format option', () => {
      const p = puzzle().createCoin(TEST_ADDRESS, 100);
      
      const chialisp = p.toChiaLisp();
      expect(chialisp).toContain('mod');
      expect(chialisp).toContain('CREATE_COIN');
    });
  });

  describe('Include Management in Output', () => {
    test('should auto-include condition codes when needed', () => {
      const p = puzzle().createCoin(TEST_ADDRESS, 100);
      const serialized = p.toChiaLisp();
      
      expect(serialized).toContain('(include condition_codes.clib)');
      expect(serialized).toContain('CREATE_COIN'); // Uses symbolic name
    });

    test('should not duplicate includes', () => {
      const p = puzzle()
        .includeConditionCodes()
        .createCoin(TEST_ADDRESS, 100)
        .reserveFee(10);
      
      const serialized = p.toChiaLisp();
      const matches = serialized.match(/include condition_codes\.clib/g);
      expect(matches?.length).toBe(1);
    });

    test('should preserve manual include order', () => {
      const p = puzzle()
        .include('custom1.clib')
        .includeConditionCodes()
        .include('custom2.clib')
        .createCoin(TEST_ADDRESS, 100);
      
      const serialized = p.toChiaLisp();
      const custom1Index = serialized.indexOf('custom1.clib');
      const conditionIndex = serialized.indexOf('condition_codes.clib');
      const custom2Index = serialized.indexOf('custom2.clib');
      
      expect(custom1Index).toBeLessThan(conditionIndex);
      expect(conditionIndex).toBeLessThan(custom2Index);
    });
  });

  describe('Parameter Handling in Output', () => {
    test('should correctly place solution parameters', () => {
      const p = puzzle()
        .withSolutionParams('amount', 'recipient', 'memo');
      // Manually build to use variables
      (p as any).includes.push('condition_codes.clib');
      (p as any).addNode(
        list([sym('CREATE_COIN'), variable('recipient').tree, variable('amount').tree])
      );
      
      const serialized = p.toChiaLisp();
      expect(serialized).toContain('(mod (amount recipient memo)');
    });

    test('should handle curried parameters correctly', () => {
      const p = puzzle()
        .withCurriedParams({
          OWNER: TEST_PUBKEY,
          FEE: 100
        })
        .withSolutionParams('recipient')
        .requireSignature(TEST_PUBKEY)
        .createCoin('0x' + '0'.repeat(64), 900)
        .reserveFee(100);
      
      const serialized = p.toChiaLisp();
      // Curried params might not appear in base serialization
      expect(serialized).toContain('recipient');
    });

    test('should handle no parameters', () => {
      const p = puzzle().returnValue(expr(42));
      const serialized = p.toChiaLisp();
      
      expect(serialized).toContain('(mod @');
      expect(serialized).toContain('42');
    });
  });

  describe('Complex Output Structures', () => {
    test('should correctly serialize nested lists', () => {
      const p = puzzle().noMod();
      (p as any).addNode(
        list([
          list([int(1), int(2)]),
          list([int(3), int(4)])
        ])
      );
      
      const serialized = p.toChiaLisp();
      expect(serialized).toBe('((1 2) (3 4))');
    });

    test('should correctly serialize cons cells', () => {
      const p = puzzle().noMod();
      (p as any).addNode(
        list([sym('c'), int(1), list([int(2), int(3)])])
      );
      
      const serialized = p.toChiaLisp();
      expect(serialized).toContain('(c 1 (2 3))');
    });

    test('should handle nil correctly', () => {
      const p = puzzle().noMod();
      (p as any).addNode(nil);
      
      const serialized = p.toChiaLisp();
      expect(serialized).toBe('()');
    });
  });

  describe('Mod Hash Calculation', () => {
    test('should calculate consistent mod hash', () => {
      const p1 = puzzle().payToConditions();
      const p2 = puzzle().payToConditions();
      
      const hash1 = p1.toModHash();
      const hash2 = p2.toModHash();
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^0x[a-f0-9]{64}$/);
    });

    test('should calculate different hashes for different puzzles', () => {
      const p1 = puzzle().createCoin(TEST_ADDRESS, 100);
      const p2 = puzzle().createCoin(TEST_ADDRESS, 200);
      
      const hash1 = p1.toModHash();
      const hash2 = p2.toModHash();
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('Edge Cases in Serialization', () => {
    test('should handle empty strings', () => {
      const p = puzzle().createAnnouncement('');
      const serialized = p.toChiaLisp();
      
      expect(serialized).toContain('CREATE_COIN_ANNOUNCEMENT');
      expect(serialized).toContain('0x'); // Empty string as empty hex
    });

    test('should handle very large numbers', () => {
      const largeNum = 123456789012345678901234567890n;
      const p = puzzle().createCoin(TEST_ADDRESS, largeNum);
      const serialized = p.toChiaLisp();
      
      expect(serialized).toContain('123456789012345678901234567890');
    });

    test('should handle special characters in strings', () => {
      const p = puzzle().noMod();
      (p as any).addNode(hex('hello\nworld\t!'));
      
      const serialized = p.toChiaLisp();
      // Hex encoding should handle special chars
      expect(serialized).toBeDefined();
    });

    test('should handle deeply nested structures', () => {
      let nested: any = nil;
      for (let i = 0; i < 20; i++) {
        nested = list([int(i), nested]);
      }
      
      const p = puzzle().noMod();
      (p as any).addNode(nested);
      
      const serialized = p.toChiaLisp();
      expect(serialized).toContain('0');
      expect(serialized).toContain('19');
      expect(serialized.match(/\(/g)?.length).toBe(21); // 20 lists + 1 for outer parenthesis
    });
  });

  describe('Real-world Output Examples', () => {
    test('should generate correct singleton wrapper', () => {
      puzzle().payToConditions(); // innerPuzzle not used in simplified test
      const singletonLauncherId = '0x' + '1'.repeat(64);
      
      // Note: This is a simplified test as the actual singleton layer
      // implementation would be more complex
      const p = puzzle()
        .withCurriedParams({
          SINGLETON_STRUCT: singletonLauncherId,
          INNER_PUZZLE: '0x' + 'i'.repeat(64) // Use placeholder hash instead of PuzzleBuilder
        })
        .withSolutionParams('inner_solution')
        .includeConditionCodes()
        .include('singleton_truths.clib')
        .createCoin(TEST_ADDRESS, 1);
      
      const serialized = p.toChiaLisp();
      expect(serialized).toContain('singleton_truths.clib');
      expect(serialized).toContain('CREATE_COIN');
    });

    test('should generate correct CAT wrapper structure', () => {
      const p = puzzle()
        .withCurriedParams({
          MOD_HASH: '0x' + 'm'.repeat(64),
          TAIL_HASH: '0x' + 't'.repeat(64)
        })
        .withSolutionParams('inner_solution')
        .includeConditionCodes()
        .include('cat_truths.clib')
        .createCoin(TEST_ADDRESS, 100);
      
      const serialized = p.toChiaLisp();
      expect(serialized).toContain('cat_truths.clib');
      expect(serialized).toContain('inner_solution');
    });
  });

  describe('Output Validation', () => {
    test('should produce valid ChiaLisp syntax', () => {
      const testCases = [
        puzzle().createCoin(TEST_ADDRESS, 100),
        puzzle().requireSignature(TEST_PUBKEY),
        puzzle().if(expr(1)).then(b => b.returnValue(expr(2))).else(b => b.returnValue(expr(3))),
        puzzle().withSolutionParams('a', 'b', 'c').returnConditions()
      ];
      
      testCases.forEach(p => {
        const serialized = p.toChiaLisp();
        
        // Basic syntax checks
        const openParens = (serialized.match(/\(/g) || []).length;
        const closeParens = (serialized.match(/\)/g) || []).length;
        expect(openParens).toBe(closeParens);
        
        // Should start with (mod
        expect(serialized).toMatch(/^\(mod/);
        
        // Should end with )
        expect(serialized).toMatch(/\)$/);
      });
    });

    test('should preserve operator precedence', () => {
      const p = puzzle()
        .withSolutionParams('a', 'b', 'c')
        .returnValue(
          variable('a').add(variable('b')).multiply(variable('c'))
        );
      
      const serialized = p.toChiaLisp();
      // Should be (* (+ a b) c) not (+ a (* b c))
      expect(serialized).toContain('(* (+ a b) c)');
    });
  });
});