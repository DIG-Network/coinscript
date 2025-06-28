---
sidebar_position: 1
title: Introduction
---

# Introduction to CoinScript

CoinScript is a high-level language designed to make Chia smart contract development accessible, productive, and enjoyable. It provides a familiar syntax while compiling to efficient ChiaLisp code.

## Overview

CoinScript bridges the gap between modern programming languages and ChiaLisp, offering:

- **Solidity-like syntax** that's immediately familiar
- **Type safety** to catch errors at compile time
- **High-level abstractions** for common blockchain patterns
- **Seamless compilation** to optimized ChiaLisp

## Key Features

### 1. Familiar Syntax

Write smart contracts using syntax you already know:

```coinscript
coin TokenContract {
  storage address owner;
  storage uint256 maxMintAmount;
  
  action mint(address to, uint256 amount) {
    requireSignature(owner);
    require(amount > 0, "Invalid amount");
    require(amount <= maxMintAmount, "Exceeds limit");
    
    sendCoins(to, amount);
  }
}
```

### 2. Type System

CoinScript provides a robust type system:

```coinscript
// Primitive types
uint256 amount = 1000;
address recipient = 0x123...;
bool isActive = true;
bytes32 hash = sha256(data);

// Arrays and mappings
address[] authorized;
mapping(address => uint256) balances;

// Custom types
type TokenId = uint256;
type PuzzleHash = bytes32;
```

### 3. Smart Contract Primitives

Built-in support for blockchain operations:

```coinscript
// Signature requirements
requireSignature(signer);
requireMofN(2, [alice, bob, charlie]);

// Coin operations
sendCoins(recipient, amount);
createCoin(puzzleHash, amount);

// Time locks
requireTimeAbsolute(timestamp);
requireBlockHeight(1000000);

// Announcements
createAnnouncement(message);
assertAnnouncement(hash);
```

### 4. Actions and Modifiers

Structure your code with clear entry points:

```coinscript
modifier onlyOwner() {
  requireSignature(owner);
  _;
}

action transfer(address to, uint256 amount) onlyOwner {
  sendCoins(to, amount);
}

action burn(uint256 amount) {
  requireSignature(msg.sender);
  // Burning logic
}
```

### 5. Events and State

Emit events for transparency:

```coinscript
event Transfer(address indexed from, address indexed to, uint256 amount);

action transfer(address to, uint256 amount) {
  // Transfer logic
  emit Transfer(msg.sender, to, amount);
}
```

For mutable state, use the slot-machine pattern with the `@stateful` decorator:

```coinscript
// State declaration (mutable, passed in solution)
state {
  mapping(address => uint256) balances;
  uint256 totalSupply;
}

@stateful
action transfer(address to, uint256 amount) {
  require(state.balances[msg.sender] >= amount, "Insufficient balance");
  
  state.balances[msg.sender] -= amount;
  state.balances[to] += amount;
  
  emit Transfer(msg.sender, to, amount);
}
```

## How It Works

### Compilation Pipeline

```
CoinScript (.coins)
    ↓ Parser
AST (Abstract Syntax Tree)
    ↓ Transformer
ChiaLisp AST
    ↓ Code Generator
ChiaLisp (.clsp)
    ↓ Compiler
CLVM Bytecode (hex)
```

### Example Transformation

**CoinScript Input:**
```coinscript
action pay(address recipient, uint256 amount) {
  requireSignature(owner);
  sendCoins(recipient, amount);
}
```

**ChiaLisp Output:**
```clsp
(defun pay (recipient amount)
  (list
    (list AGG_SIG_ME OWNER (sha256 recipient amount))
    (list CREATE_COIN recipient amount)
  )
)
```

## Design Principles

### 1. **Developer First**
Every feature is designed to improve developer experience without sacrificing functionality.

### 2. **Zero Overhead**
CoinScript compiles to efficient ChiaLisp with no runtime overhead.

### 3. **Gradual Learning**
Start with simple contracts and progressively use advanced features as needed.

### 4. **Interoperability**
CoinScript contracts can interact with any ChiaLisp puzzle seamlessly.

### 5. **Safety by Default**
The type system and compiler checks prevent common errors before deployment.

## Use Cases

CoinScript is perfect for:

- **DeFi Protocols** - AMMs, lending platforms, yield farming
- **NFT Systems** - Minting, marketplaces, royalties
- **Gaming** - On-chain game logic, item systems
- **DAOs** - Governance, treasuries, voting
- **Payment Systems** - Escrow, channels, subscriptions

## Getting Started Path

1. **[Getting Started](../getting-started)** - Set up your development environment
2. **[Why CoinScript](./why-coinscript)** - Understand the motivation
3. **[Quick Start](./quick-start)** - Learn through a complete example
4. **[Examples](./examples)** - See real contracts in action

## Comparison with Other Languages

| Feature | CoinScript | ChiaLisp | Solidity |
|---------|------------|----------|----------|
| Syntax | C-like | Lisp | C-like |
| Type Safety | ✓ | ✗ | ✓ |
| Learning Curve | Low | High | Medium |
| Gas Model | CLVM Cost | CLVM Cost | Gas |
| State Management | Explicit | Explicit | Implicit |
| Compilation Target | ChiaLisp | CLVM | EVM |

## Community and Ecosystem

- **Open Source** - MIT licensed, community driven
- **Tooling** - VS Code extension, CLI tools, testing framework
- **Libraries** - Standard contracts, common patterns
- **Documentation** - Comprehensive guides and references

## Next Steps

Ready to dive deeper? Choose your path:

- **New to Blockchain?** Start with [Why CoinScript](./why-coinscript)
- **Know Solidity?** Jump to the [CoinScript Reference](./reference)
- **Want to Build?** Check out [Quick Start](./quick-start)

Welcome to the future of Chia development with CoinScript! 