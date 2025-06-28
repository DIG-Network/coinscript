---
sidebar_position: 3
title: Quick Start Tutorial
---

# Quick Start Tutorial

Let's build a simple escrow contract that demonstrates core CoinScript concepts. This contract will hold funds until specific conditions are met.

## What We'll Build

An **Escrow** contract that:
- Holds funds between a buyer and seller
- Allows the buyer to release funds to the seller
- Allows the seller to refund the buyer
- Has a timeout for automatic refund

## Step 1: Create the Contract

Create a new file `contracts/Escrow.coins`:

```coinscript
// Escrow.coins
coin Escrow {
  // Storage variables (immutable - part of puzzle hash)
  storage address buyer;
  storage address seller;
  storage uint256 timeout;  // Unix timestamp
  
  // Events for transparency
  event FundsReleased(address to);
  event FundsRefunded();
  
  // Buyer confirms receipt and releases funds to seller
  action release() {
    require(msg.sender == buyer, "Only buyer can release");
    
    send(seller, coinAmount());
    emit FundsReleased(seller);
  }
  
  // Seller refunds the buyer
  action refund() {
    require(msg.sender == seller, "Only seller can refund");
    
    send(buyer, coinAmount());
    emit FundsRefunded();
  }
  
  // Anyone can trigger timeout refund after deadline
  action timeoutRefund() {
    require(currentTime() >= timeout, "Not expired yet");
    
    send(buyer, coinAmount());
    emit FundsRefunded();
  }
}
```

## Step 2: Compile the Contract

Create a build script `scripts/compile.js`:

```javascript
const { compileCoinScript } = require('chia-puzzle-framework');
const fs = require('fs').promises;
const path = require('path');

async function compile() {
  console.log('🔨 Compiling Escrow...\n');
  
  // Read the CoinScript file
  const source = await fs.readFile('./contracts/Escrow.coins', 'utf8');
  
  // Compile with specific storage values
  const result = compileCoinScript(source, {
    storage: {
      buyer: '0xBUYER_ADDRESS_HERE',
      seller: '0xSELLER_ADDRESS_HERE', 
      timeout: 1735689600  // Jan 1, 2025
    }
  });
  
  // Display results
  console.log('📄 ChiaLisp Output:');
  console.log(result.chialisp);
  console.log('\n🔑 Puzzle Hash:', result.puzzleHash);
  
  // Save to build directory
  const buildDir = path.join(__dirname, '../build');
  await fs.mkdir(buildDir, { recursive: true });
  
  await fs.writeFile(
    path.join(buildDir, 'Escrow.json'),
    JSON.stringify({
      contractName: 'Escrow',
      chialisp: result.chialisp,
      clvm: result.clvm,
      puzzleHash: result.puzzleHash,
      storage: result.storage,
      timestamp: new Date().toISOString()
    }, null, 2)
  );
  
  console.log('\n✅ Compilation complete! Output saved to build/Escrow.json');
}

compile().catch(console.error);
```

Run the compilation:

```bash
node scripts/compile.js
```

## Step 3: Understanding the Output

After compilation, you'll see the ChiaLisp output and puzzle hash:

### ChiaLisp Output
```clsp
(mod (action . params)
  (include condition_codes.clib)
  
  ; Storage constants (curried)
  (defconstant BUYER 0xBUYER_ADDRESS_HERE)
  (defconstant SELLER 0xSELLER_ADDRESS_HERE)
  (defconstant TIMEOUT 1735689600)
  
  ; Action: release
  (defun release ()
    (if (= (f @) BUYER)  ; Check sender is buyer
      (list
        (list CREATE_COIN SELLER (coin-amount))
        (list CREATE_COIN_ANNOUNCEMENT 
          (sha256 "FundsReleased" SELLER))
      )
      (x "Only buyer can release")
    )
  )
  
  ; Action: refund  
  (defun refund ()
    (if (= (f @) SELLER)  ; Check sender is seller
      (list
        (list CREATE_COIN BUYER (coin-amount))
        (list CREATE_COIN_ANNOUNCEMENT 
          (sha256 "FundsRefunded"))
      )
      (x "Only seller can refund")
    )
  )
  
  ; Action: timeoutRefund
  (defun timeout-refund ()
    (if (>= (time) TIMEOUT)
      (list
        (list CREATE_COIN BUYER (coin-amount))
        (list CREATE_COIN_ANNOUNCEMENT 
          (sha256 "FundsRefunded"))
      )
      (x "Not expired yet")
    )
  )
  
  ; Action dispatcher
  (if (= action "release")
    (release)
    (if (= action "refund")
      (refund)
      (if (= action "timeoutRefund")
        (timeout-refund)
        (x "Unknown action")
      )
    )
  )
)
```

### Puzzle Hash
```
0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

This hash uniquely identifies your compiled contract with the specific storage values.

## Step 4: Create Solutions

Solutions provide runtime parameters to execute contract actions. Create `scripts/interact.js`:

```javascript
const { createSolution } = require('chia-puzzle-framework');

// Example 1: Release funds to seller
function releaseSolution() {
  return createSolution()
    .addAction('release');
}

// Example 2: Refund to buyer
function refundSolution() {
  return createSolution()
    .addAction('refund');
}

// Example 3: Timeout refund
function timeoutRefundSolution() {
  return createSolution()
    .addAction('timeoutRefund');
}

// Display the solutions
console.log('Release Solution:');
console.log(releaseSolution().serialize());

console.log('\nRefund Solution:');
console.log(refundSolution().serialize());

console.log('\nTimeout Refund Solution:');
console.log(timeoutRefundSolution().serialize());
```

### Solution Output

```clsp
; Release solution
("release")

