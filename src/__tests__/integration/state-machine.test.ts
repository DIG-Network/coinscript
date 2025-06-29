import { describe, test, expect } from '@jest/globals';
import { compileCoinScript } from '../../coinscript';
import { createSolution } from '../../index';
import { serialize } from '../../core';

describe('State Machine Implementation', () => {
  describe('Basic State Management', () => {
    test('should compile a simple stateful counter', () => {
      const source = `
        coin StatefulCounter {
          storage address owner = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
          
          state {
            uint256 counter;
            address lastUpdater;
          }
          
          @stateful
          action increment() {
            state.counter += 1;
            state.lastUpdater = msg.sender;
          }
          
          @stateful
          action decrement() {
            require(state.counter > 0, "Counter cannot go below zero");
            state.counter -= 1;
            state.lastUpdater = msg.sender;
          }
          
          action getCounter() view returns (uint256) {
            return state.counter;
          }
        }
      `;

      const result = compileCoinScript(source);
      
      expect(result.mainPuzzle.serialize()).toContain('increment');
      expect(result.mainPuzzle.serialize()).toContain('decrement');
      expect(result.additionalPuzzles).toBeDefined();
      expect(Object.keys(result.additionalPuzzles!)).toContain('increment');
      expect(Object.keys(result.additionalPuzzles!)).toContain('decrement');
    });

    test.skip('should handle complex state structures', () => {
      // Known limitation: struct definitions in state blocks are not yet supported
      const source = `
        coin ComplexState {
          storage address admin = 0xaaaa000000000000000000000000000000000000000000000000000000000000;
          
          state {
            mapping(address => uint256) balances;
            address[] holders;
            uint256 totalSupply;
            bool paused;
            struct Config {
              uint256 maxSupply;
              uint256 mintFee;
              address feeRecipient;
            }
            Config config;
          }
          
          @stateful
          action mint(address to, uint256 amount) {
            require(msg.sender == admin, "Only admin can mint");
            require(!state.paused, "Contract is paused");
            require(state.totalSupply + amount <= state.config.maxSupply, "Exceeds max supply");
            
            if (state.balances[to] == 0) {
              state.holders.push(to);
            }
            
            state.balances[to] += amount;
            state.totalSupply += amount;
          }
          
          @stateful
          action pause() {
            require(msg.sender == admin, "Only admin can pause");
            state.paused = true;
          }
          
          @stateful
          action unpause() {
            require(msg.sender == admin, "Only admin can unpause");
            state.paused = false;
          }
        }
      `;

      const result = compileCoinScript(source);
      
      expect(result.mainPuzzle.serialize()).toBeDefined();
      expect(result.additionalPuzzles).toBeDefined();
      expect(Object.keys(result.additionalPuzzles!)).toHaveLength(3);
    });
  });

  describe('State Transitions', () => {
    test('should implement a finite state machine', () => {
      const source = `
        coin FiniteStateMachine {
          storage address owner = 0xbbbb000000000000000000000000000000000000000000000000000000000000;
          
          // State definitions
          const uint8 STATE_IDLE = 0;
          const uint8 STATE_ACTIVE = 1;
          const uint8 STATE_PROCESSING = 2;
          const uint8 STATE_COMPLETE = 3;
          const uint8 STATE_ERROR = 4;
          
          state {
            uint8 currentState;
            uint256 processedItems;
            bytes32 lastError;
          }
          
          @stateful
          action activate() {
            require(state.currentState == STATE_IDLE, "Can only activate from idle");
            require(msg.sender == owner, "Only owner can activate");
            
            state.currentState = STATE_ACTIVE;
          }
          
          @stateful
          action startProcessing() {
            require(state.currentState == STATE_ACTIVE, "Must be active to start processing");
            
            state.currentState = STATE_PROCESSING;
            state.processedItems = 0;
          }
          
          @stateful
          action processItem() {
            require(state.currentState == STATE_PROCESSING, "Must be processing");
            
            state.processedItems += 1;
            
            if (state.processedItems >= 10) {
              state.currentState = STATE_COMPLETE;
            }
          }
          
          @stateful
          action handleError(bytes32 errorCode) {
            require(state.currentState != STATE_IDLE && state.currentState != STATE_COMPLETE, "Invalid state for error");
            
            state.currentState = STATE_ERROR;
            state.lastError = errorCode;
          }
          
          @stateful
          action reset() {
            require(msg.sender == owner, "Only owner can reset");
            
            state.currentState = STATE_IDLE;
            state.processedItems = 0;
            state.lastError = 0x0;
          }
        }
      `;

      const result = compileCoinScript(source);
      
      expect(result.mainPuzzle.serialize()).toContain('activate');
      expect(result.mainPuzzle.serialize()).toContain('startProcessing');
      expect(result.mainPuzzle.serialize()).toContain('processItem');
      expect(result.mainPuzzle.serialize()).toContain('handleError');
      expect(result.mainPuzzle.serialize()).toContain('reset');
      expect(result.additionalPuzzles).toBeDefined();
      expect(Object.keys(result.additionalPuzzles!)).toHaveLength(5);
    });
  });

  describe('State Validation', () => {
    test('should validate state integrity', () => {
      const source = `
        coin StateValidator {
          storage bytes32 stateRoot = 0xcccc000000000000000000000000000000000000000000000000000000000000;
          
          state {
            uint256 nonce;
            uint256 balance;
            bytes32 merkleRoot;
          }
          
          @stateful
          action updateBalance(uint256 newBalance, bytes32 proof) {
            // Validate state integrity
            bytes32 expectedRoot = sha256(concat(state.nonce, state.balance, state.merkleRoot));
            require(expectedRoot == stateRoot, "Invalid state root");
            
            // Update state
            state.balance = newBalance;
            state.nonce += 1;
            
            // Update merkle root with proof
            state.merkleRoot = sha256(concat(state.merkleRoot, proof));
          }
        }
      `;

      const result = compileCoinScript(source);
      
      expect(result.mainPuzzle.serialize()).toBeDefined();
      expect(result.additionalPuzzles?.updateBalance).toBeDefined();
    });
  });

  describe('State Events', () => {
    test('should emit events for state changes', () => {
      const source = `
        coin StateWithEvents {
          event StateChanged(string field, bytes32 oldValue, bytes32 newValue);
          event StateReset();
          
          state {
            uint256 value;
            address lastChanger;
          }
          
          @stateful
          action updateValue(uint256 newValue) {
            uint256 oldValue = state.value;
            state.value = newValue;
            state.lastChanger = msg.sender;
            
            emit StateChanged("value", bytes32(oldValue), bytes32(newValue));
          }
          
          @stateful
          action reset() {
            state.value = 0;
            state.lastChanger = 0x0;
            
            emit StateReset();
          }
        }
      `;

      const result = compileCoinScript(source);
      
      expect(result.mainPuzzle.serialize()).toContain('CREATE_COIN_ANNOUNCEMENT');
      expect(result.additionalPuzzles).toBeDefined();
    });
  });

  describe('State Access Control', () => {
    test('should enforce access control on state modifications', () => {
      const source = `
        coin ProtectedState {
          storage address admin = 0xdddd000000000000000000000000000000000000000000000000000000000000;
          storage address operator = 0xeeee000000000000000000000000000000000000000000000000000000000000;
          
          modifier onlyAdmin() {
            require(msg.sender == admin, "Only admin");
            _;
          }
          
          modifier onlyOperator() {
            require(msg.sender == operator || msg.sender == admin, "Only operator or admin");
            _;
          }
          
          state {
            uint256 criticalValue;
            uint256 normalValue;
            bool locked;
          }
          
          @stateful
          action updateCritical(uint256 value) onlyAdmin {
            require(!state.locked, "State is locked");
            state.criticalValue = value;
          }
          
          @stateful
          action updateNormal(uint256 value) onlyOperator {
            state.normalValue = value;
          }
          
          @stateful
          action lockState() onlyAdmin {
            state.locked = true;
          }
          
          @stateful
          action unlockState() onlyAdmin {
            state.locked = false;
          }
        }
      `;

      const result = compileCoinScript(source);
      
      expect(result.mainPuzzle.serialize()).toBeDefined();
      expect(result.additionalPuzzles).toBeDefined();
      expect(Object.keys(result.additionalPuzzles!)).toHaveLength(4);
    });
  });

  describe('State with External Dependencies', () => {
    test('should handle state dependent on external oracles', () => {
      const source = `
        coin OracleState {
          storage address oracle = 0xffff000000000000000000000000000000000000000000000000000000000000;
          
          state {
            uint256 price;
            uint256 lastUpdate;
            bool valid;
          }
          
          @stateful
          action updatePrice(uint256 newPrice, uint256 timestamp, bytes signature) {
            // Verify oracle signature
            requireSignature(oracle);
            
            // Ensure timestamp is newer
            require(timestamp > state.lastUpdate, "Stale price data");
            
            // Update state
            state.price = newPrice;
            state.lastUpdate = timestamp;
            state.valid = true;
          }
          
          @stateful
          action invalidate() {
            require(msg.sender == oracle, "Only oracle can invalidate");
            state.valid = false;
          }
        }
      `;

      const result = compileCoinScript(source);
      
      expect(result.mainPuzzle.serialize()).toBeDefined();
      expect(result.additionalPuzzles).toBeDefined();
    });
  });

  describe('Solution Creation for Stateful Actions', () => {
    test('should create solutions with state parameters', () => {
      const currentState = {
        counter: 5,
        lastUpdater: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      };

      const solution = createSolution()
        .addAction('increment')
        .addState(currentState)
        .build();

      const serialized = serialize(solution);
      expect(serialized).toContain('increment');
      expect(serialized).toContain('5'); // counter value
    });

    test('should handle complex state in solutions', () => {
      const complexState = {
        balances: {
          '0xaaaa': 1000,
          '0xbbbb': 2000
        },
        holder_0: '0xaaaa',
        holder_1: '0xbbbb',
        holderCount: 2,
        totalSupply: 3000,
        paused: false,
        configMaxSupply: 1000000,
        configMintFee: 100,
        configFeeRecipient: '0xcccc'
      };

      const solution = createSolution()
        .addAction('mint', ['0xdddd', 500])
        .addState(complexState)
        .build();

      const serialized = serialize(solution);
      expect(serialized).toBeDefined();
    });
  });

  describe('State Persistence', () => {
    test('should recreate coin with updated state', () => {
      const source = `
        coin PersistentState {
          state {
            uint256 version;
            bytes32 dataHash;
          }
          
          @stateful
          action upgrade(bytes32 newDataHash) {
            state.version += 1;
            state.dataHash = newDataHash;
            
            // Ensure coin recreates itself
            recreateSelf();
          }
        }
      `;

      const result = compileCoinScript(source);
      
      expect(result.mainPuzzle.serialize()).toBeDefined();
      expect(result.additionalPuzzles?.upgrade).toBeDefined();
      // Should contain logic to recreate the coin with same puzzle hash
    });
  });

  describe('State Migration', () => {
    test('should support state structure migration', () => {
      const source = `
        coin MigratableState {
          storage uint256 version = 1;
          
          state {
            // Version 1 state
            uint256 value;
            // Version 2 adds:
            address owner;
            uint256 timestamp;
          }
          
          @stateful
          action migrateToV2(address newOwner) {
            require(version == 1, "Already migrated");
            
            // Initialize new fields
            state.owner = newOwner;
            state.timestamp = currentTime();
            
            // This would need runtime support to update the version constant
          }
        }
      `;

      const result = compileCoinScript(source);
      
      expect(result.mainPuzzle.serialize()).toBeDefined();
      expect(result.additionalPuzzles).toBeDefined();
    });
  });

  describe('Error Cases', () => {
    test('should fail when accessing state without @stateful decorator', () => {
      const source = `
        coin InvalidState {
          state {
            uint256 value;
          }
          
          action getValue() {
            return state.value; // Should fail - not marked @stateful
          }
        }
      `;

      expect(() => compileCoinScript(source)).toThrow();
    });

    test('should fail with invalid state modifications', () => {
      const source = `
        coin BadStateUpdate {
          state {
            uint256 immutableValue;
          }
          
          @stateful
          action tryModify() {
            state = {}; // Should fail - cannot reassign entire state
          }
        }
      `;

      expect(() => compileCoinScript(source)).toThrow();
    });
  });

  describe('Integration with Other Patterns', () => {
    test('should work with singleton pattern', () => {
      const source = `
        @singleton
        coin SingletonState {
          storage bytes32 launcherId = 0x1111000000000000000000000000000000000000000000000000000000000000;
          
          state {
            uint256 counter;
          }
          
          @stateful
          action increment() {
            state.counter += 1;
          }
        }
      `;

      const result = compileCoinScript(source);
      
      expect(result.mainPuzzle.serialize()).toBeDefined();
      expect(result.additionalPuzzles).toBeDefined();
    });
  });
}); 