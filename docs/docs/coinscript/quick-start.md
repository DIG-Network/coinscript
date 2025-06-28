---
sidebar_position: 2
title: Quick Start
description: Get started with CoinScript in minutes - create your first smart coin
---

# Quick Start Guide

This guide will walk you through creating your first CoinScript smart coin, compiling it to ChiaLisp and CLVM, and creating a solution to spend it.

## Prerequisites

First, install the Chia Puzzle Framework:

```bash
npm install chia-puzzle-framework
```

## Your First CoinScript Contract

Let's create a simple payment contract that requires a signature to spend:

### Step 1: Write the CoinScript

Create a file called `hello-payment.coins`:

```coinscript
// hello-payment.coins
coin HelloPayment {
  // Storage variable to hold the owner's address
  storage address owner = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
  
  // Action to spend the coin
  action spend(address recipient, uint256 amount) {
    // Require the owner's signature
    requireSignature(owner);
    
    // Send coins to the recipient
    sendCoins(recipient, amount);
  }
}
```

### Step 2: Compile with PuzzleBuilder

Now let's use the Chia Puzzle Framework to compile this CoinScript:

```javascript
// compile-hello-payment.js
import { PuzzleBuilder, SolutionBuilder } from 'chia-puzzle-framework';

async function compileAndRun() {
  // Create a PuzzleBuilder instance and load the CoinScript
  const puzzleBuilder = new PuzzleBuilder();
  await puzzleBuilder.load('./hello-payment.coins');
  
  // Compile to ChiaLisp
  const chialisp = puzzleBuilder.toChiaLisp();
  console.log('=== ChiaLisp Output ===');
  console.log(chialisp);
  
  // Compile to CLVM (hex)
  const clvm = puzzleBuilder.toCLVM();
  console.log('\n=== CLVM Hex Output ===');
  console.log(clvm);
  
  // Calculate the puzzle hash
  const puzzleHash = puzzleBuilder.hash();
  console.log('\n=== Puzzle Hash ===');
  console.log(puzzleHash);
  
  // Create a solution
  const solution = new SolutionBuilder()
    .addParam('action', 'spend')
    .addParam('recipient', '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890')
    .addParam('amount', 1000)
    .build();
  
  console.log('\n=== Solution ===');
  console.log(solution.toString());
}

compileAndRun().catch(console.error);
```

### Step 3: Understanding the Output

When you run the above code, you'll see:

#### ChiaLisp Output:
```clsp
(mod (action recipient amount)
  ; Module parameters: action to perform, recipient address, and amount
  
  (include condition_codes.clib)
  
  (defconstant OWNER 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef)
  
  (defun-inline spend (recipient amount)
    (list
      (list AGG_SIG_ME OWNER (sha256 recipient amount))
      (list CREATE_COIN recipient amount)
    )
  )
  
  ; Main entry point - dispatch based on action
  (if (= action "spend")
    (spend recipient amount)
    (x)  ; Fail if unknown action
  )
)
```

#### CLVM Hex Output:
```
ff02ffff01ff02ffff03ffff09ff0580ffff01ff04ffff02ff08ffff04ff02ffff04ff05ffff04ff0bff80808080ff0180ffff01ff088080ff0180ffff04ffff01ffff02ffff03ff0bffff01ff02ffff01ff04ffff02ff05ffff04ff17ffff04ffff0bff27ff2f80ff808080ffff02ff16ffff04ff02ffff04ff09ffff04ff2fffff04ffff02ff3effff04ff02ffff04ff05ff80808080ff808080808080ff0180ff80808080ffff01ff04ffff0132ffff04ff0bffff0101ff0580ffff01ff0bff27ff2f80ff018080
```

#### Solution:
```clsp
("spend" 0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890 1000)
```

## The Same Example in PuzzleBuilder Syntax

For comparison, here's the same contract written directly using PuzzleBuilder's JavaScript syntax:

```javascript
// hello-payment-builder.js
import { PuzzleBuilder, SolutionBuilder } from 'chia-puzzle-framework';
import { requireSignature, sendCoins } from 'chia-puzzle-framework/conditions';

async function createWithBuilder() {
  const OWNER = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  
  const puzzle = new PuzzleBuilder()
    .constant('OWNER', OWNER)
    .parameter('action')
    .parameter('recipient') 
    .parameter('amount')
    .if(
      // Check if action is "spend"
      builder => builder.equals('action', '"spend"'),
      // Then branch: execute spend action
      builder => builder
        .addCondition(requireSignature(OWNER))
        .addCondition(sendCoins('recipient', 'amount')),
      // Else branch: fail
      builder => builder.fail()
    );
  
  // Compile to ChiaLisp
  const chialisp = puzzle.toChiaLisp();
  console.log('=== ChiaLisp from Builder ===');
  console.log(chialisp);
  
  // The output will be similar to the CoinScript compilation
}

createWithBuilder().catch(console.error);
```

## Key Concepts Demonstrated

### 1. **CoinScript Structure**
- `coin` keyword defines a smart coin contract
- `storage` variables become constants in the compiled code
- `action` defines entry points (spend paths)

### 2. **Compilation Process**
```
CoinScript → AST → ChiaLisp → CLVM
```

### 3. **Conditions**
- `requireSignature()` → `AGG_SIG_ME` condition
- `sendCoins()` → `CREATE_COIN` condition

### 4. **Solutions**
Solutions provide the runtime parameters for your smart coin:
- Action to execute
- Parameters for that action

## Running Your Contract

To test your contract on a local simulator:

```javascript
import { Simulator } from 'chia-puzzle-framework/simulator';

async function testContract() {
  const sim = new Simulator();
  
  // Create a coin with your puzzle
  const coin = await sim.createCoin(puzzleBuilder.hash(), 1000);
  
  // Create a spend with your solution
  const spend = {
    coin,
    puzzle: puzzleBuilder.toCLVM(),
    solution: solution.toCLVM()
  };
  
  // Run the spend
  const result = await sim.pushTx([spend]);
  console.log('Spend result:', result);
}
```

## What's Next?

Now that you've created your first CoinScript contract:

1. **Explore More Examples** - Check out our [CoinScript Examples](./examples) for more complex patterns
2. **Learn the Language** - Dive deep into [CoinScript Reference](./reference)
3. **Understand the Framework** - Learn about [PuzzleBuilder and SolutionBuilder](./puzzle-solution-builder)

## Summary

In this quick start, you've learned:
- ✅ How to write a basic CoinScript contract
- ✅ How to compile CoinScript to ChiaLisp and CLVM
- ✅ How to create solutions for your contracts
- ✅ The equivalent PuzzleBuilder syntax

CoinScript makes it easy to get started with Chia smart coins while maintaining the full power of the platform!