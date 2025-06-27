 # PuzzleBuilder Guide

The `PuzzleBuilder` is the primary interface for creating Chia puzzles in this framework. It provides a fluent, type-safe API that handles all patterns and abstractions you'll need.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Patterns](#basic-patterns)
3. [Conditional Logic](#conditional-logic)
4. [Expressions](#expressions)
5. [Time Locks](#time-locks)
6. [Signatures](#signatures)
7. [Loops and Iteration](#loops-and-iteration)
8. [Composition](#composition)
9. [Advanced Patterns](#advanced-patterns)
10. [API Reference](#api-reference)

## Getting Started

```typescript
import { createPuzzle, amount } from 'chia-puzzle-framework';

// Simple payment puzzle
const puzzle = createPuzzle()
  .createCoin('recipient_puzzle_hash', amount)
  .build();

// Convert to ChiaLisp
const chialisp = puzzle.serialize();
```

## Basic Patterns

### Pay to Conditions

The simplest puzzle - executes conditions from the solution:

```typescript
const p2c = createPuzzle()
  .payToConditions()
  .build();
// Output: (a (q . 2) 1)
```

### Pay to Public Key

Requires a signature from the specified public key:

```typescript
const p2pk = createPuzzle()
  .payToPublicKey(publicKeyHex)
  .build();
```

### Fixed Payment

Always creates a specific coin:

```typescript
const fixedPayment = createPuzzle()
  .createCoin(puzzleHash, 1000000)
  .reserveFee(50)
  .build();
```

### Delegated Puzzle

Runs a puzzle provided in the solution:

```typescript
const delegated = createPuzzle()
  .delegatedPuzzle()
  .build();
// Output: (a 2 3)
```

## Conditional Logic

### If/Then/Else

```typescript
const conditional = createPuzzle()
  .if(amount.greaterThan(1000000))
    .then(b => b
      .createCoin(addr1, amount.divide(2))
      .createCoin(addr2, amount.divide(2))
    )
    .else(b => b
      .createCoin(addr3, amount)
    )
  .build();
```

### ElseIf Chains

```typescript
const multiCondition = createPuzzle()
  .if(amount.greaterThan(10000000))
    .then(b => b.createCoin(highValueAddr, amount))
  .elseIf(amount.greaterThan(1000000), b => b
    .createCoin(medValueAddr1, amount.divide(2))
    .createCoin(medValueAddr2, amount.divide(2))
  )
  .else(b => b.createCoin(lowValueAddr, amount))
  .build();
```

## Expressions

The `Expression` class provides composable arithmetic and logic:

### Arithmetic Operations

```typescript
import { amount, expr } from 'chia-puzzle-framework';

const fee = expr(50);
const commission = amount.multiply(0.01); // 1%
const netAmount = amount.subtract(fee).subtract(commission);

const puzzle = createPuzzle()
  .createCoin(recipient, netAmount)
  .createCoin(feeCollector, commission)
  .reserveFee(50)
  .build();
```

### Comparison Operations

```typescript
const isLarge = amount.greaterThan(1000000);
const isSmall = amount.not().greaterThan(100);
const isMedium = amount.greaterThan(100).and(amount.not().greaterThan(1000000));
```

### Logical Operations

```typescript
const requiresApproval = amount.greaterThan(1000000)
  .or(variable('special_flag'));

const puzzle = createPuzzle()
  .if(requiresApproval)
    .then(b => b.requireSignature(approverPubkey))
    .else(b => b)
  .createCoin(recipient, amount)
  .build();
```

## Time Locks

### Relative Time Locks

```typescript
// After N seconds from coin creation
const afterTime = createPuzzle()
  .requireAfterSeconds(3600) // 1 hour
  .createCoin(recipient, amount)
  .build();

// After N blocks from coin creation
const afterHeight = createPuzzle()
  .requireAfterHeight(100)
  .createCoin(recipient, amount)
  .build();
```

### Time Windows

```typescript
// Valid only within a time window
const timeWindow = createPuzzle()
  .requireAfterHeight(1000000)
  .requireBeforeHeight(2000000)
  .createCoin(recipient, amount)
  .build();
```

## Signatures

### Basic Signature

```typescript
const signed = createPuzzle()
  .requireSignature(publicKey)
  .createCoin(recipient, amount)
  .build();
```

### Custom Message Signature

```typescript
const customMsg = expr('custom_message').sha256();

const puzzle = createPuzzle()
  .requireSignatureUnsafe(publicKey, customMsg)
  .createCoin(recipient, amount)
  .build();
```

### Multi-Signature

```typescript
// 2-of-3 multisig
const multisig = createPuzzle()
  .requireSignature(pubkey1)
  .requireSignature(pubkey2)
  .createCoin(recipient, amount)
  .build();
```

## Loops and Iteration

### Split Payment

```typescript
const recipients = [addr1, addr2, addr3, addr4];

const splitPayment = createPuzzle()
  .forEach(recipients, (recipient, index, builder) => {
    builder.createCoin(recipient, amount.divide(recipients.length));
  })
  .build();
```

### Repeat Pattern

```typescript
const repeated = createPuzzle()
  .repeat(5, (index, builder) => {
    builder.createCoin(`recipient${index}`, 1000 * (index + 1));
  })
  .build();
```

## Composition

### Merging Builders

```typescript
// Create reusable components
const requireAuth = puzzle()
  .requireSignature(authPubkey);

const addFee = puzzle()
  .reserveFee(50);

const makePayment = puzzle()
  .createCoin(recipient, amount);

// Compose them
const composed = createPuzzle()
  .merge(requireAuth)
  .merge(addFee)
  .merge(makePayment)
  .build();
```

### Wrapping Puzzles

```typescript
const innerPuzzle = createPuzzle()
  .createCoin(recipient, amount);

const wrapped = innerPuzzle
  .wrap(inner => list([IF, authCondition, inner, fail()]))
  .build();
```

## Layer Abstractions

The framework provides built-in support for Chia's covenant layers, which wrap inner puzzles to add functionality:

### CAT (Colored Coins) Layer

Wrap any puzzle to create a colored coin that maintains its identity:

```typescript
const catCoin = createPuzzle()
  .withSolutionParams('recipient', 'amount')
  .createCoin(createPuzzle().param('recipient'), createPuzzle().param('amount'))
  .withCATLayer('0xtail_program_hash...');
```

The CAT layer ensures:
- All outputs maintain the same "color" (CAT type)
- Ring announcements link CAT spends together
- Optional TAIL program can control minting/melting

#### TAIL Programs

The framework includes built-in TAIL programs for different minting/melting policies:

```typescript
// Fixed supply - no minting or melting allowed
const fixedSupply = TAIL_PROGRAMS.NONE();
const catPuzzle = innerPuzzle.withCATLayer(fixedSupply.toModHash());

// Mintable/meltable with signature
const mintingKey = '0xpubkey...';
const mintable = TAIL_PROGRAMS.EVERYTHING_WITH_SIGNATURE(mintingKey);

// One-time mint from genesis coin
const genesisId = '0xcoinid...';
const genesis = TAIL_PROGRAMS.GENESIS_BY_COIN_ID(genesisId);

// Custom TAIL logic
const customTail = TAIL_PROGRAMS.DELEGATED_TAIL(
  puzzle()
    .withSolutionParams('amount')
    .if(puzzle().param('amount').greaterThan(1000000))
      .then(b => b.requireSignature(adminKey))
      .else(b => b.fail())
);
```

### NFT Layers

Create NFTs with state management and ownership tracking:

```typescript
const nft = createPuzzle()
  .withSolutionParams('new_owner')
  .createCoin(createPuzzle().param('new_owner'), 1) // NFTs use odd amounts
  .asNFT({
    metadata: '{"name": "Cool NFT", "attributes": [...]}',
    metadataUpdaterPuzzleHash: '0xmetadata_updater...',
    currentOwner: '0xcurrent_owner_did...',
    royaltyAddress: '0xroyalty_recipient...',
    tradePricePercentage: 500 // 5% royalty
  });
```

The NFT layers provide:
- **State Layer**: Manages metadata and filters odd CREATE_COIN conditions
- **Ownership Layer**: Tracks current owner and handles transfer programs
- Built-in support for royalties on secondary sales

### Singleton Layer

Ensure uniqueness with the singleton pattern:

```typescript
const singleton = createPuzzle()
  .withSolutionParams('new_state')
  .createCoin(createPuzzle().param('new_state'), 1) // Must be odd
  .withSingletonLayer('0xlauncher_coin_id...');
```

Singletons are used for:
- DIDs (Decentralized Identifiers)
- Plot NFTs for farming
- Any puzzle requiring guaranteed uniqueness

### Custom Layers

Create your own covenant layers:

```typescript
const rateLimited = createPuzzle()
  .withLayer({
    name: 'Rate Limiter',
    modHash: '0xrate_limiter_mod_hash...',
    curriedParams: {
      MAX_SPEND_PER_BLOCK: 1000000,
      RESET_INTERVAL: 100
    },
    solutionParams: ['current_block_height', 'spent_this_interval']
  });
```

Custom layers can:
- Filter or modify conditions from the inner puzzle
- Add constraints (rate limiting, access control)
- Compose with other layers

### Layer Composition

Layers can be combined:

```typescript
// Colored NFT = CAT + NFT layers
const coloredNFT = createPuzzle()
  .createCoin(recipient, 1)
  .asNFT({ /* NFT options */ })
  .withCATLayer(tailProgramHash);

// DID = Singleton + special inner puzzle
const did = createPuzzle()
  .withDIDInnerPuzzle(/* options */)
  .withSingletonLayer(launcherId);
```

## Advanced Patterns

### Escrow with Timeout

```typescript
const escrow = createPuzzle()
  .if(variable('released').equals(1))
    .then(b => b
      .requireSignature(sellerPubkey)
      .createCoin(buyerAddress, amount)
    )
    .else(b => b
      .requireAfterHeight(timeoutHeight)
      .requireSignature(sellerPubkey)
      .createCoin(sellerAddress, amount) // Refund
    )
  .build();
```

### Atomic Swap

```typescript
const atomicSwap = createPuzzle()
  .assertAnnouncement(swapCommitmentHash)
  .createCoin(recipient, amount)
  .build();
```

### Validation

```typescript
const validated = createPuzzle()
  .require(amount.greaterThan(0), 'Amount must be positive')
  .require(amount.not().greaterThan(maxAmount), 'Amount too large')
  .createCoin(recipient, amount)
  .build();
```

## API Reference

### PuzzleBuilder Methods

#### Coin Operations
- `createCoin(puzzleHash, amount)` - Create a new coin
- `reserveFee(amount)` - Reserve fee for transaction

#### Signatures
- `requireSignature(pubkey, message?)` - Require signature (AGG_SIG_ME)
- `requireMySignature(pubkey)` - Alias for requireSignature
- `requireSignatureUnsafe(pubkey, message)` - Unsafe signature (AGG_SIG_UNSAFE)

#### Time Locks
- `requireAfterSeconds(seconds)` - Relative time lock
- `requireAfterHeight(height)` - Relative height lock
- `requireBeforeSeconds(seconds)` - Before time lock
- `requireBeforeHeight(height)` - Before height lock

#### Assertions
- `assertMyPuzzleHash(hash)` - Assert puzzle hash
- `assertMyCoinId(id)` - Assert coin ID
- `require(condition, message?)` - General assertion

#### Announcements
- `createAnnouncement(message)` - Create announcement
- `assertAnnouncement(id)` - Assert announcement exists

#### Control Flow
- `if(condition)` - Start conditional
- `then(callback)` - Then branch
- `else(callback)` - Else branch
- `elseIf(condition, callback)` - Else-if branch

#### Patterns
- `payToConditions()` - Pay to conditions pattern
- `payToPublicKey(pubkey)` - Pay to public key pattern
- `delegatedPuzzle()` - Delegated puzzle pattern

#### Iteration
- `forEach(items, callback)` - Iterate over items
- `repeat(count, callback)` - Repeat N times

#### Composition
- `merge(other)` - Merge another builder
- `wrap(wrapper)` - Wrap the puzzle

#### Utility
- `returnConditions()` - Return conditions from solution
- `fail(message?)` - Always fail
- `addCondition(opcode, ...args)` - Add raw condition

#### Building
- `build()` - Build the tree structure
- `serialize(options?)` - Convert to ChiaLisp string with optional formatting

#### Comments
- `comment(text)` - Add an inline comment to the next condition
- `blockComment(text)` - Add a standalone comment line before the body

#### Layer Abstractions
- `withCATLayer(tailProgramHash)` - Wrap puzzle with CAT (Colored Coin) layer
- `toModHash()` - Calculate SHA256 tree hash of the puzzle
- `withNFTStateLayer(metadata, updaterHash)` - Add NFT state management layer
- `withNFTOwnershipLayer(owner, transferProgram)` - Add NFT ownership layer
- `withSingletonLayer(launcherId)` - Ensure uniqueness with singleton layer
- `asNFT(options)` - Complete NFT with state and ownership layers
- `withLayer(options)` - Generic layer for custom covenants

### Expression Methods

#### Arithmetic
- `add(value)` - Addition
- `subtract(value)` - Subtraction  
- `multiply(value)` - Multiplication
- `divide(value)` - Division

#### Comparison
- `greaterThan(value)` - Greater than
- `greaterThanBytes(value)` - Greater than (bytes)
- `equals(value)` - Equality

#### Logic
- `not()` - Logical NOT
- `and(other)` - Logical AND
- `or(other)` - Logical OR

#### Hashing
- `sha256()` - SHA256 hash
- `treeHash()` - Tree hash (sha256tree1)

### Factory Functions

- `createPuzzle()` - Create new PuzzleBuilder
- `puzzle()` - Alias for new PuzzleBuilder()
- `expr(value)` - Create Expression from value
- `variable(name)` - Create Expression from variable name

### Built-in Expressions

- `amount` - The coin amount (@)
- `arg1` - First argument (1)
- `arg2` - Second argument (2)
- `arg3` - Third argument (3)
- `solution` - Solution (alias for arg1)

## Serialization and Formatting

The framework generates ChiaLisp that matches official Chia puzzle formatting conventions:

### Basic Serialization

```typescript
const puzzle = createPuzzle()
  .createCoin(recipient, amount)
  .build();

// Compact format (default)
console.log(puzzle.serialize());
// Output: (51 0xrecipient @)

// Indented format for readability
console.log(puzzle.serialize({ indent: true }));
// Output:
// (
//   51
//   0xrecipient
//   @
// )
```

### Mod Structure with Parameters

```typescript
const puzzle = createPuzzle()
  .withCurriedParams({
    PUBKEY: 'b0a1' + '00'.repeat(46),
    MIN_AMOUNT: 1000000
  })
  .withSolutionParams('recipient', 'amount')
  .requireSignature(createPuzzle().param('PUBKEY'))
  .createCoin(createPuzzle().param('recipient'), createPuzzle().param('amount'));

console.log(puzzle.serialize({ indent: true }));
// Output:
// (mod (PUBKEY MIN_AMOUNT recipient amount)
//   (c (50 PUBKEY (sha256tree1 "1")) (c (51 recipient amount) "()")))
// )
```

### Complex Puzzles with Includes

When building complex puzzles with library includes:

```typescript
const catLikePuzzle = createPuzzle()
  .includeConditionCodes()
  .includeCurryAndTreehash()
  .withCurriedParams({
    MOD_HASH: 'abcd' + '00'.repeat(30),
    TAIL_PROGRAM_HASH: 'beef' + '00'.repeat(30)
  })
  .withSolutionParams('inner_solution', 'prev_coin_id', 'this_coin_info')
  .assertMyCoinId(createPuzzle().param('this_coin_info'));

console.log(catLikePuzzle.serialize({ indent: true }));
// Output: Properly formatted ChiaLisp matching cat_v2.clsp style
```

The serializer automatically:
- Formats `mod` structures according to ChiaLisp conventions
- Adds parameter comments for known parameter names
- Groups include directives together
- Makes smart decisions about single-line vs multi-line formatting
- Properly indents nested structures like `if` statements and function definitions

## Best Practices

1. **Use expressions for calculations** - They're composable and type-safe
2. **Prefer named methods over raw conditions** - Better readability
3. **Compose reusable components** - Use merge() for common patterns
4. **Validate inputs** - Use require() for assertions
5. **Handle edge cases** - Always consider zero amounts, timeouts
6. **Test serialization** - Verify the ChiaLisp output matches expectations
7. **Use indented format for debugging** - Makes puzzles easier to understand

## Examples Repository

For more examples, check the `examples/` directory in the framework repository.