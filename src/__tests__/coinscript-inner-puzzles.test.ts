import { describe, it, expect } from '@jest/globals';
import { compileCoinScript } from '../coinscript/parser';
import { serialize } from '../core/serializer';

describe('CoinScript Inner Puzzles', () => {
  describe('Pattern 1: Simple Inner Puzzle Wrapper', () => {
    it('should parse and compile an inner puzzle slot declaration', () => {
      const code = `
        coin TimeLockedVault {
          inner IPuzzle spending_logic;
          storage uint256 unlock_time = 100;
          
          action spend(bytes inner_solution) {
            require(block.height >= unlock_time, "Still locked");
            return spending_logic(inner_solution);
          }
        }
      `;
      
      const result = compileCoinScript(code);
      expect(result).toBeDefined();
      expect(result.mainPuzzle).toBeDefined();
      
      const chialisp = serialize(result.mainPuzzle.build());
      expect(chialisp).toContain('SPENDING_LOGIC_INNER_PUZZLE');
      expect(chialisp).toContain('inner_solution');
    });
    
    it('should generate proper inner puzzle execution', () => {
      const code = `
        coin SimpleWrapper {
          inner IPuzzle base_logic;
          
          action execute(bytes solution) {
            return base_logic(solution);
          }
        }
      `;
      
      const result = compileCoinScript(code);
      const chialisp = serialize(result.mainPuzzle.build());
      
      // Should generate (a BASE_LOGIC_INNER_PUZZLE solution)
      expect(chialisp).toContain('(a BASE_LOGIC_INNER_PUZZLE solution)');
    });
  });
  
  describe('Pattern 2: Inline Inner Puzzle', () => {
    it('should parse and compile an inline inner puzzle', () => {
      const code = `
        coin MultiModeCoin {
          inner puzzle emergency {
            action recover(address new_owner) {
              requireSignature(RECOVERY_KEY);
              recreateSelf(new_owner);
            }
          }
          
          action emergency_recover(address new_owner) {
            return emergency.recover(new_owner);
          }
        }
      `;
      
      const result = compileCoinScript(code);
      expect(result).toBeDefined();
      
      // Should have additional puzzle for the inline inner puzzle
      expect(result.additionalPuzzles).toBeDefined();
      expect(result.additionalPuzzles?.emergency).toBeDefined();
    });
  });
  
  describe('Pattern 3: Multiple Inner Puzzles', () => {
    it('should handle multiple inner puzzle declarations', () => {
      const code = `
        coin FlexibleContract {
          inner IPuzzle payment_logic;
          inner IPuzzle governance_logic;
          
          action pay(bytes solution) {
            return payment_logic(solution);
          }
          
          action govern(bytes solution) {
            requireSignature(GOVERNANCE_KEY);
            return governance_logic(solution);
          }
        }
      `;
      
      const result = compileCoinScript(code);
      const chialisp = serialize(result.mainPuzzle.build());
      
      expect(chialisp).toContain('PAYMENT_LOGIC_INNER_PUZZLE');
      expect(chialisp).toContain('GOVERNANCE_LOGIC_INNER_PUZZLE');
    });
  });
  
  describe('Pattern 4: Inner Puzzle with Conditions', () => {
    it('should handle conditional inner puzzle execution', () => {
      const code = `
        coin ConditionalWrapper {
          inner IPuzzle normal_mode;
          inner IPuzzle emergency_mode;
          
          action execute(bool is_emergency, bytes solution) {
            if (is_emergency) {
              return emergency_mode(solution);
            } else {
              return normal_mode(solution);
            }
          }
        }
      `;
      
      const result = compileCoinScript(code);
      const chialisp = serialize(result.mainPuzzle.build());
      
      // Should have conditional logic
      expect(chialisp).toContain('(i'); // if
      expect(chialisp).toContain('NORMAL_MODE_INNER_PUZZLE');
      expect(chialisp).toContain('EMERGENCY_MODE_INNER_PUZZLE');
    });
  });
  
  describe('Pattern 5: Composition Block', () => {
    it('should parse composition blocks', () => {
      const code = `
        coin ComposedNFT {
          compose {
            base: StandardPayment(owner: 0x123)
            with: StateLayer(metadata: "test")
            with: RoyaltyLayer(artist: 0x456, percentage: 10)
          }
          
          action transfer(address new_owner) {
            // Transfer logic
            send(new_owner, msg.amount);
          }
        }
      `;
      
      const result = compileCoinScript(code);
      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });
  
  describe('Pattern 6: Use Statement', () => {
    it('should parse use statements', () => {
      const code = `
        coin MyWallet {
          use StandardPayment(owner: 0x789);
          layer singleton(launcher_id: 0xabc);
          
          action spend(address recipient, uint256 amount) {
            send(recipient, amount);
          }
        }
      `;
      
      const result = compileCoinScript(code);
      expect(result).toBeDefined();
      expect(result.metadata?.hasSingleton).toBe(true);
    });
  });
  
  describe('Pattern 7: State-Preserving Inner Puzzles', () => {
    it('should handle stateful wrapper with inner puzzle', () => {
      const code = `
        @stateful
        coin StatefulWrapper {
          state {
            uint256 counter = 0;
            address last_user;
          }
          
          inner IStatelessPuzzle logic;
          
          @stateful
          action execute(bytes inner_solution) {
            state.counter += 1;
            state.last_user = msg.sender;
            
            let conditions = logic(inner_solution);
            return mergeWithState(conditions);
          }
        }
      `;
      
      const result = compileCoinScript(code);
      expect(result).toBeDefined();
      expect(result.metadata?.hasStatefulActions).toBe(true);
    });
  });
  
  describe('Pattern 8: Inner Puzzle with Parameters', () => {
    it('should handle inner puzzle constructor parameters', () => {
      const code = `
        puzzle PaymentPuzzle {
          constructor(address owner) {}
          
          action spend(address recipient, uint256 amount) {
            requireSignature(owner);
            send(recipient, amount);
          }
        }
        
        coin TimeLockedPayment {
          inner PaymentPuzzle payment(owner: 0xdef);
          storage uint256 unlock_time = 1000;
          
          action unlock(address recipient, uint256 amount) {
            require(block.height >= unlock_time);
            return payment.spend(recipient, amount);
          }
        }
      `;
      
      const result = compileCoinScript(code);
      expect(result).toBeDefined();
      // Should have both the main coin and the payment puzzle
      expect(result.additionalPuzzles).toBeDefined();
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty inner puzzle', () => {
      const code = `
        coin EmptyWrapper {
          inner IPuzzle empty_logic;
          
          action default() {
            return empty_logic(0);
          }
        }
      `;
      
      const result = compileCoinScript(code);
      expect(result).toBeDefined();
    });
    
    it('should reject invalid inner puzzle syntax', () => {
      const code = `
        coin InvalidCoin {
          inner invalid_syntax;
        }
      `;
      
      expect(() => compileCoinScript(code)).toThrow();
    });
    
    it('should handle nested inner puzzle calls', () => {
      const code = `
        coin NestedWrapper {
          inner IPuzzle layer1;
          inner IPuzzle layer2;
          
          action execute(bytes solution1, bytes solution2) {
            let result1 = layer1(solution1);
            let result2 = layer2(solution2);
            return combineResults(result1, result2);
          }
        }
      `;
      
      const result = compileCoinScript(code);
      const chialisp = serialize(result.mainPuzzle.build());
      
      expect(chialisp).toContain('LAYER1_INNER_PUZZLE');
      expect(chialisp).toContain('LAYER2_INNER_PUZZLE');
    });
  });
  
  describe('ChiaLisp Generation Quality', () => {
    it('should generate valid ChiaLisp for simple inner puzzle', () => {
      const code = `
        coin SimpleInner {
          inner IPuzzle logic;
          
          action run(bytes sol) {
            return logic(sol);
          }
        }
      `;
      
      const result = compileCoinScript(code);
      const chialisp = serialize(result.mainPuzzle.build());
      
      // Should have proper mod structure
      expect(chialisp).toMatch(/\(mod\s+\(/);
      // Should have the inner puzzle parameter
      expect(chialisp).toContain('LOGIC_INNER_PUZZLE');
      // Should have (a INNER_PUZZLE solution) pattern
      expect(chialisp).toMatch(/\(a\s+LOGIC_INNER_PUZZLE\s+sol\)/);
    });
    
    it('should handle inner puzzle with condition morphing', () => {
      const code = `
        coin MorphingWrapper {
          inner IPuzzle base;
          
          action execute(bytes solution) {
            // Add our own condition
            requireSignature(OWNER_KEY);
            
            // Execute inner puzzle and return its conditions
            return base(solution);
          }
        }
      `;
      
      const result = compileCoinScript(code);
      const chialisp = serialize(result.mainPuzzle.build());
      
      // Should have signature requirement
      expect(chialisp).toContain('AGG_SIG_ME');
      // Should execute inner puzzle
      expect(chialisp).toContain('(a BASE_INNER_PUZZLE solution)');
    });
  });
}); 