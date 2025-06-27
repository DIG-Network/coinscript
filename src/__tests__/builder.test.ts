/**
 * PuzzleBuilder Tests
 * 
 * Comprehensive tests for the PuzzleBuilder class
 */

import { 
  PuzzleBuilder, 
  puzzle, 
  variable,
  isList
} from '../index';

describe('PuzzleBuilder', () => {
  const testAddress = '0x' + 'a'.repeat(64);
  const testPubkey = '0x' + 'b'.repeat(96);

  describe('Core Builder Methods', () => {
    test('should create empty puzzle', () => {
      const p = new PuzzleBuilder();
      const built = p.build();
      expect(built).toBeDefined();
      expect(built.type).toBeDefined();
    });

    test('should support method chaining', () => {
      const p = puzzle()
        .createCoin(testAddress, 100)
        .reserveFee(10)
        .requireSignature(testPubkey);
      
      expect(p).toBeInstanceOf(PuzzleBuilder);
    });

    test('should handle parameters', () => {
      const p = puzzle()
        .withCurriedParams({ 
          PUBKEY: testPubkey,
          AMOUNT: 1000 
        })
        .withSolutionParams('recipient', 'conditions');
      
      const serialized = p.serialize();
      expect(serialized).toContain('PUBKEY');
      expect(serialized).toContain('AMOUNT');
      expect(serialized).toContain('recipient');
      expect(serialized).toContain('conditions');
    });

    test('should reference parameters correctly', () => {
      const p = puzzle()
        .withSolutionParams('amount')
        .createCoin(testAddress, puzzle().param('amount'));
      
      const serialized = p.serialize();
      expect(serialized).toContain('amount');
    });
  });

  describe('Conditions', () => {
    test('should create spend conditions', () => {
      const p = puzzle()
        .createCoin(testAddress, 100)
        .reserveFee(10)
        .assertMyCoinId(testAddress);
      
      const built = p.build();
      expect(isList(built)).toBe(true);
    });

    test('should create time conditions', () => {
      const p = puzzle()
        .requireAfterSeconds(3600)
        .requireBeforeSeconds(7200)
        .requireAfterHeight(1000000)
        .requireBeforeHeight(2000000);
      
      const built = p.build();
      expect(isList(built)).toBe(true);
    });

    test('should create announcement conditions', () => {
      const p = puzzle()
        .createAnnouncement('hello')
        .assertAnnouncement(testAddress);
      
      const built = p.build();
      expect(isList(built)).toBe(true);
    });

    test('should create signature conditions', () => {
      const p = puzzle()
        .requireSignature(testPubkey)
        .requireSignature(testPubkey, variable('custom message'));
      
      const built = p.build();
      expect(isList(built)).toBe(true);
    });
  });

  describe('Control Flow', () => {
    test('should handle if/then/else', () => {
      const p = puzzle()
        .withSolutionParams('choice')
        .if(variable('choice').equals(1))
          .then(b => {
            b.createCoin(testAddress, 100);
          })
          .else(b => {
            b.createCoin(testAddress, 200);
          });
      
      const serialized = p.serialize();
      expect(serialized).toContain('if');
    });

    test('should handle nested conditions', () => {
      const p = puzzle()
        .withSolutionParams('a', 'b')
        .if(variable('a').greaterThan(0))
          .then(b => {
            b.if(variable('b').greaterThan(0))
              .then(b2 => {
                b2.createCoin(testAddress, 100);
              })
              .else(b2 => {
                b2.createCoin(testAddress, 50);
              });
          })
          .else(b => {
            b.fail();
          });
      
      const built = p.build();
      expect(isList(built)).toBe(true);
    });

    test('should handle assert', () => {
      const p = puzzle()
        .withSolutionParams('value')
        .if(variable('value').greaterThan(0))
          .then(b => {
            b.createCoin(testAddress, variable('value'));
          })
          .else(b => {
            b.fail('Value must be positive');
          });
      
      const built = p.build();
      expect(isList(built)).toBe(true);
    });
  });

  describe('Comments and Documentation', () => {
    test('should add inline comments', () => {
      const p = puzzle()
        .comment('This creates a payment')
        .createCoin(testAddress, 100)
        .comment('This reserves a fee')
        .reserveFee(10);
      
      const serialized = p.serialize({ indent: true });
      expect(serialized).toContain('This creates a payment');
      expect(serialized).toContain('This reserves a fee');
    });

    test('should add block comments', () => {
      const p = puzzle()
        .blockComment('This is a payment puzzle')
        .blockComment('It sends coins to an address')
        .createCoin(testAddress, 100);
      
      const serialized = p.serialize({ indent: true });
      expect(serialized).toContain('This is a payment puzzle');
      expect(serialized).toContain('It sends coins to an address');
    });
  });

  describe('Include Directives', () => {
    test('should include standard libraries', () => {
      const p = puzzle()
        .includeConditionCodes()
        .includeCurryAndTreehash()
        .includeCatTruths()
        .includeUtilityMacros();
      
      const serialized = p.serialize();
      expect(serialized).toContain('include');
    });

    test('should include custom files', () => {
      const p = puzzle()
        .include('custom.clib');
      
      const serialized = p.serialize();
      expect(serialized).toContain('include custom.clib');
    });
  });

  describe('Advanced Features', () => {
    test('should support repeat/unroll', () => {
      const p = puzzle()
        .repeat(3, (i, b) => {
          b.createCoin(testAddress, 100 * (i + 1));
        });
      
      const built = p.build();
      expect(isList(built)).toBe(true);
    });

    test('should support forEach', () => {
      const addresses = [
        '0x' + '1'.repeat(64),
        '0x' + '2'.repeat(64),
        '0x' + '3'.repeat(64)
      ];
      
      const p = puzzle()
        .forEach(addresses, (addr, _i, b) => {
          b.createCoin(addr, 100);
        });
      
      const built = p.build();
      expect(isList(built)).toBe(true);
    });

    test('should support merge', () => {
      const p1 = puzzle().createCoin(testAddress, 100);
      const p2 = puzzle().reserveFee(10);
      
      const merged = puzzle()
        .merge(p1)
        .merge(p2);
      
      const built = merged.build();
      expect(isList(built)).toBe(true);
    });

    test('should support wrap', () => {
      const inner = puzzle().createCoin(testAddress, 100);
      const wrapped = inner.wrap(tree => ({
        type: 'list',
        items: [
          { type: 'atom', value: 'wrapper' },
          tree
        ]
      }));
      
      const built = wrapped.build();
      expect(isList(built)).toBe(true);
    });
  });

  describe('Serialization', () => {
    test('should serialize to compact format', () => {
      const p = puzzle()
        .withCurriedParams({ PUBKEY: testPubkey })
        .requireSignature(testPubkey);
      
      const compact = p.serialize();
      expect(compact).not.toContain('\n');
      expect(compact).toContain('mod');
    });

    test('should serialize to indented format', () => {
      const p = puzzle()
        .withCurriedParams({ PUBKEY: testPubkey })
        .requireSignature(testPubkey);
      
      const indented = p.serialize({ indent: true });
      expect(indented).toContain('\n');
      expect(indented).toContain('  ');
    });

    test('should calculate mod hash', () => {
      const p = puzzle().payToConditions();
      const hash = p.toModHash();
      
      expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
      expect(hash.length).toBe(66); // 0x + 64 hex chars
    });
  });

  describe('Standard Patterns', () => {
    test('should create pay to conditions', () => {
      const p = puzzle().payToConditions();
      const serialized = p.serialize();
      expect(serialized).toContain('mod');
      expect(serialized).toContain('conditions');
    });

    test('should create pay to public key', () => {
      const p = puzzle().payToPublicKey(testPubkey);
      const serialized = p.serialize();
      expect(serialized).toContain('mod');
      expect(serialized).toContain('PUBKEY');
    });

    test('should create delegated puzzle', () => {
      const p = puzzle()
        .withSolutionParams('delegated_puzzle', 'delegated_solution')
        .delegatedPuzzle();
      
      const serialized = p.serialize();
      expect(serialized).toContain('mod');
    });

    test('should return conditions', () => {
      const p = puzzle()
        .withSolutionParams('conditions')
        .returnConditions();
      
      const serialized = p.serialize();
      expect(serialized).toContain('conditions');
    });
  });

  describe('Error Handling', () => {
    test('should handle fail condition', () => {
      const p = puzzle()
        .withSolutionParams('should_fail')
        .if(variable('should_fail'))
          .then(b => {
            b.fail();
          })
          .else(b => {
            b.createCoin(testAddress, 100);
          });
      
      const built = p.build();
      expect(isList(built)).toBe(true);
    });

    test('should handle empty puzzle', () => {
      const p = puzzle();
      const built = p.build();
      expect(built).toBeDefined();
    });
  });

  describe('noMod Option', () => {
    test('should create puzzle without mod wrapper', () => {
      const p = puzzle()
        .noMod()
        .createCoin(testAddress, 100);
      
      const serialized = p.serialize();
      expect(serialized).not.toContain('mod');
    });
  });
}); 