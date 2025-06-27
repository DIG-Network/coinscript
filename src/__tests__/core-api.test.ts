/**
 * Core API Tests
 * 
 * Tests for core functionality that all examples depend on
 */

import { 
  PuzzleBuilder,
  puzzle,
  variable,
  expr,
  isList,
  isAtom
} from '../index';

describe('Core API', () => {
  const testAddress = '0x' + 'a'.repeat(64);
  const testPubkey = '0x' + 'b'.repeat(96);

  describe('PuzzleBuilder Basics', () => {
    test('should create and build puzzles', () => {
      const p = new PuzzleBuilder();
      const built = p.build();
      expect(built).toBeDefined();
      expect(built.type).toBeDefined();
    });

    test('should serialize puzzles', () => {
      const p = puzzle()
        .createCoin(testAddress, 100);
      
      const serialized = p.serialize();
      expect(serialized).toContain('mod');
      expect(serialized).toContain('51'); // CREATE_COIN opcode
    });

    test('should calculate puzzle hash', () => {
      const p = puzzle().payToConditions();
      const hash = p.toModHash();
      
      expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
    });
  });

  describe('Parameters', () => {
    test('should handle curried parameters', () => {
      const p = puzzle()
        .withCurriedParams({ 
          PUBKEY: testPubkey,
          AMOUNT: 1000 
        })
        .requireSignature(testPubkey);
      
      const serialized = p.serialize();
      expect(serialized).toContain('PUBKEY');
      expect(serialized).toContain('AMOUNT');
    });

    test('should handle solution parameters', () => {
      const p = puzzle()
        .withSolutionParams('recipient', 'amount')
        .createCoin(testAddress, 100);
      
      const serialized = p.serialize();
      expect(serialized).toContain('recipient');
      expect(serialized).toContain('amount');
    });

    test('should reference parameters with param()', () => {
      const p = puzzle()
        .withSolutionParams('amount')
        .createCoin(testAddress, puzzle().param('amount'));
      
      const serialized = p.serialize();
      expect(serialized).toContain('amount');
    });
  });

  describe('Basic Conditions', () => {
    test('should create coin', () => {
      const p = puzzle()
        .createCoin(testAddress, 100);
      
      const built = p.build();
      expect(isList(built)).toBe(true);
    });

    test('should reserve fee', () => {
      const p = puzzle()
        .reserveFee(10);
      
      const built = p.build();
      expect(isList(built)).toBe(true);
    });

    test('should require signature', () => {
      const p = puzzle()
        .requireSignature(testPubkey);
      
      const built = p.build();
      expect(isList(built)).toBe(true);
    });

    test('should create announcements', () => {
      const p = puzzle()
        .createAnnouncement('hello world');
      
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
  });

  describe('Comments', () => {
    test('should add comments in indented mode', () => {
      const p = puzzle()
        .comment('This is a payment')
        .createCoin(testAddress, 100);
      
      const indented = p.serialize({ indent: true });
      expect(indented).toContain('This is a payment');
      
      const compact = p.serialize();
      expect(compact).not.toContain('This is a payment');
    });
  });

  describe('Standard Patterns', () => {
    test('should create pay to conditions', () => {
      const p = puzzle().payToConditions();
      const serialized = p.serialize();
      expect(serialized).toContain('conditions');
      expect(serialized).toContain('@');
    });

    test('should create pay to public key', () => {
      const p = puzzle().payToPublicKey(testPubkey);
      const serialized = p.serialize();
      expect(serialized).toContain('PUBKEY');
      expect(serialized).toContain('50'); // AGG_SIG_ME
    });
  });

  describe('Expression Operations', () => {
    test('should create expressions', () => {
      const e = expr(42);
      expect(e.tree).toBeDefined();
      if (isAtom(e.tree)) {
        expect(e.tree.value).toBe('42');
      }
    });

    test('should create variables', () => {
      const v = variable('myVar');
      expect(v.tree).toBeDefined();
      if (isAtom(v.tree)) {
        expect(v.tree.value).toBe('myVar');
      }
    });

    test('should support arithmetic operations', () => {
      const a = expr(10);
      const b = expr(5);
      
      const sum = a.add(b);
      expect(sum.tree.type).toBe('list');
      
      const diff = a.subtract(b);
      expect(diff.tree.type).toBe('list');
    });

    test('should support comparisons', () => {
      const a = expr(10);
      const b = expr(5);
      
      const gt = a.greaterThan(b);
      expect(gt.tree.type).toBe('list');
      
      const eq = a.equals(b);
      expect(eq.tree.type).toBe('list');
    });
  });

  describe('Examples Work', () => {
    test('should build escrow puzzle', () => {
      const escrow = puzzle()
        .withCurriedParams({
          SELLER: testAddress,
          AMOUNT: 1000
        })
        .withSolutionParams('action')
        .if(variable('action').equals(1))
          .then(b => {
            b.createCoin(testAddress, 1000);
          })
          .else(b => {
            b.requireAfterSeconds(86400);
            b.createCoin(testAddress, 1000);
          });
      
      const built = escrow.build();
      expect(isList(built)).toBe(true);
    });

    test('should build multi-sig puzzle', () => {
      const pubkey1 = '0x' + '1'.repeat(96);
      const pubkey2 = '0x' + '2'.repeat(96);
      
      const multiSig = puzzle()
        .withCurriedParams({
          PUBKEY1: pubkey1,
          PUBKEY2: pubkey2
        })
        .withSolutionParams('conditions')
        .requireSignature(pubkey1)
        .requireSignature(pubkey2)
        .returnConditions();
      
      const built = multiSig.build();
      expect(isList(built)).toBe(true);
    });
  });
}); 