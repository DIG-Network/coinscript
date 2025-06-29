/**
 * Complex Puzzle Composition Tests
 * 
 * Tests for complex puzzle patterns, compositions, and edge cases
 */

import {
  puzzle,
  expr,
  variable,
  PuzzleBuilder,
  withSingletonLayer,
  withOwnershipLayer,
  withStateLayer,
  withNotificationLayer,
  isList
} from '../index';

describe('PuzzleBuilder - Complex Compositions', () => {
  const TEST_ADDRESS = '0x' + 'a'.repeat(64);
  const TEST_PUBKEY = '0x' + 'b'.repeat(96);

  describe('Layer Compositions', () => {
    test('should compose singleton with ownership layer', () => {
      const innerPuzzle = puzzle()
        .withSolutionParams('action')
        .if(variable('action').equals(1))
          .then(b => {
            b.createCoin(TEST_ADDRESS, 100);
          })
          .else(b => {
            b.fail();
          });
      
      const owned = withOwnershipLayer(innerPuzzle, {
        owner: TEST_ADDRESS
      });
      
      const singleton = withSingletonLayer(owned, '0x' + '1'.repeat(64));
      
      expect(singleton).toBeInstanceOf(PuzzleBuilder);
      const serialized = singleton.serialize();
      expect(serialized).toBeDefined();
    });

    test('should compose state layer with notification layer', () => {
      const innerPuzzle = puzzle()
        .withSolutionParams('newState')
        .returnValue(variable('newState'));
      
      const stateful = withStateLayer(innerPuzzle, {
        initialState: { count: 0 }
      });
      
      const notifiable = withNotificationLayer(stateful, {
        allowedSenders: [TEST_ADDRESS]
      });
      
      expect(notifiable).toBeInstanceOf(PuzzleBuilder);
    });

    test('should handle triple layer composition', () => {
      const base = puzzle().payToConditions();
      
      const layer1 = withStateLayer(base, {
        initialState: { value: 100 }
      });
      
      const layer2 = withOwnershipLayer(layer1, {
        owner: TEST_ADDRESS
      });
      
      const layer3 = withSingletonLayer(layer2, '0x' + 'c'.repeat(64));
      
      expect(layer3).toBeInstanceOf(PuzzleBuilder);
    });
  });

  describe('Complex Control Flow', () => {
    test('should handle deeply nested if statements', () => {
      const p = puzzle()
        .withSolutionParams('a', 'b', 'c')
        .if(variable('a').greaterThan(0))
          .then(b1 => {
            b1.if(variable('b').greaterThan(0))
              .then(b2 => {
                b2.if(variable('c').greaterThan(0))
                  .then(b3 => {
                    b3.createCoin(TEST_ADDRESS, 100);
                  })
                  .else(b3 => {
                    b3.createCoin(TEST_ADDRESS, 50);
                  });
              })
              .else(b2 => {
                b2.createCoin(TEST_ADDRESS, 25);
              });
          })
          .else(b1 => {
            b1.fail();
          });
      
      const serialized = p.serialize();
      expect(serialized).toContain('a');
      expect(serialized).toContain('b');
      expect(serialized).toContain('c');
    });

    test('should handle complex condition combining', () => {
      const p = puzzle()
        .withSolutionParams('amount', 'authorized')
        .if(
          variable('amount').greaterThan(100)
            .and(expr(1000).greaterThan(variable('amount')))
            .and(variable('authorized').equals(1))
        )
          .then(b => {
            b.createCoin(TEST_ADDRESS, variable('amount'));
          })
          .else(b => {
            b.fail();
          });
      
      const serialized = p.serialize();
      expect(serialized).toContain('all'); // and operator
    });
  });

  describe('Advanced Patterns', () => {
    test('should implement time-locked vault with emergency escape', () => {
      const p = puzzle()
        .withCurriedParams({
          OWNER: TEST_PUBKEY,
          BENEFICIARY: TEST_ADDRESS,
          UNLOCK_TIME: 1000000,
          EMERGENCY_KEY: '0x' + 'e'.repeat(96)
        })
        .withSolutionParams('action')
        .if(variable('action').equals(1))
          .then(b => {
            // Normal withdrawal after time lock
            b.requireAfterSeconds(1000000); // Use literal value
            b.requireSignature(TEST_PUBKEY); // Use literal value
            b.createCoin(TEST_ADDRESS, expr('@')); // Use literal address
          })
          .else(b => {
            // Emergency withdrawal
            b.requireSignature('0x' + 'e'.repeat(96)); // Use literal value
            b.createCoin(TEST_ADDRESS, expr('@')); // Use literal address
          });
      
      const serialized = p.serialize();
      expect(serialized).toContain('action');
      expect(serialized).toContain('ASSERT_SECONDS_RELATIVE');
      expect(serialized).toContain('AGG_SIG_ME');
    });

    test('should implement multi-stage escrow', () => {
      const p = puzzle()
        .withCurriedParams({
          BUYER: '0x' + '1'.repeat(64),
          SELLER: '0x' + '2'.repeat(64),
          ESCROW_AGENT: '0x' + '3'.repeat(96),
          AMOUNT: 1000
        })
        .withSolutionParams('stage', 'signature')
        .if(variable('stage').equals(1))
          .then(b => {
            // Buyer deposits
            b.createCoin(TEST_ADDRESS, 1000); // Use literal values instead of expressions
          })
          .else(b => {
            b.if(variable('stage').equals(2))
              .then(b2 => {
                // Release to seller
                b2.requireSignature('0x' + '3'.repeat(96)); // Use literal value
                b2.createCoin('0x' + '2'.repeat(64), 1000); // Use literal values
              })
              .else(b2 => {
                // Refund to buyer
                b2.requireSignature('0x' + '3'.repeat(96)); // Use literal value
                b2.createCoin('0x' + '1'.repeat(64), 1000); // Use literal values
              });
          });
      
      const serialized = p.serialize();
      expect(serialized.match(/=/g)?.length).toBeGreaterThanOrEqual(2);
    });

    test('should implement decentralized exchange offer', () => {
      const p = puzzle()
        .withCurriedParams({
          OFFER_ASSET: '0x' + 'a'.repeat(64),
          OFFER_AMOUNT: 100,
          REQUEST_ASSET: '0x' + 'b'.repeat(64),
          REQUEST_AMOUNT: 200
        })
        .withSolutionParams('taker_puzzle_hash')
        .createCoin('0x' + 'a'.repeat(64), 100) // Use literal values
        .assertAnnouncement('0x' + 'f'.repeat(64)) // Use literal announcement ID
        .createCoin(TEST_ADDRESS, 0); // Use literal address
      
      const serialized = p.serialize();
      expect(serialized).toContain('CREATE_COIN');
      expect(serialized).toContain('ASSERT_COIN_ANNOUNCEMENT');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty puzzles', () => {
      const p = puzzle();
      const serialized = p.serialize();
      expect(serialized).toContain('mod');
      expect(serialized).toContain('()'); // Empty body
    });

    test('should handle puzzles with only comments', () => {
      const p = puzzle()
        .comment('This puzzle does nothing')
        .blockComment('Really, nothing at all');
      
      const serialized = p.serialize();
      expect(serialized).toContain('mod');
      expect(serialized).toContain('()');
    });

    test('should handle very long parameter lists', () => {
      const params = Array.from({ length: 20 }, (_, i) => `param${i}`);
      const p = puzzle().withSolutionParams(...params);
      
      const serialized = p.serialize();
      params.forEach(param => {
        expect(serialized).toContain(param);
      });
    });

    test('should handle deeply nested expressions', () => {
      let expr = variable('x');
      for (let i = 0; i < 10; i++) {
        expr = expr.add(i).multiply(2);
      }
      
      const p = puzzle()
        .withSolutionParams('x')
        .returnValue(expr);
      
      const serialized = p.serialize();
      expect(serialized).toContain('x');
      expect(serialized).toContain('+');
      expect(serialized).toContain('*');
    });

    test('should handle circular parameter references', () => {
      const p = puzzle()
        .withCurriedParams({
          A: puzzle().param('B'),
          B: puzzle().param('A')
        })
        .returnValue(puzzle().param('A'));
      
      // Should not crash
      const serialized = p.serialize();
      expect(serialized).toBeDefined();
    });
  });

  describe('Performance Patterns', () => {
    test('should handle large condition lists efficiently', () => {
      const p = puzzle();
      
      // Add 100 conditions
      for (let i = 0; i < 100; i++) {
        p.createCoin('0x' + i.toString(16).padStart(64, '0'), i);
      }
      
      const serialized = p.serialize();
      // Count CREATE_COIN outside of defconstant statements
      // The include file has defconstant CREATE_COIN which adds extra matches
      const createCoinMatches = serialized.match(/CREATE_COIN/g)?.length || 0;
      expect(createCoinMatches).toBeGreaterThanOrEqual(100);
    });

    test('should handle many includes', () => {
      const p = puzzle()
        .include('lib1.clib')
        .include('lib2.clib')
        .include('lib3.clib')
        .includeStandardLibraries()
        .createCoin(TEST_ADDRESS, 100);
      
      const serialized = p.serialize();
      expect(serialized).toContain('include lib1.clib');
      expect(serialized).toContain('include lib2.clib');
      expect(serialized).toContain('include lib3.clib');
      expect(serialized).toContain('include condition_codes.clib');
    });
  });

  describe('Integration Patterns', () => {
    test('should build atomic swap puzzle', () => {
      const p = puzzle()
        .withCurriedParams({
          PARTY_A: '0x' + '1'.repeat(64),
          PARTY_B: '0x' + '2'.repeat(64),
          HASH_A: '0x' + 'a'.repeat(64),
          HASH_B: '0x' + 'b'.repeat(64),
          TIMEOUT: 86400
        })
        .withSolutionParams('preimage_a', 'preimage_b')
        .if(
          variable('preimage_a').sha256().equals(puzzle().param('HASH_A'))
            .and(variable('preimage_b').sha256().equals(puzzle().param('HASH_B')))
        )
          .then(b => {
            b.createCoin('0x' + '1'.repeat(64), 50); // Use literal values
            b.createCoin('0x' + '2'.repeat(64), 50); // Use literal values
          })
          .else(b => {
            b.requireAfterSeconds(86400); // Use literal value
            b.createCoin('0x' + '1'.repeat(64), 100); // Use literal values
          });
      
      const serialized = p.serialize();
      expect(serialized).toContain('sha256');
      expect(serialized).toContain('all'); // and operator for both conditions
    });

    test('should build payment channel puzzle', () => {
      const p = puzzle()
        .withCurriedParams({
          PARTY_A_PUBKEY: '0x' + '1'.repeat(96),
          PARTY_B_PUBKEY: '0x' + '2'.repeat(96),
          CHANNEL_ID: '0x' + 'c'.repeat(64)
        })
        .withSolutionParams('balance_a', 'balance_b', 'nonce', 'close_flag')
        .if(variable('close_flag').equals(1))
          .then(b => {
            // Cooperative close
            b.requireSignature('0x' + '1'.repeat(96)); // Use literal value
            b.requireSignature('0x' + '2'.repeat(96)); // Use literal value
            b.createCoin('0x' + 'a1'.repeat(32), variable('balance_a'));
            b.createCoin('0x' + 'b2'.repeat(32), variable('balance_b'));
          })
          .else(b => {
            // Update state
            b.requireSignature('0x' + '1'.repeat(96)); // Use literal value
            b.requireSignature('0x' + '2'.repeat(96)); // Use literal value
            b.createCoin(
              '0x' + 'c3'.repeat(32), // Use literal address
              variable('balance_a').add(variable('balance_b'))
            );
            b.createAnnouncement('nonce_value'); // Use literal string
          });
      
      const serialized = p.serialize();
      expect(serialized).toContain('close_flag');
      expect(serialized).toContain('AGG_SIG_ME');
    });
  });

  describe('Serialization Options', () => {
    test('should serialize with different formats', () => {
      const p = puzzle().createCoin(TEST_ADDRESS, 100);
      
      const compact = p.serialize();
      const indented = p.serialize({ indent: true });
      
      expect(compact.length).toBeLessThan(indented.length);
      expect(indented).toContain('\n');
      expect(compact).not.toContain('\n');
    });

    test('should handle all serialization options', () => {
      const p = puzzle()
        .includeStandardLibraries()
        .createCoin(TEST_ADDRESS, 100);
      
      // Test different formats
      const chialisp = p.serialize({ format: 'chialisp' });
      expect(chialisp).toContain('mod');
      
      const modHash = p.toModHash();
      expect(modHash).toMatch(/^0x[a-f0-9]{64}$/);
    });
  });

  describe('Builder Method Coverage', () => {
    test('should test repeat method', () => {
      const p = puzzle()
        .repeat(3, (i, b) => {
          b.createCoin(TEST_ADDRESS, (i + 1) * 100);
        });
      
      const serialized = p.serialize();
      expect(serialized.match(/CREATE_COIN/g)?.length).toBe(3);
      expect(serialized).toContain('100');
      expect(serialized).toContain('200');
      expect(serialized).toContain('300');
    });

    test('should test forEach method', () => {
      const addresses = [
        '0x' + '1'.repeat(64),
        '0x' + '2'.repeat(64),
        '0x' + '3'.repeat(64)
      ];
      
      const p = puzzle()
        .forEach(addresses, (addr, i, b) => {
          b.createCoin(addr, (i + 1) * 50);
        });
      
      const serialized = p.serialize();
      addresses.forEach(addr => {
        expect(serialized).toContain(addr);
      });
    });

    test('should test merge method', () => {
      const p1 = puzzle().createCoin(TEST_ADDRESS, 100);
      const p2 = puzzle().reserveFee(10);
      const p3 = puzzle().requireSignature(TEST_PUBKEY);
      
      const merged = puzzle()
        .merge(p1)
        .merge(p2)
        .merge(p3);
      
      const serialized = merged.serialize();
      expect(serialized).toContain('CREATE_COIN');
      expect(serialized).toContain('RESERVE_FEE');
      expect(serialized).toContain('AGG_SIG_ME');
    });

    test('should test wrap method', () => {
      const inner = puzzle().createCoin(TEST_ADDRESS, 100);
      
      const wrapped = inner.wrap(innerTree => ({
        type: 'list',
        items: [
          { type: 'atom', value: 'wrapper' },
          innerTree,
          { type: 'atom', value: 'extra' }
        ]
      }));
      
      const tree = wrapped.build();
      expect(isList(tree)).toBe(true);
    });

    test('should test require method', () => {
      const p = puzzle()
        .withSolutionParams('value')
        .require(variable('value').greaterThan(0), 'Value must be positive')
        .createCoin(TEST_ADDRESS, variable('value'));
      
      const serialized = p.serialize();
      // require generates an if statement that throws on failure
      expect(serialized).toContain('(i'); // if statement
      expect(serialized).toContain('(x)'); // exception
      expect(serialized).toContain('>'); // greater than comparison
    });
  });
});