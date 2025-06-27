# Chia Puzzle Framework

> ⚠️ **DISCLAIMER**: This project is still a Work In Progress (WIP) and is not ready for production use. APIs may change, and some features may be incomplete or unstable.

A TypeScript framework for building Chia blockchain puzzles with a fluent, type-safe API and CoinScript - a high-level language for Chia smart coins.

## Table of Contents

- [Introduction to CoinScript](#introduction-to-coinscript)
  - [Basic Examples](#basic-examples)
  - [Syntax Reference](#coinscript-syntax-reference)
- [PuzzleBuilder API](#puzzlebuilder-api)
  - [Getting Started](#getting-started-with-puzzlebuilder)
  - [Building Puzzles](#building-puzzles-with-puzzlebuilder)
- [SolutionBuilder](#solutionbuilder)
  - [Creating Solutions](#creating-solutions)
- [TypeScript Tree Representation](#typescript-tree-representation)

## Introduction to CoinScript

CoinScript is a Solidity-inspired high-level language that compiles to ChiaLisp. It provides familiar syntax for developers coming from other blockchain ecosystems while generating efficient ChiaLisp code.

### Basic Examples

#### Example 1: Hello World

The simplest CoinScript program that accepts and returns conditions:

```javascript
// hello-world.coins
coin HelloWorld {
    action spend(bytes32 conditions) {
        conditions;
    }
}
```

**ChiaLisp Output:**
```lisp
(mod (ACTION . PARAMS)
  (if (= ACTION "spend")
    (f PARAMS)
    (x)
  )
)
```

#### Example 2: Basic Payment with Authorization

A payment contract that requires signature verification:

```javascript
// secure-payment.coins
coin SecurePayment {
    storage {
        address owner = "xch1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqm6ks6e8mvy";
    }
    
    action pay(address recipient, uint256 amount) {
        require(msg.sender == owner, "Not authorized");
        send(recipient, amount);
    }
}
```

**ChiaLisp Output:**
```lisp
(mod (OWNER ACTION . PARAMS)
  (defun-inline send (recipient amount)
    (list (list 51 recipient amount))
  )
  
  (if (= ACTION "pay")
    (if (= (f PARAMS) OWNER)
      (send (f (r PARAMS)) (f (r (r PARAMS))))
      (x "Not authorized")
    )
    (x)
  )
)
```

#### Example 3: Stateful Token Contract

A more complex example using state management and events:

```javascript
// stateful-token.coins
coin StatefulToken {
    storage address admin = "xch1...";
    
    state {
        uint256 totalSupply;
        mapping(address => uint256) balances;
        bool paused;
    }
    
    event Transfer(address from, address to, uint256 amount);
    event Paused(bool status);
    
    @stateful
    action mint(address to, uint256 amount) {
        require(msg.sender == admin, "Only admin can mint");
        require(!state.paused, "Contract is paused");
        
        state.totalSupply += amount;
        state.balances[to] += amount;
        
        emit Transfer(address(0), to, amount);
    }
    
    @stateful  
    action transfer(address to, uint256 amount) {
        require(!state.paused, "Contract is paused");
        require(state.balances[msg.sender] >= amount, "Insufficient balance");
        
        state.balances[msg.sender] -= amount;
        state.balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
    }
    
    @onlyAddress(admin)
    action pause() {
        state.paused = true;
        emit Paused(true);
    }
}
```

**ChiaLisp Output (Main Puzzle):**
```lisp
(mod (ADMIN STATE_HASH ACTION . PARAMS)
  (include condition_codes.clib)
  
  (defun-inline calculate-action-hash (action state)
    (sha256tree1 (c action state))
  )
  
  (defun-inline verify-merkle-proof (leaf proof root)
    ; Merkle verification logic
    ...
  )
  
  (defun create-state-coin (new-state)
    (list
      (list CREATE_COIN 
        (sha256tree1 (c (f @) new-state))
        1
      )
    )
  )
  
  ; Main dispatch logic
  (if (any (= ACTION "mint") (= ACTION "transfer") (= ACTION "pause"))
    (if (verify-merkle-proof 
          (calculate-action-hash ACTION STATE_HASH)
          (f (r PARAMS))
          (sha256tree1 ACTIONS_TREE))
      (a (f PARAMS) (c STATE_HASH (r PARAMS)))
      (x "Invalid action proof")
    )
    (x "Unknown action")
  )
)
```

## CoinScript Syntax Reference

### Data Types

- `uint256` - Unsigned 256-bit integer
- `address` - 32-byte address/puzzle hash  
- `bool` - Boolean value (true/false)
- `bytes32` - 32-byte value
- `string` - String value
- `mapping(KeyType => ValueType)` - Key-value mapping

### Storage Declaration

Storage variables are immutable and curried into the puzzle:

```javascript
storage {
    address owner = "xch1...";
    uint256 maxSupply = 1000000;
    bool transfersEnabled = true;
}
```

### State Declaration

State variables are mutable using the slot-machine pattern:

```javascript
state {
    uint256 counter;
    mapping(address => uint256) balances;
}
```

### Actions

Actions are the entry points to your contract:

```javascript
action transfer(address to, uint256 amount) {
    // Action logic
}

// Default action (no name needed in solution)
action default(bytes32 conditions) {
    conditions;
}
```

### Decorators

Modify action behavior:

```javascript
@onlyAddress(owner, admin)  // Restrict to specific addresses
@stateful                   // Enable state modifications
action sensitiveOperation() {
    // Protected logic
}
```

### Built-in Variables

- `msg.sender` - Address sending the transaction
- `msg.value` - Amount being sent
- `this` - Current contract instance

### Built-in Functions

- `require(condition, message)` - Assert condition or fail
- `send(address, amount)` - Create coin with amount
- `emit EventName(args...)` - Emit event (creates announcement)
- `sha256(value)` - Compute SHA256 hash
- `exception` or `exception("message")` - Fail with optional message

### Control Flow

```javascript
if (condition) {
    // statements
} else if (otherCondition) {
    // statements  
} else {
    // statements
}
```

### Operators

- Arithmetic: `+`, `-`, `*`, `/`, `%`
- Comparison: `>`, `<`, `>=`, `<=`, `==`, `!=`
- Logical: `&&`, `||`, `!`
- Assignment: `=`, `+=`, `-=`

### Layer System

Declare covenant layers:

```javascript
coin NFT {
    layer singleton(launcherId: 0x1234...);
    layer state();
    layer ownership(owner: 0xabcd..., transferProgram: 0xdef0...);
    layer royalty(address: 0x5678..., percentage: 5);
    
    // Contract logic...
}
```

## PuzzleBuilder API

The PuzzleBuilder provides a fluent, type-safe TypeScript API for constructing Chia puzzles directly.

### Getting Started with PuzzleBuilder

```typescript
import { createPuzzle, expr, amount } from 'chia-puzzle-framework';

// Simple payment puzzle
const puzzle = createPuzzle()
  .requireSignature(publicKey)
  .createCoin(recipientPuzzleHash, amount)
  .build();

// Convert to ChiaLisp
console.log(puzzle.serialize({ indent: true }));
```

### Building Puzzles with PuzzleBuilder

#### Basic Operations

```typescript
const puzzle = createPuzzle()
  // Coin creation
  .createCoin(puzzleHash, 1000000)
  .createCoin(puzzleHash2, amount.divide(2), "memo")
  
  // Signatures
  .requireSignature(pubkey)
  .requireMySignature(pubkey)
  .requireSignatureUnsafe(pubkey, message)
  
  // Time locks
  .requireAfterSeconds(3600)
  .requireAfterHeight(1000000)
  .requireBeforeSeconds(7200)
  .requireBeforeHeight(2000000)
  
  // Fees
  .reserveFee(50)
  
  // Announcements
  .createAnnouncement("hello")
  .assertAnnouncement(announcementId)
  
  // Assertions
  .assertMyPuzzleHash(hash)
  .assertMyCoinId(coinId)
  
  .build();
```

#### Expressions

Build complex calculations with type-safe expressions:

```typescript
import { expr, amount } from 'chia-puzzle-framework';

const fee = expr(50);
const commission = amount.multiply(0.01); // 1% commission
const half = amount.divide(2);
const total = amount.add(fee);

const puzzle = createPuzzle()
  .if(amount.greaterThan(1000000))
    .then(b => b.createCoin(addr1, half))
    .else(b => b.createCoin(addr2, amount))
  .reserveFee(fee)
  .build();
```

#### Control Flow

```typescript
// If/else conditions
const conditional = createPuzzle()
  .if(amount.greaterThan(threshold))
    .then(b => b
      .requireSignature(adminKey)
      .createCoin(treasuryAddr, amount)
    )
    .else(b => b
      .requireSignature(userKey)
      .createCoin(userAddr, amount)
    )
  .build();

// Multiple conditions
const multiCondition = createPuzzle()
  .if(amount.greaterThan(1000000))
    .then(b => b.requireSignature(adminKey))
  .elseIf(amount.greaterThan(100000), b => b
    .requireSignature(moderatorKey)
  )
  .else(b => b.requireSignature(userKey))
  .createCoin(recipient, amount)
  .build();
```

#### Loops and Iteration

```typescript
// Distribute to multiple recipients
const recipients = [addr1, addr2, addr3, addr4];

const distributor = createPuzzle()
  .forEach(recipients, (recipient, index, builder) => {
    builder.createCoin(recipient, amount.divide(recipients.length));
  })
  .build();

// Repeat pattern
const repeated = createPuzzle()
  .repeat(5, (index, builder) => {
    builder.createCoin(`addr${index}`, 1000 * (index + 1));
  })
  .build();
```

#### Composition

```typescript
// Reusable components
const authComponent = puzzle()
  .requireSignature(authPubkey)
  .requireAfterHeight(100000);

const paymentComponent = puzzle()
  .createCoin(recipient, amount)
  .reserveFee(50);

// Merge components
const finalPuzzle = createPuzzle()
  .merge(authComponent)
  .merge(paymentComponent)
  .build();
```

#### Common Patterns

```typescript
// Pay to delegated puzzle
const delegated = createPuzzle()
  .delegatedPuzzle()
  .build();

// Pay to conditions
const p2c = createPuzzle()
  .payToConditions()
  .build();

// Pay to public key
const p2pk = createPuzzle()
  .payToPublicKey(publicKey)
  .build();
```

#### Mod Structure Support

```typescript
// Create a module with curried parameters
const modulesPuzzle = createPuzzle()
  .includeStandardLibraries()
  .withCurriedParams({
    OWNER: ownerPuzzleHash,
    TIMEOUT: 3600,
    FEE_ADDRESS: feeCollector
  })
  .withSolutionParams('recipient', 'amount')
  .comment('Check owner authorization')
  .requireSignature(puzzle().param('OWNER'))
  .comment('Create payment with fee')
  .createCoin(puzzle().param('recipient'), puzzle().param('amount').multiply(0.99))
  .createCoin(puzzle().param('FEE_ADDRESS'), puzzle().param('amount').multiply(0.01))
  .build();
```

## SolutionBuilder

The SolutionBuilder provides a fluent API for creating solutions (spending scripts) for puzzles.

### Creating Solutions

#### Basic Solutions

```typescript
import { createSolution } from 'chia-puzzle-framework';

// Simple solution with conditions
const solution = createSolution()
  .addConditions(conditions => {
    conditions
      .createCoin('0x' + '11'.repeat(32), 1000000)
      .reserveFee(50)
      .requireSignature('0xpubkey...');
  })
  .build();
```

#### Complex Solutions

```typescript
// Solution with multiple parameters
const solution = createSolution()
  .add('transfer')  // Action name
  .add('0xrecipient...')  // Recipient
  .add(500000)  // Amount
  .addList(builder => {
    builder.add('metadata1');
    builder.add('metadata2');
  })
  .build();

// Stateful solution
const statefulSolution = createSolution()
  .addAction('mint', ['0xrecipient...', 1000000])
  .addState({
    totalSupply: 1000000,
    balances: new Map([
      ['0xaddr1...', 500000],
      ['0xaddr2...', 500000]
    ]),
    paused: false
  })
  .addMerkleProof([
    '0xhash1...',
    '0xhash2...',
    '0xhash3...'
  ])
  .build();
```

#### Solution Patterns

```typescript
// Delegated puzzle solution
const delegatedSolution = createSolution()
  .addDelegatedPuzzle(delegatedPuzzle, delegatedSolution)
  .build();

// Multiple outputs
const multiOutput = createSolution()
  .addConditions(c => {
    c.createCoin(addr1, 300000)
     .createCoin(addr2, 300000)
     .createCoin(addr3, 350000)
     .reserveFee(50000)
     .createAnnouncement('batch payment complete');
  })
  .build();

// Time-locked solution
const timeLocked = createSolution()
  .addConditions(c => {
    c.requireAfterHeight(1000000)
     .requireSignature(pubkey)
     .createCoin(recipient, amount);
  })
  .build();
```

#### Serialization

```typescript
// Convert to ChiaLisp string
const chialispStr = solution.serialize({ indent: true });
console.log(chialispStr);
// Output: ((51 0x1111... 1000000) (52 50))

// Convert to hex for spend bundles
const hexStr = solution.toHex();
console.log(hexStr);
// Output: 0xff8351ff821111...
```

## TypeScript Tree Representation

The framework represents ChiaLisp programs as a tree structure in memory, enabling easy manipulation and transformation before serialization.

### Core Types

```typescript
// Base type for all tree nodes
type TreeNode = Atom | List | Cons;

// Single value node
interface Atom {
  type: 'atom';
  value: number | bigint | Uint8Array | string | boolean | null;
}

// Proper list (nil-terminated)
interface List {
  type: 'list';
  items: TreeNode[];
}

// Improper list (cons pair)
interface Cons {
  type: 'cons';
  first: TreeNode;
  rest: TreeNode;
}
```

### Tree Construction

```typescript
import { list, atom, int, hex, sym } from 'chia-puzzle-framework';

// Create atoms
const numberAtom = int(42);
const hexAtom = hex('0xdeadbeef');
const symbolAtom = sym('CREATE_COIN');

// Create lists
const simpleList = list([int(51), hex('0x1234...'), int(1000)]);
const nestedList = list([
  sym('if'),
  list([sym('='), sym('amount'), int(1000)]),
  list([int(51), hex('0xaddr1...'), int(500)]),
  list([int(51), hex('0xaddr2...'), int(1000)])
]);
```

### Tree Transformation

The framework transforms high-level constructs to ChiaLisp:

1. **CoinScript Parse**: Text → AST
2. **AST Transform**: AST → PuzzleBuilder calls
3. **Builder Execution**: PuzzleBuilder → TreeNode structure
4. **Serialization**: TreeNode → ChiaLisp text

Example transformation:

```typescript
// CoinScript
"send(recipient, 1000)"

// AST
{
  type: 'function_call',
  name: 'send',
  args: [
    { type: 'identifier', name: 'recipient' },
    { type: 'number', value: 1000 }
  ]
}

// PuzzleBuilder
builder.createCoin(recipient, 1000)

// TreeNode
{
  type: 'list',
  items: [
    { type: 'atom', value: 51 },  // CREATE_COIN opcode
    { type: 'atom', value: 'recipient_puzzle_hash' },
    { type: 'atom', value: 1000 }
  ]
}

// ChiaLisp
"(51 0xrecipient_puzzle_hash 1000)"
```

### Hashing and Validation

```typescript
import { sha256tree, serialize } from 'chia-puzzle-framework';

// Calculate puzzle hash
const puzzleHash = sha256tree(puzzleTree);

// Serialize for network
const serialized = serialize(puzzleTree, { 
  indent: true,
  useKeywords: true 
});

// Validate structure
function validateTree(node: TreeNode): boolean {
  if (isAtom(node)) {
    return node.value !== undefined;
  }
  if (isList(node)) {
    return node.items.every(validateTree);
  }
  if (isCons(node)) {
    return validateTree(node.first) && validateTree(node.rest);
  }
  return false;
}
```

### Memory Efficiency

The tree representation is designed for efficiency:

- **Shared Structure**: Common subtrees can be reused
- **Lazy Evaluation**: Trees are built on-demand
- **Type Safety**: TypeScript ensures valid structures at compile time
- **Immutability**: Trees are immutable, enabling safe sharing

## Contributing

This project is under active development. Contributions, bug reports, and feature requests are welcome!

## License

[MIT License](LICENSE)

---

*Note: This framework is not affiliated with Chia Network Inc. Always test thoroughly on testnet before mainnet deployment.*