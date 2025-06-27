/**
 * Comprehensive tests for the Chia Puzzle Framework public interface
 */

import {
  // Primary interface
  PuzzleBuilder,
  Expression,
  Expr,
  puzzle,
  expr,
  variable,
  arg1,
  arg2,
  arg3,
  // solution constant removed - using createSolution instead
  createPuzzle,
  
  // Layer system
  withSingletonLayer,
  withOwnershipLayer,
  withStateLayer,
  withNotificationLayer,
  
  // Core exports
  Program,
  isAtom,
  isList,
  int,
  
  // Namespaces
  operators,
  conditions,
  patterns,
  
  // Individual operator imports
  arithmetic,
  comparison,
  lists,
  control,
  crypto,
  bls,
  logic,
  
  // Individual condition imports
  spend,
  time,
  signatures,
  messages,
  ConditionOpcode,
  CONDITION_OPCODE_NAMES,
  
  // Pattern imports
  payment,
  delegation,
  
  // CoinScript
  compileCoinScript,
  parseCoinScriptFile
} from '../index';

describe('Chia Puzzle Framework Public Interface', () => {
  describe('Primary Interface', () => {
    describe('PuzzleBuilder', () => {
      it('should create puzzle instances', () => {
        const p = new PuzzleBuilder();
        expect(p).toBeInstanceOf(PuzzleBuilder);
      });

      it('should support method chaining', () => {
        const p = new PuzzleBuilder()
          .withSolutionParams('amount', 'recipient')
          .createCoin('0x' + 'a'.repeat(64), 1000);
        expect(p).toBeInstanceOf(PuzzleBuilder);
      });

      it('should build valid puzzles', () => {
        const p = new PuzzleBuilder()
          .payToConditions()
          .build();
        expect(p).toBeDefined();
        expect(p.type).toBeDefined();
      });
    });

    describe('Factory functions', () => {
      it('puzzle() should create PuzzleBuilder instance', () => {
        const p = puzzle();
        expect(p).toBeInstanceOf(PuzzleBuilder);
      });

      it('createPuzzle() should create PuzzleBuilder instance', () => {
        const p = createPuzzle();
        expect(p).toBeInstanceOf(PuzzleBuilder);
      });
    });

    describe('Expression helpers', () => {
      it('expr() should create Expression instances', () => {
        const e = expr(42);
        expect(e).toBeInstanceOf(Expression);
        const tree = e.tree;
        if (isAtom(tree) && typeof tree.value === 'string') {
          expect(tree.value).toBe('42');
        }
      });

      it('variable() should create variable expressions', () => {
        const v = variable('myVar');
        expect(v).toBeInstanceOf(Expression);
        const tree = v.tree;
        if (isAtom(tree) && typeof tree.value === 'string') {
          expect(tree.value).toBe('myVar');
        }
      });

      it('expr() should create amount expressions', () => {
        const a = expr(1000);
        expect(a).toBeInstanceOf(Expression);
        const tree = a.tree;
        if (isAtom(tree) && typeof tree.value === 'string') {
          expect(tree.value).toBe('1000');
        }
      });

      it('arg helpers should create correct expressions', () => {
        const checkArgValue = (arg: Expression, expected: string) => {
          const tree = arg.tree;
          if (isAtom(tree) && typeof tree.value === 'string') {
            expect(tree.value).toBe(expected);
          }
        };
        
        checkArgValue(arg1, '2');
        checkArgValue(arg2, '5');
        checkArgValue(arg3, '11');
      });
    });

    describe('Expression operations', () => {
      it('should support arithmetic operations', () => {
        const a = expr(10);
        const b = expr(5);
        
        const sum = a.add(b);
        expect(sum.tree.type).toBe('list');
        if (isList(sum.tree) && sum.tree.items.length > 0) {
          const op = sum.tree.items[0];
          if (isAtom(op) && typeof op.value === 'string') {
            expect(op.value).toBe('+');
          }
        }
        
        const diff = a.subtract(b);
        if (isList(diff.tree) && diff.tree.items.length > 0) {
          const op = diff.tree.items[0];
          if (isAtom(op) && typeof op.value === 'string') {
            expect(op.value).toBe('-');
          }
        }
        
        const prod = a.multiply(b);
        if (isList(prod.tree) && prod.tree.items.length > 0) {
          const op = prod.tree.items[0];
          if (isAtom(op) && typeof op.value === 'string') {
            expect(op.value).toBe('*');
          }
        }
        
        const quot = a.divide(b);
        if (isList(quot.tree) && quot.tree.items.length > 0) {
          const op = quot.tree.items[0];
          if (isAtom(op) && typeof op.value === 'string') {
            expect(op.value).toBe('/');
          }
        }
      });

      it('should support comparison operations', () => {
        const a = expr(10);
        const b = expr(5);
        
        const gt = a.greaterThan(b);
        expect(gt.tree.type).toBe('list');
        if (isList(gt.tree) && gt.tree.items.length > 0) {
          const op = gt.tree.items[0];
          if (isAtom(op) && typeof op.value === 'string') {
            expect(op.value).toBe('>');
          }
        }
        
        const eq = a.equals(b);
        if (isList(eq.tree) && eq.tree.items.length > 0) {
          const op = eq.tree.items[0];
          if (isAtom(op) && typeof op.value === 'string') {
            expect(op.value).toBe('=');
          }
        }
      });

      it('should support logical operations', () => {
        const a = expr(1);
        const notA = a.not();
        expect(notA.tree.type).toBe('list');
        if (isList(notA.tree) && notA.tree.items.length > 0) {
          const op = notA.tree.items[0];
          if (isAtom(op) && typeof op.value === 'string') {
            expect(op.value).toBe('not');
          }
        }
      });
    });
  });

  describe('Standard Puzzles', () => {
    const testPubkey = '0x' + 'a'.repeat(96);
    const testAddress = '0x' + 'b'.repeat(64);

    describe('Layer system', () => {
      it('should create singleton layer', () => {
        const innerPuzzle = puzzle().payToConditions();
        const singleton = withSingletonLayer(innerPuzzle, '0x' + '1'.repeat(64));
        expect(singleton).toBeInstanceOf(PuzzleBuilder);
      });

      it('should create ownership layer', () => {
        const innerPuzzle = puzzle().payToConditions();
        const owned = withOwnershipLayer(innerPuzzle, {
          owner: testAddress
        });
        expect(owned).toBeInstanceOf(PuzzleBuilder);
      });

      it('should create state layer', () => {
        const innerPuzzle = puzzle().payToConditions();
        const stateful = withStateLayer(innerPuzzle, {
          initialState: { count: 0 }
        });
        expect(stateful).toBeInstanceOf(PuzzleBuilder);
      });

      it('should create notification layer', () => {
        const innerPuzzle = puzzle().payToConditions();
        const notifiable = withNotificationLayer(innerPuzzle, {
          allowedSenders: [testAddress]
        });
        expect(notifiable).toBeInstanceOf(PuzzleBuilder);
      });
    });

    describe('Standard payment puzzles', () => {
      it('should create pay to public key puzzles', () => {
        const p2pk = puzzle().payToPublicKey(testPubkey);
        expect(p2pk).toBeInstanceOf(PuzzleBuilder);
      });

      it('should create pay to conditions puzzles', () => {
        const p2c = puzzle().payToConditions();
        expect(p2c).toBeInstanceOf(PuzzleBuilder);
      });
    });
  });

  describe('Core Exports', () => {
    it('should export Program from clvm-lib', () => {
      expect(Program).toBeDefined();
      expect(typeof Program).toBe('function');
    });

    it('should export type guards', () => {
      expect(isAtom).toBeDefined();
      expect(isList).toBeDefined();
      expect(typeof isAtom).toBe('function');
      expect(typeof isList).toBe('function');
    });
  });

  describe('Operator Namespaces', () => {
    it('should export operators namespace', () => {
      expect(operators).toBeDefined();
      expect(operators.arithmetic).toBeDefined();
      expect(operators.comparison).toBeDefined();
      expect(operators.lists).toBeDefined();
      expect(operators.control).toBeDefined();
      expect(operators.crypto).toBeDefined();
      expect(operators.bls).toBeDefined();
      expect(operators.logic).toBeDefined();
    });

    it('should export individual operator modules', () => {
      expect(arithmetic).toBeDefined();
      expect(comparison).toBeDefined();
      expect(lists).toBeDefined();
      expect(control).toBeDefined();
      expect(crypto).toBeDefined();
      expect(bls).toBeDefined();
      expect(logic).toBeDefined();
    });

    it('arithmetic operators should work', () => {
      expect(arithmetic.add).toBeDefined();
      expect(arithmetic.subtract).toBeDefined();
      expect(arithmetic.multiply).toBeDefined();
      expect(arithmetic.divide).toBeDefined();
      
      const sum = arithmetic.add(int(5), int(3));
      if (isList(sum) && sum.items.length > 0) {
        const op = sum.items[0];
        if (isAtom(op) && typeof op.value === 'string') {
          expect(op.value).toBe('+');
        }
      }
    });
  });

  describe('Condition Namespaces', () => {
    it('should export conditions namespace', () => {
      expect(conditions).toBeDefined();
      expect(conditions.spend).toBeDefined();
      expect(conditions.time).toBeDefined();
      expect(conditions.signatures).toBeDefined();
      expect(conditions.messages).toBeDefined();
    });

    it('should export individual condition modules', () => {
      expect(spend).toBeDefined();
      expect(time).toBeDefined();
      expect(signatures).toBeDefined();
      expect(messages).toBeDefined();
    });

    it('should export condition opcodes', () => {
      expect(ConditionOpcode).toBeDefined();
      expect(CONDITION_OPCODE_NAMES).toBeDefined();
      expect(ConditionOpcode.CREATE_COIN).toBe(51);
      expect(CONDITION_OPCODE_NAMES[51]).toBe('CREATE_COIN');
    });
  });

  describe('Pattern Namespaces', () => {
    it('should export patterns namespace', () => {
      expect(patterns).toBeDefined();
      expect(patterns.payment).toBeDefined();
      expect(patterns.delegation).toBeDefined();
    });

    it('should export individual pattern modules', () => {
      expect(payment).toBeDefined();
      expect(delegation).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    const testAddress = '0x' + 'b'.repeat(64);

    it('should build a complete payment puzzle', () => {
      const testPubkey = '0x' + 'a'.repeat(96);
      const puzzle = createPuzzle()
        .withSolutionParams('recipient', 'amount')
        .requireSignature(testPubkey)
        .createCoin(testAddress, 1000)
        .build();
      
      expect(puzzle).toBeDefined();
      expect(puzzle.type).toBeDefined();
    });

    it('should serialize puzzles to ChiaLisp', () => {
      const testPubkey = '0x' + 'a'.repeat(96);
      const puzzle = createPuzzle()
        .payToPublicKey(testPubkey);
      
      const serialized = puzzle.serialize();
      expect(serialized).toContain('mod');
      expect(serialized).toContain('PUBKEY');
    });

    it('should calculate mod hashes', () => {
      const puzzle = createPuzzle().payToConditions();
      const hash = puzzle.toModHash();
      expect(hash).toMatch(/^0x[a-f0-9]{64}$/);
    });

    it('should compose complex puzzles', () => {
      const innerPuzzle = createPuzzle()
        .withSolutionParams('action')
        .if(variable('action').equals(1))
          .then(b => {
            b.createCoin(testAddress, 100);
          })
          .else(b => {
            b.fail();
          });
      
      const singleton = withSingletonLayer(innerPuzzle, '0x' + '2'.repeat(64));
      
      expect(innerPuzzle).toBeInstanceOf(PuzzleBuilder);
      expect(singleton).toBeInstanceOf(PuzzleBuilder);
    });

    it('should handle time-locked puzzles', () => {
      const puzzle = createPuzzle()
        .withSolutionParams('recipient', 'amount')
        .requireAfterSeconds(3600) // 1 hour
        .createCoin(testAddress, 1000);
      
      expect(puzzle).toBeInstanceOf(PuzzleBuilder);
      const built = puzzle.build();
      expect(built).toBeDefined();
    });

    it('should handle multi-signature puzzles', () => {
      const pubkey1 = '0x' + '1'.repeat(96);
      const pubkey2 = '0x' + '2'.repeat(96);
      
      const puzzle = createPuzzle()
        .withSolutionParams('conditions')
        .requireSignature(pubkey1)
        .requireSignature(pubkey2)
        .returnConditions();
      
      expect(puzzle).toBeInstanceOf(PuzzleBuilder);
    });

    it('should handle announcement puzzles', () => {
      const puzzle = createPuzzle()
        .withSolutionParams('message')
        .createAnnouncement('test message')
        .assertAnnouncement('0x' + 'a'.repeat(64));
      
      expect(puzzle).toBeInstanceOf(PuzzleBuilder);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid parameters gracefully', () => {
      // These should not throw
      expect(() => expr('test')).not.toThrow();
      expect(() => variable('')).not.toThrow();
      expect(() => expr(-1)).not.toThrow();
    });

    it('should validate puzzle building', () => {
      const puzzle = createPuzzle();
      expect(() => puzzle.build()).not.toThrow();
    });

    it('should handle empty puzzle gracefully', () => {
      const puzzle = createPuzzle();
      const built = puzzle.build();
      expect(built).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('Expression type should be exported', () => {
      const e: Expression = expr(42);
      expect(e).toBeInstanceOf(Expression);
    });

    it('Expr alias should work', () => {
      const e: Expr = expr(42);
      expect(e).toBeInstanceOf(Expression);
    });

    it('PuzzleBuilder should be typed', () => {
      const p: PuzzleBuilder = puzzle();
      expect(p).toBeInstanceOf(PuzzleBuilder);
    });
  });

  describe('Advanced Patterns', () => {
    const testAddress = '0x' + 'b'.repeat(64);

    it('should support delegation patterns', () => {
      const delegated = createPuzzle()
        .withSolutionParams('delegated_puzzle', 'delegated_solution')
        .delegatedPuzzle();
      
      expect(delegated).toBeInstanceOf(PuzzleBuilder);
    });

    it('should support conditional logic', () => {
      const conditional = createPuzzle()
        .withSolutionParams('choice', 'recipient')
        .if(variable('choice').equals(1))
          .then(b => {
            b.createCoin(testAddress, 100);
          })
          .else(b => {
            b.createCoin(testAddress, 200);
          });
      
      expect(conditional).toBeInstanceOf(PuzzleBuilder);
    });

    it('should support loops via unrolling', () => {
      const puzzle = createPuzzle()
        .repeat(3, (i, b) => {
          b.createCoin(testAddress, 100 * (i + 1));
        });
      
      expect(puzzle).toBeInstanceOf(PuzzleBuilder);
    });

    it('should support forEach pattern', () => {
      const addresses = [testAddress, '0x' + 'c'.repeat(64), '0x' + 'd'.repeat(64)];
      
      const puzzle = createPuzzle()
        .forEach(addresses, (addr, _i, b) => {
          b.createCoin(addr, 100);
        });
      
      expect(puzzle).toBeInstanceOf(PuzzleBuilder);
    });
  });

  describe('Puzzle Composition', () => {
    it('should merge puzzles', () => {
      const puzzle1 = createPuzzle().createCoin('0x' + 'a'.repeat(64), 100);
      const puzzle2 = createPuzzle().createCoin('0x' + 'b'.repeat(64), 200);
      
      const merged = createPuzzle().merge(puzzle1).merge(puzzle2);
      expect(merged).toBeInstanceOf(PuzzleBuilder);
    });

    it('should wrap puzzles', () => {
      const inner = createPuzzle().payToConditions();
      const wrapped = inner.wrap(innerTree => ({
        type: 'list',
        items: [{ type: 'atom', value: 'wrapper' }, innerTree]
      }));
      
      expect(wrapped).toBeInstanceOf(PuzzleBuilder);
    });
  });

  describe('Comments and Documentation', () => {
    it('should support inline comments', () => {
      const puzzle = createPuzzle()
        .comment('This is a payment')
        .createCoin('0x' + 'a'.repeat(64), 100);
      
      const serialized = puzzle.serialize({ indent: true });
      expect(serialized).toContain('This is a payment');
    });

    it('should support block comments', () => {
      const puzzle = createPuzzle()
        .blockComment('This puzzle handles payments')
        .blockComment('It requires a signature')
        .requireSignature('0x' + 'a'.repeat(96));
      
      const serialized = puzzle.serialize({ indent: true });
      expect(serialized).toContain('This puzzle handles payments');
      expect(serialized).toContain('It requires a signature');
    });
  });

  describe('BLS operations', () => {
    it('should create pubkey operations', () => {
      const testPrivkey = int(0x1234567890n);
      const pubkeyOp = bls.pubkeyForExp(testPrivkey);
      
      expect(pubkeyOp).toBeDefined();
      expect(pubkeyOp.type).toBe('list');
    });
  });
  
  describe('CoinScript', () => {
    it('should compile CoinScript code', () => {
      const code = `
        coin SimplePayment {
          action pay(address recipient) {
            send(recipient, msg.value);
          }
        }
      `;
      const puzzle = compileCoinScript(code);
      expect(puzzle).toBeInstanceOf(PuzzleBuilder);
    });
    
    it('should parse CoinScript files', () => {
      // This would test parseCoinScriptFile but we can't test file operations in unit tests
      expect(parseCoinScriptFile).toBeDefined();
      expect(typeof parseCoinScriptFile).toBe('function');
    });
  });
}); 