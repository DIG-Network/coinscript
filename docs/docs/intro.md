---
sidebar_position: 1
title: Introduction to CoinScript
---

# Introduction to CoinScript

Welcome to CoinScript, a high-level language that compiles to ChiaLisp, making Chia blockchain development accessible and productive.

## What is CoinScript?

CoinScript is a **high-level transcompiler** that transforms modern, familiar syntax into ChiaLisp code. It's designed to bridge the gap between conventional blockchain development and the unique Lisp-based smart contract system of the Chia blockchain.

### Key Features

- **📝 Familiar Syntax** - Write smart contracts using Solidity-like syntax
- **🔒 Type Safety** - Catch errors at compile time with a robust type system
- **🚀 High Performance** - Compiles to optimized ChiaLisp and CLVM bytecode
- **🛠️ Rich Tooling** - Integrated with PuzzleBuilder and the AST engine
- **📚 Comprehensive** - Full support for Chia's unique features

## Why CoinScript?

### The Challenge with ChiaLisp

ChiaLisp is powerful but presents challenges:

```clsp
(mod (recipient amount)
  (list
    (list AGG_SIG_ME 0x123... (sha256 recipient amount))
    (list CREATE_COIN recipient amount)
  )
)
```

### The CoinScript Solution

The same logic in CoinScript:

```coinscript
coin SimplePayment {
  // Storage is immutable - part of the puzzle hash
  storage address owner = 0x123...;
  
  action transfer(address recipient, uint256 amount) {
    requireSignature(owner);
    sendCoins(recipient, amount);
  }
}
```

For mutable state, CoinScript uses the slot-machine pattern:

```coinscript
coin StatefulToken {
  // Immutable configuration
  storage address admin = 0x123...;
  storage uint256 maxSupply = 1000000;
  
  // Mutable state (passed in solution)
  state {
    uint256 totalSupply;
    mapping(address => uint256) balances;
  }
  
  @stateful
  action mint(address to, uint256 amount) {
    require(msg.sender == admin, "Not admin");
    require(state.totalSupply + amount <= maxSupply, "Exceeds max");
    
    state.totalSupply += amount;
    state.balances[to] += amount;
  }
}
```

## Framework Components

The Chia Puzzle Framework consists of three main components:

### 1. CoinScript Language
A high-level language with modern syntax for writing smart contracts.

### 2. PuzzleBuilder
A JavaScript/TypeScript API for programmatically building Chia puzzles.

### 3. AST Engine
The underlying engine that powers both CoinScript and PuzzleBuilder through abstract syntax tree manipulation.

## Quick Example

Here's a complete example showing all three components working together:

### CoinScript Contract

```coinscript
// token.coins
coin SimpleToken {
  // Storage is immutable and curried into the puzzle
  storage address owner = 0x...;
  storage uint256 maxMintAmount = 10000;
  
  action mint(address to, uint256 amount) {
    requireSignature(owner);
    require(amount > 0, "Amount must be positive");
    require(amount <= maxMintAmount, "Exceeds max mint");
    sendCoins(to, amount);
  }
}
```

### Using PuzzleBuilder

```javascript
import { PuzzleBuilder, SolutionBuilder } from 'chia-puzzle-framework';

// Load and compile CoinScript
const puzzle = new PuzzleBuilder();
await puzzle.loadCoinScript('./token.coins');

// Or build programmatically
const customPuzzle = new PuzzleBuilder()
  .constant('OWNER', ownerAddress)
  .parameter('action')
  .parameter('amount')
  .if(
    b => b.equals('action', '"mint"'),
    b => b.requireSignature('OWNER')
         .require(b => b.greaterThan('amount', 0))
         .createCoin('recipient', 'amount')
  );
```

### Creating Solutions

```javascript
// Create a solution to spend the coin
const solution = new SolutionBuilder()
  .addParam('action', 'mint')
  .addParam('to', recipientAddress)
  .addParam('amount', 1000)
  .build();

// Get the compiled output
const chialisp = puzzle.toChiaLisp();
const clvm = puzzle.toCLVM(); // Hex bytecode
const puzzleHash = puzzle.hash();
```

## Getting Started

1. **Install the Framework**
   ```bash
   npm install chia-puzzle-framework
   ```

2. **Choose Your Path**
   - **New to Chia?** Start with our [Getting Started Guide](./getting-started)
   - **Know ChiaLisp?** Jump to [Quick Start](./quick-start)
   - **Want Examples?** Check out [Basic Examples](./basic-examples)

## What You'll Learn

This documentation will teach you:

- ✅ How to write smart contracts in CoinScript
- ✅ Building puzzles programmatically with PuzzleBuilder
- ✅ Understanding the AST engine and ChiaLisp representation
- ✅ Best practices for Chia development
- ✅ Advanced patterns and optimizations

## Prerequisites

- Basic understanding of blockchain concepts
- Familiarity with JavaScript/TypeScript
- No ChiaLisp knowledge required!

## Next Steps

Ready to dive in? Here's your learning path:

1. **[Getting Started](./getting-started)** - Set up your development environment
2. **[Quick Start](./quick-start)** - Build your first CoinScript contract
3. **[Basic Examples](./basic-examples)** - Learn through practical examples
4. **[ChiaLisp Overview](./chialisp-overview)** - Understand the compilation target

Welcome to the future of Chia development! 🌱