; Refund solution
("refund")

; Timeout refund solution
("timeoutRefund")
```

## Step 5: Test the Contract

Create a test file `test/Escrow.test.js`:

```javascript
const { 
  compileCoinScript,
  createSolution,
  simulateSpend
} = require('chia-puzzle-framework');

describe('Escrow', () => {
  const buyer = '0xaaaa...';
  const seller = '0xbbbb...';
  const timeout = 1735689600;
  
  let compiledContract;
  
  beforeEach(async () => {
    const source = `
      coin Escrow {
        storage address buyer = ${buyer};
        storage address seller = ${seller};
        storage uint256 timeout = ${timeout};
        
        action release() {
          require(msg.sender == buyer, "Only buyer");
          send(seller, coinAmount());
        }
        
        action refund() {
          require(msg.sender == seller, "Only seller");
          send(buyer, coinAmount());
        }
      }
    `;
    
    compiledContract = compileCoinScript(source);
  });
  
  test('buyer can release funds', async () => {
    const solution = createSolution().addAction('release');
    
    const result = simulateSpend({
      puzzle: compiledContract.chialisp,
      solution: solution.serialize(),
      coinAmount: 1000,
      sender: buyer
    });
    
    expect(result.conditions).toContainEqual({
      opcode: 'CREATE_COIN',
      args: [seller, 1000]
    });
  });
  
  test('seller can refund', async () => {
    const solution = createSolution().addAction('refund');
    
    const result = simulateSpend({
      puzzle: compiledContract.chialisp,
      solution: solution.serialize(),
      coinAmount: 1000,
      sender: seller
    });
    
    expect(result.conditions).toContainEqual({
      opcode: 'CREATE_COIN',
      args: [buyer, 1000]
    });
  });
});
```

## Step 6: Deploy and Use

### Local Testing with Simulator

```javascript
const { Simulator } = require('chia-puzzle-framework');

async function demo() {
  const sim = new Simulator();
  
  // Deploy contract
  const puzzle = new PuzzleBuilder();
  await puzzle.load('./contracts/Escrow.coins', {
    constructorArgs: [buyerAddress, sellerAddress]
  });
  
  // Create initial coin
  const coin = await sim.createCoin(puzzle.hash(), 10000);
  console.log(`Created coin: ${coin.id}`);
  
  // Release funds
  const releaseSolution = new SolutionBuilder()
    .addParam('action', 'release')
    .build();
    
  const result = await sim.spend(coin, puzzle, releaseSolution);
  console.log('Funds released result:', result);
  
  // Refund funds
  const refundSolution = new SolutionBuilder()
    .addParam('action', 'refund')
    .build();
    
  const refundResult = await sim.spend(coin, puzzle, refundSolution);
  console.log('Funds refunded result:', refundResult);
  
  // Timeout refund
  const timeoutRefundSolution = new SolutionBuilder()
    .addParam('action', 'timeoutRefund')
    .build();
    
  const timeoutRefundResult = await sim.spend(coin, puzzle, timeoutRefundSolution);
  console.log('Timeout refunded result:', timeoutRefundResult);
}

demo().catch(console.error);
```

### Mainnet Deployment

```javascript
const { ChiaWallet } = require('chia-puzzle-framework/wallet');

async function deployToMainnet() {
  const wallet = new ChiaWallet(privateKey);
  
  // Compile contract
  const puzzle = new PuzzleBuilder();
  await puzzle.load('./contracts/Escrow.coins');
  
  // Create coin with contract
  const coin = await wallet.createCoin({
    puzzleHash: puzzle.hash(),
    amount: 1000000 // 1 XCH in mojos
  });
  
  console.log(`Contract deployed!`);
  console.log(`Coin ID: ${coin.id}`);
  console.log(`Puzzle Hash: ${puzzle.hash()}`);
}
```

## What You've Learned

In this tutorial, you've:

✅ **Written a CoinScript contract** with immutable storage and multiple actions  
✅ **Compiled CoinScript to ChiaLisp** understanding how storage becomes constants  
✅ **Created solutions** to trigger different contract actions  
✅ **Tested the contract** logic and conditions  
✅ **Understood the distinction** between storage (immutable) and state (requires slot-machine pattern)  

## Key Takeaways

1. **Storage is Immutable** - Storage variables are curried into the puzzle and cannot change
2. **Actions Define Entry Points** - Each action is a different way to spend the coin
3. **Solutions Provide Runtime Data** - Actions and their parameters come from solutions
4. **Events Create Announcements** - Events become CREATE_COIN_ANNOUNCEMENT conditions
5. **State Requires Special Patterns** - Mutable state needs the slot-machine pattern with `@stateful`

## Next Steps

1. **Learn About State Management**
   - Explore the slot-machine pattern for mutable state in the [CoinScript Reference](./coinscript/reference)
   - Use the `@stateful` decorator for stateful actions
   - Understand how state is passed in solutions

2. **Explore More Examples**
   - [Basic Examples](./basic-examples) - Common patterns
   - [CoinScript Reference](./coinscript/reference) - Language features
   - [CoinScript Examples](./coinscript/examples) - More complex contracts

3. **Deep Dive into Tools**
   - [PuzzleBuilder Guide](./coinscript/puzzle-solution-builder) - Programmatic puzzle creation
   - [AST Engine](./coinscript/ast-engine) - Understanding the compilation

## Complete Example Files

All the code from this tutorial is available in the [examples directory](https://github.com/your-repo/examples).

Congratulations! You've built your first CoinScript smart contract! 🎉 