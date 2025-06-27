# Chia Puzzle Framework

> ⚠️ **DISCLAIMER**: This project is still a Work In Progress (WIP) and is not ready for production use. APIs may change, and some features may be incomplete or unstable.

A TypeScript framework for building Chia blockchain puzzles with a fluent, type-safe API and CoinScript - a high-level language for Chia smart coins.

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [CoinScript](#coinscript)
  - [Introduction](#introduction)
  - [Progressive Examples](#progressive-examples)
  - [Comprehensive Syntax Reference](#comprehensive-syntax-reference)
- [PuzzleBuilder & SolutionBuilder](#puzzlebuilder--solutionbuilder)
  - [Introduction](#introduction-1)
  - [PuzzleBuilder Examples](#puzzlebuilder-examples)
  - [Comprehensive PuzzleBuilder Guide](#comprehensive-puzzlebuilder-guide)
  - [Comprehensive SolutionBuilder Guide](#comprehensive-solutionbuilder-guide)
- [Internal Architecture](#internal-architecture)
  - [TypeScript Puzzle Tree Representation](#typescript-puzzle-tree-representation)
  - [ChiaLisp Conversion Process](#chialisp-conversion-process)

## Overview

The Chia Puzzle Framework provides two powerful ways to create Chia blockchain puzzles:

1. **CoinScript** - A Solidity-inspired high-level language that compiles to ChiaLisp
2. **PuzzleBuilder API** - A fluent, type-safe TypeScript API for direct puzzle construction

Both approaches compile to efficient ChiaLisp code that runs on the Chia blockchain.

## Installation

```bash
npm install chia-puzzle-framework
```

## CoinScript

### Introduction

CoinScript is a high-level language designed to make Chia puzzle development accessible to developers familiar with smart contract languages like Solidity. It compiles to optimized ChiaLisp using the PuzzleBuilder API under the hood.

### Progressive Examples

#### Example 1: Basic Payment Contract

Let's start with the simplest possible contract - a payment forwarder:

```coinscript
// payment-forwarder.coins
coin PaymentForwarder {
    // Simply forward any payment to a predefined address
    action forward(address recipient) {
        send(recipient, msg.value);
    }
}
```

This contract takes any incoming payment and forwards it to the specified recipient address.

#### Example 2: Access-Controlled Wallet

Now let's add ownership and access control:

```coinscript
// secure-wallet.coins
coin SecureWallet {
    // Storage variables are immutable and part of the puzzle
    storage {
        address owner = 0xabcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab;
        uint256 dailyLimit = 1000000; // mojos
    }
    
    // Events create announcements on the blockchain
    event Withdrawal(address recipient, uint256 amount);
    event LimitExceeded(uint256 requested, uint256 limit);
    
    // Withdraw funds with daily limit
    action withdraw(address recipient, uint256 amount) {
        // Access control
        require(msg.sender == owner, "Only owner can withdraw");
        
        // Check daily limit
        if (amount > dailyLimit) {
            emit LimitExceeded(amount, dailyLimit);
            exception("Amount exceeds daily limit");
        }
        
        // Send funds and emit event
        send(recipient, amount);
        emit Withdrawal(recipient, amount);
    }
    
    // Emergency withdrawal (no limit)
    @onlyAddress(owner)
    action emergencyWithdraw(address recipient) {
        send(recipient, msg.value);
    }
}
```

This contract introduces:
- Storage variables for configuration
- Access control with `require` statements
- Events for tracking activity
- Decorators for cleaner access control
- Conditional logic with proper error handling

#### Example 3: Stateful Token with Advanced Features

Our most complex example - a full-featured token contract:

```coinscript
// advanced-token.coins
coin AdvancedToken {
    // Configuration
    storage {
        address admin = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
        string name = "MyToken";
        string symbol = "MTK";
        uint256 maxSupply = 1000000000; // 1 billion
    }
    
    // Mutable state using slot-machine pattern
    state {
        uint256 totalSupply;
        mapping(address => uint256) balances;
        mapping(address => mapping(address => uint256)) allowances;
        bool paused;
        address pendingAdmin;
    }
    
    // Events
    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);
    event Mint(address indexed to, uint256 amount);
    event Burn(address indexed from, uint256 amount);
    event Paused();
    event Unpaused();
    event AdminTransferInitiated(address indexed newAdmin);
    event AdminTransferCompleted(address indexed oldAdmin, address indexed newAdmin);
    
    // Modifiers via decorators
    @onlyAddress(admin)
    @stateful
    action mint(address to, uint256 amount) {
        require(!state.paused, "Contract is paused");
        require(state.totalSupply + amount <= maxSupply, "Would exceed max supply");
        
        state.totalSupply += amount;
        state.balances[to] += amount;
        
        emit Mint(to, amount);
        emit Transfer(address(0), to, amount);
    }
    
    @stateful
    action transfer(address to, uint256 amount) {
        require(!state.paused, "Contract is paused");
        require(state.balances[msg.sender] >= amount, "Insufficient balance");
        require(to != address(0), "Cannot transfer to zero address");
        
        state.balances[msg.sender] -= amount;
        state.balances[to] += amount;
        
        emit Transfer(msg.sender, to, amount);
    }
    
    @stateful
    action approve(address spender, uint256 amount) {
        require(!state.paused, "Contract is paused");
        state.allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
    }
    
    @stateful
    action transferFrom(address from, address to, uint256 amount) {
        require(!state.paused, "Contract is paused");
        require(state.allowances[from][msg.sender] >= amount, "Allowance exceeded");
        require(state.balances[from] >= amount, "Insufficient balance");
        
        state.allowances[from][msg.sender] -= amount;
        state.balances[from] -= amount;
        state.balances[to] += amount;
        
        emit Transfer(from, to, amount);
    }
    
    @stateful
    action burn(uint256 amount) {
        require(state.balances[msg.sender] >= amount, "Insufficient balance");
        
        state.balances[msg.sender] -= amount;
        state.totalSupply -= amount;
        
        emit Burn(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount);
    }
    
    // Admin functions
    @onlyAddress(admin)
    @stateful
    action pause() {
        require(!state.paused, "Already paused");
        state.paused = true;
        emit Paused();
    }
    
    @onlyAddress(admin)
    @stateful
    action unpause() {
        require(state.paused, "Not paused");
        state.paused = false;
        emit Unpaused();
    }
    
    // Two-step admin transfer for safety
    @onlyAddress(admin)
    @stateful
    action initiateAdminTransfer(address newAdmin) {
        require(newAdmin != address(0), "Invalid admin address");
        state.pendingAdmin = newAdmin;
        emit AdminTransferInitiated(newAdmin);
    }
    
    @stateful
    action acceptAdminTransfer() {
        require(msg.sender == state.pendingAdmin, "Not pending admin");
        address oldAdmin = admin;
        admin = state.pendingAdmin;
        state.pendingAdmin = address(0);
        emit AdminTransferCompleted(oldAdmin, admin);
    }
    
    // View functions (non-stateful)
    action getBalance(address account) view returns (uint256) {
        return state.balances[account];
    }
    
    action getAllowance(address owner, address spender) view returns (uint256) {
        return state.allowances[owner][spender];
    }
}
```

This advanced example demonstrates:
- Complex state management with mappings
- Multiple access control patterns
- Emergency pause functionality
- Two-step admin transfer for security
- View functions for reading state
- Comprehensive event logging
- Input validation and error handling

### Comprehensive Syntax Reference

#### Contract Structure

```coinscript
coin ContractName {
    // Optional layer declarations
    layer singleton(launcherId: 0x...);
    layer state();
    layer ownership(owner: 0x..., transferProgram: 0x...);
    
    // Immutable storage (part of puzzle)
    storage {
        dataType variableName = initialValue;
    }
    
    // Mutable state (stored in coin memo)
    state {
        dataType stateVariable;
        mapping(keyType => valueType) mappingName;
    }
    
    // Events (create announcements)
    event EventName(dataType param1, dataType param2);
    
    // Actions (entry points)
    action actionName(dataType param1) {
        // Action body
    }
    
    // View functions (read-only)
    action viewFunction() view returns (dataType) {
        return value;
    }
}
```

#### Data Types

- **Basic Types**:
  - `uint256` - 256-bit unsigned integer
  - `int256` - 256-bit signed integer (coming soon)
  - `address` - 32-byte address/puzzle hash
  - `bool` - Boolean value (true/false)
  - `bytes32` - 32-byte value
  - `string` - UTF-8 string

- **Complex Types**:
  - `mapping(KeyType => ValueType)` - Key-value mapping
  - Arrays (coming soon): `uint256[]`, `address[]`
  - Structs (coming soon)

#### Built-in Variables

- `msg.sender` - Address of the transaction sender
- `msg.value` - Amount of mojos being sent
- `this` - Current contract instance
- `block.height` - Current block height
- `block.timestamp` - Current block timestamp

#### Built-in Functions

- **Transfer Functions**:
  - `send(address, amount)` - Send coins to address
  - `transfer(address, amount)` - Same as send (alias)

- **Validation Functions**:
  - `require(condition, message)` - Assert condition or fail
  - `assert(condition)` - Assert without message
  - `exception(message?)` - Fail execution

- **Cryptographic Functions**:
  - `sha256(value)` - Compute SHA256 hash
  - `pubkey(value)` - Get public key from value
  - `verify(pubkey, message, signature)` - Verify signature

- **Utility Functions**:
  - `address(value)` - Convert to address type
  - `uint256(value)` - Convert to uint256

#### Operators

- **Arithmetic**: `+`, `-`, `*`, `/`, `%`, `**`
- **Comparison**: `>`, `<`, `>=`, `<=`, `==`, `!=`
- **Logical**: `&&`, `||`, `!`
- **Bitwise**: `&`, `|`, `^`, `~`, `<<`, `>>`
- **Assignment**: `=`, `+=`, `-=`, `*=`, `/=`

#### Control Flow

```coinscript
// If-else statements
if (condition) {
    // statements
} else if (otherCondition) {
    // statements
} else {
    // statements
}

// Loops (coming soon)
for (uint256 i = 0; i < 10; i++) {
    // statements
}

while (condition) {
    // statements
}

// Early return
if (condition) {
    return value;
}
```

#### Decorators

Decorators modify action behavior:

```coinscript
// Access control
@onlyAddress(address1, address2, ...)
action restrictedAction() {
    // Only specified addresses can call
}

// Stateful actions (use slot-machine pattern)
@stateful
action modifyState() {
    state.value = newValue;
}

// Payable actions (coming soon)
@payable
action acceptPayment() {
    // Can receive payments
}

// View functions (read-only)
@view
action readData() returns (uint256) {
    return state.value;
}
```

#### Layer Declarations

```coinscript
// Singleton layer (unique coin)
layer singleton(launcherId: 0x...);

// State layer (mutable state)
layer state();

// Ownership layer
layer ownership(owner: 0x..., transferProgram: 0x...);

// Royalty layer (for NFTs)
layer royalty(address: 0x..., percentage: 500); // 5%

// Metadata layer
layer metadata(metadata: {name: "NFT", uri: "ipfs://..."});

// Custom layers
layer customLayer(param1: value1, param2: value2);
```

#### Compilation

```javascript
import { compileCoinScript, parseCoinScriptFile } from 'chia-puzzle-framework';

// Compile from string
const result = compileCoinScript(`
    coin MyContract {
        action pay(address to) {
            send(to, msg.value);
        }
    }
`);

// Compile from file
const result2 = parseCoinScriptFile('./contract.coins');

// Access compiled puzzles
const mainPuzzle = result.mainPuzzle;
const actionPuzzles = result.additionalPuzzles; // For stateful actions
const metadata = result.metadata;

// Convert to ChiaLisp
console.log(mainPuzzle.serialize());
```

## PuzzleBuilder & SolutionBuilder

### Introduction

The PuzzleBuilder provides a fluent, type-safe API for constructing Chia puzzles directly in TypeScript. It offers fine-grained control over puzzle construction and is used internally by the CoinScript compiler.

The SolutionBuilder complements PuzzleBuilder by providing a similar API for constructing solutions (the data passed to puzzles when spending coins).

### PuzzleBuilder Examples

#### Example 1: Simple Payment Puzzle

```typescript
import { createPuzzle, amount } from 'chia-puzzle-framework';

// Basic payment requiring signature
const paymentPuzzle = createPuzzle()
  .requireSignature('0xpubkey1234...')
  .createCoin('0xrecipient...', amount)
  .build();

console.log(paymentPuzzle.serialize());
```

#### Example 2: Time-Locked Escrow

```typescript
import { createPuzzle, expr, variable } from 'chia-puzzle-framework';

const escrowPuzzle = createPuzzle()
  .withSolutionParams('release_flag', 'recipient', 'refund_height')
  .if(variable('release_flag').equals(1))
    .then(builder => builder
      .comment('Released by seller')
      .requireSignature('0xsellerPubkey...')
      .createCoin(variable('recipient'), expr(1000000))
    )
    .else(builder => builder
      .comment('Refund after timeout')
      .requireAfterHeight(variable('refund_height'))
      .requireSignature('0xbuyerPubkey...')
      .createCoin('0xbuyerAddress...', expr(1000000))
    )
  .build();
```

#### Example 3: Multi-Signature Wallet with Threshold

```typescript
import { createPuzzle, amount, expr } from 'chia-puzzle-framework';

const pubkeys = [
  '0xpubkey1...',
  '0xpubkey2...',
  '0xpubkey3...'
];

const multiSigPuzzle = createPuzzle()
  .withSolutionParams('signatures_provided', 'destination', 'amount')
  .comment('Require at least 2 of 3 signatures')
  .let('sig_count', expr(0))
  .forEach(pubkeys, (pubkey, index, builder) => {
    builder.if(
      variable(`signatures_provided`).at(index).equals(1),
      b => b.merge(
        createPuzzle()
          .requireSignature(pubkey)
          .let('sig_count', variable('sig_count').add(1))
      )
    );
  })
  .assert(variable('sig_count').greaterThanOrEqual(2))
  .createCoin(variable('destination'), variable('amount'))
  .build();
```

### Comprehensive PuzzleBuilder Guide

#### Core Concepts

The PuzzleBuilder API is built around method chaining, where each method returns the builder instance for continued construction:

```typescript
const puzzle = createPuzzle()
  .method1()
  .method2()
  .method3()
  .build();
```

#### Creating Puzzles

```typescript
import { createPuzzle, puzzle } from 'chia-puzzle-framework';

// Start a new puzzle
const myPuzzle = createPuzzle();

// Or use the alias
const myPuzzle2 = puzzle();
```

#### Parameters and Variables

```typescript
// Define solution parameters
const p = createPuzzle()
  .withSolutionParams('amount', 'recipient', 'timeout')
  
// Define curried parameters (compile-time constants)
.withCurriedParams({
  OWNER: '0xowner...',
  FEE: 50
})

// Use parameters in conditions
.createCoin(
  createPuzzle().param('recipient'),
  createPuzzle().param('amount')
);
```

#### Conditions

**Spend Conditions:**
```typescript
// Create coin
.createCoin(puzzleHash, amount)

// Reserve fee
.reserveFee(feeAmount)

// Require signature
.requireSignature(publicKey)

// Create coin announcement
.createCoinAnnouncement(message)

// Assert coin announcement
.assertCoinAnnouncement(announcementId)
```

**Time Conditions:**
```typescript
// Absolute time
.requireAfterSeconds(unixTimestamp)
.requireBeforeSeconds(unixTimestamp)

// Relative time
.requireSecondsRelative(seconds)

// Block height
.requireAfterHeight(height)
.requireBeforeHeight(height)
.requireHeightRelative(blocks)
```

**Puzzle Conditions:**
```typescript
// Assert puzzle announcement
.assertPuzzleAnnouncement(announcementId)

// Create puzzle announcement
.createPuzzleAnnouncement(message)

// Assert my coin ID
.assertMyCoinId(coinId)

// Assert my parent ID
.assertMyParentId(parentId)

// Assert my puzzle hash
.assertMyPuzzleHash(puzzleHash)

// Assert my amount
.assertMyAmount(amount)
```

#### Control Flow

**If-Else Statements:**
```typescript
const conditional = createPuzzle()
  .if(amount.greaterThan(1000))
    .then(b => b.createCoin(addr1, amount))
    .elseIf(amount.greaterThan(500), b => b
      .createCoin(addr2, amount)
    )
    .else(b => b
      .createCoin(addr3, amount)
    );
```

**Nested Conditions:**
```typescript
.if(condition1)
  .then(b => b
    .if(condition2)
      .then(b2 => b2.action1())
      .else(b2 => b2.action2())
  )
  .else(b => b.action3())
```

#### Loops and Iteration

**For Each:**
```typescript
const addresses = ['0xaddr1...', '0xaddr2...', '0xaddr3...'];

.forEach(addresses, (address, index, builder) => {
  builder.createCoin(address, amount.divide(addresses.length));
})
```

**Repeat:**
```typescript
.repeat(5, (index, builder) => {
  builder.createCoin(
    `0xaddr${index}...`,
    expr(1000).multiply(index + 1)
  );
})
```

**Range:**
```typescript
.range(1, 10, (value, builder) => {
  builder.createCoin(
    addresses[value - 1],
    expr(value).multiply(1000)
  );
})
```

#### Expressions

The Expression API provides type-safe arithmetic and logical operations:

```typescript
import { expr, amount, variable } from 'chia-puzzle-framework';

// Create expressions
const fee = expr(50);
const total = amount.add(fee);
const half = amount.divide(2);

// Complex calculations
const commission = amount.multiply(0.025); // 2.5%
const netAmount = amount.subtract(commission).subtract(fee);

// Comparisons
const isLarge = amount.greaterThan(1000000);
const isValid = amount.greaterThanOrEqual(100).and(
  amount.lessThanOrEqual(1000000)
);

// Use in conditions
.if(isLarge)
  .then(b => b.requireSignature(adminKey))
```

#### Comments and Documentation

```typescript
const documentedPuzzle = createPuzzle()
  .blockComment('This puzzle implements a payment channel')
  .blockComment('between two parties with timeout refund')
  
  .comment('Check if channel is being closed cooperatively')
  .if(variable('close_flag').equals(1))
    .then(b => b
      .comment('Both parties must sign')
      .requireSignature(party1Key)
      .requireSignature(party2Key)
      .comment('Distribute according to final balances')
      .createCoin(party1Addr, variable('balance1'))
      .createCoin(party2Addr, variable('balance2'))
    );
```

#### Composition and Reusability

```typescript
// Create reusable components
const authComponent = puzzle()
  .requireSignature(ownerKey)
  .requireAfterSeconds(startTime);

const feeComponent = puzzle()
  .reserveFee(50)
  .assertCoinAnnouncement(feeCollectorAnnouncement);

// Compose into final puzzle
const finalPuzzle = createPuzzle()
  .merge(authComponent)
  .merge(feeComponent)
  .createCoin(recipient, amount)
  .build();
```

#### Raw Operations

For advanced use cases, access raw ChiaLisp operations:

```typescript
.rawCondition(51, puzzleHash, amount) // CREATE_COIN
.rawOp('c', expr1, expr2) // cons
.rawList(item1, item2, item3) // Create list
.nil() // Empty list
```

### Comprehensive SolutionBuilder Guide

The SolutionBuilder provides a fluent API for constructing solutions that satisfy puzzles:

#### Basic Usage

```typescript
import { createSolution } from 'chia-puzzle-framework';

// Create solution with values
const solution = createSolution()
  .addValue(1000000) // amount
  .addValue('0xrecipient...') // recipient
  .addValue(500000) // timeout height
  .build();
```

#### Complex Solutions

```typescript
// Solution with nested structures
const complexSolution = createSolution()
  .addList([1, 2, 3]) // Array of signatures provided
  .addValue('0xdestination...')
  .addValue(5000000)
  .addConditionalValue(
    shouldIncludeMemo,
    'Payment for services'
  )
  .build();
```

#### Solution for Delegated Puzzles

```typescript
const delegatedSolution = createSolution()
  .addDelegatedPuzzle(innerPuzzle)
  .addDelegatedSolution(innerSolution)
  .build();
```

#### Working with Puzzle Parameters

```typescript
// Match solution to puzzle parameters
const puzzle = createPuzzle()
  .withSolutionParams('action', 'amount', 'recipient', 'memo');

const solution = createSolution()
  .forParams({
    action: 1,
    amount: 1000000,
    recipient: '0xaddr...',
    memo: 'Test payment'
  })
  .build();
```

#### Advanced Solution Building

```typescript
// Conditional solution building
const solutionBuilder = createSolution();

if (includeSignatures) {
  solutionBuilder.addValue(signature1);
  solutionBuilder.addValue(signature2);
} else {
  solutionBuilder.addNil();
  solutionBuilder.addNil();
}

// Add remaining values
solutionBuilder
  .addValue(destination)
  .addValue(amount)
  .addOptional(memo) // Adds value or nil
  .build();
```

#### Solution Serialization

```typescript
// Serialize to hex for submission
const hexSolution = solution.toHex();

// Serialize to CLVM format
const clvmSolution = solution.toCLVM();

// Get as JavaScript object
const jsObject = solution.toObject();
```

## Internal Architecture

### TypeScript Puzzle Tree Representation

The framework represents Chia puzzles as an Abstract Syntax Tree (AST) in TypeScript memory. This allows for type-safe manipulation and optimization before converting to ChiaLisp.

#### Core Node Types

```typescript
// Base node interface
interface ASTNode {
  type: NodeType;
  value?: any;
  children?: ASTNode[];
  metadata?: NodeMetadata;
}

// Node types
enum NodeType {
  // Primitives
  INTEGER = 'INTEGER',
  BYTES = 'BYTES',
  STRING = 'STRING',
  NIL = 'NIL',
  
  // Operations
  CONS = 'CONS',
  LIST = 'LIST',
  APPLY = 'APPLY',
  QUOTE = 'QUOTE',
  
  // Control flow
  IF = 'IF',
  
  // Special forms
  PARAMETER = 'PARAMETER',
  CURRIED_PARAM = 'CURRIED_PARAM',
  INCLUDE = 'INCLUDE',
  CONDITION = 'CONDITION'
}
```

#### Tree Structure Example

For a simple payment puzzle:
```typescript
createPuzzle()
  .requireSignature(pubkey)
  .createCoin(recipient, amount)
```

The internal representation looks like:

```typescript
{
  type: NodeType.LIST,
  children: [
    {
      type: NodeType.CONS,
      children: [
        {
          type: NodeType.CONDITION,
          value: 50, // AGG_SIG_ME
          children: [
            { type: NodeType.BYTES, value: pubkey },
            { type: NodeType.APPLY, value: 'sha256tree1', children: [...] }
          ]
        },
        {
          type: NodeType.LIST,
          children: [
            {
              type: NodeType.CONDITION,
              value: 51, // CREATE_COIN
              children: [
                { type: NodeType.PARAMETER, value: 'recipient' },
                { type: NodeType.PARAMETER, value: 'amount' }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

#### Optimization Passes

Before converting to ChiaLisp, the framework applies several optimization passes:

1. **Constant Folding**: Evaluate constant expressions at compile time
2. **Dead Code Elimination**: Remove unreachable code
3. **Common Subexpression Elimination**: Reuse repeated calculations
4. **Parameter Lifting**: Move parameters to optimal positions

### ChiaLisp Conversion Process

The conversion from TypeScript AST to ChiaLisp follows these steps:

#### 1. AST Traversal

```typescript
class ChiaLispSerializer {
  serialize(node: ASTNode): string {
    switch (node.type) {
      case NodeType.INTEGER:
        return node.value.toString();
      
      case NodeType.BYTES:
        return `0x${node.value}`;
      
      case NodeType.STRING:
        return `"${this.escapeString(node.value)}"`;
      
      case NodeType.LIST:
        return this.serializeList(node.children);
      
      case NodeType.CONS:
        return `(c ${this.serialize(node.children[0])} ${this.serialize(node.children[1])})`;
      
      // ... more cases
    }
  }
}
```

#### 2. Module Structure Generation

```typescript
class ModuleGenerator {
  generate(ast: PuzzleAST): string {
    const params = this.extractParameters(ast);
    const includes = this.extractIncludes(ast);
    const body = this.generateBody(ast);
    
    return `
(mod (${this.formatParameters(params)})
  ${includes.map(i => `(include ${i})`).join('\n')}
  
  ${body}
)`;
  }
}
```

#### 3. Operator Mapping

TypeScript operations map to ChiaLisp operators:

```typescript
const OPERATOR_MAP = {
  // Arithmetic
  '+': '+',
  '-': '-',
  '*': '*',
  '/': '/',
  
  // Comparison
  '>': '>',
  '<': '<',
  '>=': '>=s',  // Signed comparison
  '<=': '<=s',
  '==': '=',
  '!=': '!=',
  
  // Logical
  '&&': 'logand',
  '||': 'logior',
  '!': 'lognot',
  
  // Bitwise
  '&': 'logand',
  '|': 'logior',
  '^': 'logxor',
  '<<': 'lsh',
  '>>': 'ash'
};
```

#### 4. Condition Compilation

Conditions are compiled to their numeric codes:

```typescript
const CONDITION_CODES = {
  AGG_SIG_ME: 50,
  CREATE_COIN: 51,
  RESERVE_FEE: 52,
  CREATE_COIN_ANNOUNCEMENT: 60,
  ASSERT_COIN_ANNOUNCEMENT: 61,
  CREATE_PUZZLE_ANNOUNCEMENT: 62,
  ASSERT_PUZZLE_ANNOUNCEMENT: 63,
  ASSERT_MY_COIN_ID: 70,
  ASSERT_MY_PARENT_ID: 71,
  ASSERT_MY_PUZZLE_HASH: 72,
  ASSERT_MY_AMOUNT: 73,
  ASSERT_SECONDS_RELATIVE: 80,
  ASSERT_SECONDS_ABSOLUTE: 81,
  ASSERT_HEIGHT_RELATIVE: 82,
  ASSERT_HEIGHT_ABSOLUTE: 83
};
```

#### 5. Final Formatting

The serializer applies ChiaLisp formatting conventions:

```typescript
class ChiaLispFormatter {
  format(code: string, options: FormatOptions): string {
    // Apply indentation
    const indented = this.applyIndentation(code, options.indent);
    
    // Add comments for readability
    const commented = this.addParameterComments(indented);
    
    // Group related operations
    const grouped = this.groupOperations(commented);
    
    return grouped;
  }
}
```

#### Example: Complete Conversion

TypeScript:
```typescript
const puzzle = createPuzzle()
  .withSolutionParams('amount', 'recipient')
  .requireSignature('0xabcd...')
  .if(variable('amount').greaterThan(1000000))
    .then(b => b.requireSignature('0xdef0...'))
  .createCoin(variable('recipient'), variable('amount'))
  .build();
```

ChiaLisp Output:
```clojure
(mod (amount recipient)
  
  (c
    (c (q . 50) (c (q . 0xabcd...) (c (sha256tree1 (q . 1)) (q . ()))))
    (c
      (if (> amount (q . 1000000))
        (c (q . 50) (c (q . 0xdef0...) (c (sha256tree1 (q . 1)) (q . ()))))
        (q . ())
      )
      (c
        (c (q . 51) (c recipient (c amount (q . ()))))
        (q . ())
      )
    )
  )
)
```

This architecture provides:
- Type safety during puzzle construction
- Optimization opportunities before compilation
- Clear separation between high-level logic and low-level ChiaLisp
- Extensibility for new features and optimizations

---

For more examples and advanced usage, check out the [examples directory](./examples/) and [comprehensive documentation](./docs/).