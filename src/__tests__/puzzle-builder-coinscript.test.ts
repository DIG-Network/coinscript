/**
 * CoinScript Compilation Tests
 * 
 * Tests for compiling various CoinScript permutations
 */

import { 
  compileCoinScript,
  puzzle,
  PuzzleBuilder
} from '../index';

describe('PuzzleBuilder - CoinScript Compilation', () => {
  describe('Basic CoinScript Compilation', () => {
    test('should compile simple payment coin', () => {
      const code = `
        coin SimplePayment {
          action pay(address recipient) {
            send(recipient, msg.value);
          }
        }
      `;
      
      const result = compileCoinScript(code);
      expect(result.mainPuzzle).toBeInstanceOf(PuzzleBuilder);
      
      const serialized = result.mainPuzzle.serialize();
      expect(serialized).toContain('mod');
      expect(serialized).toContain('51'); // CREATE_COIN
    });

    test('should compile coin with constructor', () => {
      const code = `
        coin TokenWithOwner {
          storage {
            owner: Address;
          }
          
          constructor(address initialOwner) {
            owner = initialOwner;
          }
          
          action transfer(address to) {
            require(msg.sender == owner);
            send(to, msg.value);
          }
        }
      `;
      
      const result = compileCoinScript(code);
      expect(result.mainPuzzle).toBeInstanceOf(PuzzleBuilder);
      
      const serialized = result.mainPuzzle.serialize();
      expect(serialized).toContain('owner');
      expect(serialized).toContain('initialOwner');
    });

    test('should compile coin with multiple actions', () => {
      const code = `
        coin MultiAction {
          action pay(address recipient) {
            send(recipient, msg.value);
          }
          
          action split(address recipient1, address recipient2, uint amount1) {
            send(recipient1, amount1);
            send(recipient2, msg.value - amount1);
          }
          
          action burn() {
            // No send, effectively burns the coin
          }
        }
      `;
      
      const p = compileCoinScript(code);
      const serialized = p.serialize();
      
      // Should have action dispatch logic
      expect(serialized).toContain('if');
      expect(serialized).toContain('action');
    });
  });

  describe('Storage and State', () => {
    test('should compile coin with storage variables', () => {
      const code = `
        coin Counter {
          storage {
            count: uint;
            lastUser: Address;
          }
          
          action increment() {
            count = count + 1;
            lastUser = msg.sender;
          }
          
          action reset() {
            count = 0;
          }
        }
      `;
      
      const p = compileCoinScript(code);
      const serialized = p.serialize();
      
      expect(serialized).toContain('count');
      expect(serialized).toContain('lastUser');
      expect(serialized).toContain('+'); // Addition for increment
    });

    test('should compile coin with complex state transitions', () => {
      const code = `
        coin StateMachine {
          storage {
            state: uint;
            owner: Address;
          }
          
          constructor(address initialOwner) {
            state = 0;
            owner = initialOwner;
          }
          
          action advance() {
            require(msg.sender == owner);
            if (state < 3) {
              state = state + 1;
            } else {
              state = 0;
            }
          }
          
          action finalize() {
            require(state == 3);
            send(owner, msg.value);
          }
        }
      `;
      
      const p = compileCoinScript(code);
      const serialized = p.serialize();
      
      expect(serialized).toContain('state');
      expect(serialized).toContain('if');
      expect(serialized).toContain('<'); // Less than comparison
    });
  });

  describe('Events and Announcements', () => {
    test('should compile coin with events', () => {
      const code = `
        coin EventEmitter {
          event Transfer(address from, address to, uint amount);
          event Approval(address owner, address spender);
          
          action transfer(address to, uint amount) {
            emit Transfer(msg.sender, to, amount);
            send(to, amount);
          }
          
          action approve(address spender) {
            emit Approval(msg.sender, spender);
          }
        }
      `;
      
      const p = compileCoinScript(code);
      const serialized = p.serialize();
      
      // Events should create announcements
      expect(serialized).toContain('60'); // CREATE_COIN_ANNOUNCEMENT
    });

    test('should compile coin with cross-coin messaging', () => {
      const code = `
        coin Messenger {
          action sendMessage(address target, string message) {
            announce(message);
            notify(target, message);
          }
          
          action receiveMessage(string expectedMessage) {
            require(hasAnnouncement(expectedMessage));
          }
        }
      `;
      
      const p = compileCoinScript(code);
      const serialized = p.serialize();
      
      expect(serialized).toContain('60'); // CREATE_COIN_ANNOUNCEMENT
      expect(serialized).toContain('61'); // ASSERT_COIN_ANNOUNCEMENT
    });
  });

  describe('Access Control', () => {
    test('should compile coin with role-based access', () => {
      const code = `
        coin RoleBasedAccess {
          storage {
            admin: Address;
            operators: Address[];
          }
          
          modifier onlyAdmin() {
            require(msg.sender == admin);
            _;
          }
          
          modifier onlyOperator() {
            bool isOperator = false;
            for (uint i = 0; i < operators.length; i++) {
              if (operators[i] == msg.sender) {
                isOperator = true;
                break;
              }
            }
            require(isOperator);
            _;
          }
          
          action addOperator(address operator) onlyAdmin {
            operators.push(operator);
          }
          
          action operate() onlyOperator {
            send(admin, msg.value);
          }
        }
      `;
      
      const p = compileCoinScript(code);
      const serialized = p.serialize();
      
      expect(serialized).toContain('admin');
      expect(serialized).toContain('operators');
      expect(serialized).toContain('require');
    });

    test('should compile coin with time-based access', () => {
      const code = `
        coin TimeLocked {
          storage {
            unlockTime: uint;
            beneficiary: Address;
          }
          
          constructor(uint lockDuration, address recipient) {
            unlockTime = block.timestamp + lockDuration;
            beneficiary = recipient;
          }
          
          action withdraw() {
            require(block.timestamp >= unlockTime);
            require(msg.sender == beneficiary);
            send(beneficiary, msg.value);
          }
        }
      `;
      
      const p = compileCoinScript(code);
      const serialized = p.serialize();
      
      expect(serialized).toContain('unlockTime');
      expect(serialized).toContain('80'); // Time assertion
    });
  });

  describe('Complex Patterns', () => {
    test('should compile escrow coin', () => {
      const code = `
        coin Escrow {
          storage {
            buyer: Address;
            seller: Address;
            arbiter: Address;
            state: uint; // 0: pending, 1: completed, 2: disputed
          }
          
          constructor(address _buyer, address _seller, address _arbiter) {
            buyer = _buyer;
            seller = _seller;
            arbiter = _arbiter;
            state = 0;
          }
          
          action release() {
            require(msg.sender == buyer || msg.sender == arbiter);
            require(state == 0);
            state = 1;
            send(seller, msg.value);
          }
          
          action refund() {
            require(msg.sender == seller || msg.sender == arbiter);
            require(state == 0);
            state = 1;
            send(buyer, msg.value);
          }
          
          action dispute() {
            require(msg.sender == buyer || msg.sender == seller);
            require(state == 0);
            state = 2;
          }
          
          action resolve(address recipient) {
            require(msg.sender == arbiter);
            require(state == 2);
            state = 1;
            send(recipient, msg.value);
          }
        }
      `;
      
      const p = compileCoinScript(code);
      const serialized = p.serialize();
      
      expect(serialized).toContain('buyer');
      expect(serialized).toContain('seller');
      expect(serialized).toContain('arbiter');
      expect(serialized).toContain('state');
      expect(serialized.match(/if/g)?.length).toBeGreaterThan(1);
    });

    test('should compile multi-signature wallet', () => {
      const code = `
        coin MultiSigWallet {
          storage {
            owners: Address[];
            threshold: uint;
            nonce: uint;
          }
          
          constructor(address[] memory _owners, uint _threshold) {
            owners = _owners;
            threshold = _threshold;
            nonce = 0;
          }
          
          action execute(address to, uint amount, uint currentNonce, bytes[] signatures) {
            require(currentNonce == nonce);
            require(signatures.length >= threshold);
            
            // Verify signatures
            for (uint i = 0; i < signatures.length; i++) {
              requireSignature(owners[i], signatures[i]);
            }
            
            nonce = nonce + 1;
            send(to, amount);
          }
        }
      `;
      
      const p = compileCoinScript(code);
      const serialized = p.serialize();
      
      expect(serialized).toContain('owners');
      expect(serialized).toContain('threshold');
      expect(serialized).toContain('50'); // AGG_SIG_ME
    });

    test('should compile token with ownership transfer', () => {
      const code = `
        coin OwnableToken {
          storage {
            owner: Address;
            pendingOwner: Address;
          }
          
          modifier onlyOwner() {
            require(msg.sender == owner);
            _;
          }
          
          action transferOwnership(address newOwner) onlyOwner {
            pendingOwner = newOwner;
          }
          
          action acceptOwnership() {
            require(msg.sender == pendingOwner);
            owner = pendingOwner;
            pendingOwner = address(0);
          }
          
          action withdraw(address to, uint amount) onlyOwner {
            send(to, amount);
          }
        }
      `;
      
      const p = compileCoinScript(code);
      const serialized = p.serialize();
      
      expect(serialized).toContain('owner');
      expect(serialized).toContain('pendingOwner');
    });
  });

  describe('Layer Integration', () => {
    test('should compile coin with singleton layer', () => {
      const code = `
        coin SingletonToken {
          using SingletonLayer;
          
          storage {
            totalSupply: uint;
          }
          
          action mint(uint amount) {
            totalSupply = totalSupply + amount;
          }
        }
      `;
      
      const p = compileCoinScript(code);
      const serialized = p.serialize();
      
      expect(serialized).toContain('singleton');
    });

    test('should compile coin with notification layer', () => {
      const code = `
        coin NotifiableToken {
          using NotificationLayer;
          
          action transfer(address to, uint amount) {
            send(to, amount);
            notify(to, "transfer", amount);
          }
        }
      `;
      
      const p = compileCoinScript(code);
      const serialized = p.serialize();
      
      expect(serialized).toContain('66'); // SEND_MESSAGE
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should compile coin with require statements', () => {
      const code = `
        coin RequireExample {
          action withdraw(uint amount) {
            require(amount > 0, "Amount must be positive");
            require(amount <= msg.value, "Insufficient balance");
            send(msg.sender, amount);
          }
        }
      `;
      
      const p = compileCoinScript(code);
      const serialized = p.serialize();
      
      expect(serialized).toContain('assert');
      expect(serialized).toContain('>'); // Greater than
    });

    test('should compile coin with default action', () => {
      const code = `
        coin DefaultAction {
          action default() {
            send(msg.sender, msg.value);
          }
          
          action specific(address to) {
            send(to, msg.value);
          }
        }
      `;
      
      const p = compileCoinScript(code);
      const serialized = p.serialize();
      
      // Should handle default action
      expect(serialized).toContain('default');
    });

    test('should compile coin with inheritance', () => {
      const code = `
        abstract coin Ownable {
          storage {
            owner: Address;
          }
          
          modifier onlyOwner() {
            require(msg.sender == owner);
            _;
          }
        }
        
        coin OwnedVault extends Ownable {
          action withdraw(address to, uint amount) onlyOwner {
            send(to, amount);
          }
        }
      `;
      
      const p = compileCoinScript(code);
      const serialized = p.serialize();
      
      expect(serialized).toContain('owner');
      expect(serialized).toContain('onlyOwner');
    });
  });

  describe('Optimization Patterns', () => {
    test('should compile coin with gas optimization patterns', () => {
      const code = `
        coin Optimized {
          storage {
            // Pack multiple values into single storage slot
            packed: uint256; // bits 0-127: balance, 128-159: nonce, 160-255: flags
          }
          
          function getBalance() view returns (uint128) {
            return uint128(packed);
          }
          
          function getNonce() view returns (uint32) {
            return uint32(packed >> 128);
          }
          
          action updateBalance(uint128 newBalance) {
            packed = (packed & ~uint256(0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)) | uint256(newBalance);
          }
        }
      `;
      
      const p = compileCoinScript(code);
      const serialized = p.serialize();
      
      expect(serialized).toContain('packed');
      expect(serialized).toContain('>>'); // Bit shift
    });
  });
});