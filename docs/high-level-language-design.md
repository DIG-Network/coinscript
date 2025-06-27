# High-Level Language Design for ChiaLisp

## Overview

The current tree-building approach with opcodes is very low-level, similar to assembly language. This document explores different approaches to building a higher-level language that compiles to ChiaLisp trees.

## Key Challenges

1. **S-expression target**: ChiaLisp is already a high-level syntax (Lisp), so we're not compiling to bytecode but to another high-level language
2. **Limited operations**: ChiaLisp has a small set of operators, so abstractions must compile to these primitives
3. **No mutation**: Everything is functional/immutable
4. **Coin-oriented**: The language needs to express coin spending conditions naturally

## Approach 1: Domain-Specific Language (DSL)

### Template Literal DSL
```typescript
const puzzle = chialisp`
  if @amount > 1_000_000:
    split_payment:
      - address: ${addr1}, amount: @amount / 2
      - address: ${addr2}, amount: @amount / 2
  else:
    single_payment: ${addr3}, amount: @amount
`;
```

**Pros:**
- Natural syntax for JavaScript developers
- Template interpolation for dynamic values
- Can leverage IDE syntax highlighting

**Cons:**
- Need custom parser
- Error messages can be cryptic
- Limited IDE support without plugins

## Approach 2: Fluent Builder API

```typescript
const puzzle = new PuzzleBuilder()
  .when(amount.greaterThan(1_000_000))
    .createCoin(addr1, amount.dividedBy(2))
    .createCoin(addr2, amount.dividedBy(2))
  .otherwise()
    .createCoin(addr3, amount)
  .build();
```

**Pros:**
- Type-safe with TypeScript
- Excellent IDE autocomplete
- Easy to validate at compile time

**Cons:**
- Can become verbose
- Limited expressiveness
- Hard to represent complex control flow

## Approach 3: Decorator-Based (TypeScript)

```typescript
@puzzle
class PaymentSplitter {
  @input amount: Amount;
  
  @condition
  isLargePayment(): boolean {
    return this.amount > 1_000_000;
  }
  
  @action
  @when('isLargePayment')
  splitPayment(): Condition[] {
    return [
      createCoin(addr1, this.amount / 2),
      createCoin(addr2, this.amount / 2)
    ];
  }
  
  @action
  @unless('isLargePayment')
  singlePayment(): Condition {
    return createCoin(addr3, this.amount);
  }
}
```

**Pros:**
- Very readable and maintainable
- Leverages TypeScript's type system
- Can generate both runtime and compile-time code

**Cons:**
- Requires decorator support
- Magic can be hard to debug
- Compilation step needed

## Approach 4: AST-Based Compiler

### Custom Language Syntax
```
puzzle PaymentSplitter(amount: Coin) {
  require amount > 0;
  
  if amount > 1_000_000 {
    emit CreateCoin(addr1, amount / 2);
    emit CreateCoin(addr2, amount / 2);
  } else {
    emit CreateCoin(addr3, amount);
  }
}
```

**Compiler Pipeline:**
1. **Lexer**: Tokenize source code
2. **Parser**: Build AST
3. **Type Checker**: Validate types and constraints
4. **Optimizer**: Simplify expressions
5. **Code Generator**: Emit ChiaLisp trees

**Pros:**
- Full control over syntax
- Can provide excellent error messages
- Opportunities for optimization

**Cons:**
- Significant implementation effort
- Need to build entire toolchain
- Users must learn new language

## Approach 5: Macro System

```typescript
// Define macros that expand to ChiaLisp
defineMacro('when', (condition, body) => 
  `(if ${condition} ${body} ())`
);

defineMacro('cond', (...clauses) => {
  // Transform cond to nested ifs
  return clauses.reduceRight(
    (rest, [test, expr]) => `(if ${test} ${expr} ${rest})`,
    '()'
  );
});

// Use macros
const puzzle = expand`
  (cond
    [(> amount 1000000) (split-payment)]
    [(> amount 100000)  (medium-payment)]
    [else               (small-payment)])
`;
```

**Pros:**
- Very powerful and flexible
- Can build abstractions incrementally
- Familiar to Lisp developers

**Cons:**
- Can create hard-to-debug code
- Requires understanding of macro expansion
- Hygienic macros are complex

## Approach 6: Contract-Oriented Language

```typescript
contract PaymentSplitter {
  input amount: uint64;
  
  const THRESHOLD = 1_000_000;
  const recipient1 = 0xdead...;
  const recipient2 = 0xbeef...;
  
  function execute() {
    require(amount > 0, "Amount must be positive");
    
    if (amount > THRESHOLD) {
      let half = amount / 2;
      transfer(recipient1, half);
      transfer(recipient2, half);
    } else {
      transfer(recipient3, amount);
    }
  }
}
```

**Pros:**
- Familiar to smart contract developers
- Clear separation of concerns
- Built-in safety checks

**Cons:**
- May not map well to UTXO model
- Abstractions might leak

## Approach 7: Gradual Typing with Inference

```typescript
// Start with dynamic typing
let puzzle = (amount) => {
  if (amount > 1_000_000) {
    return [
      createCoin(addr1, amount / 2),
      createCoin(addr2, amount / 2)
    ];
  }
  return createCoin(addr3, amount);
};

// Compiler infers types and generates optimized ChiaLisp
compile(puzzle); // => (a (i (> (@ ) 1000000) ...))
```

## Recommendation: Hybrid Approach

The best approach likely combines several strategies:

1. **Start with a Builder API** for immediate type safety
2. **Add a Macro System** for common patterns
3. **Develop a DSL** for complex puzzles
4. **Consider a Full Compiler** if adoption grows

### Example Implementation Plan

#### Phase 1: Enhanced Builder (Current)
```typescript
const puzzle = new PuzzleBuilder()
  .input('amount')
  .if(gt('@amount', 1_000_000))
    .then([
      createCoin(addr1, div('@amount', 2)),
      createCoin(addr2, div('@amount', 2))
    ])
    .else(createCoin(addr3, '@amount'))
  .build();
```

#### Phase 2: Macro Layer
```typescript
withMacros({
  splitPayment: (addr1, addr2, amount) => [
    createCoin(addr1, div(amount, 2)),
    createCoin(addr2, div(amount, 2))
  ]
}, () => {
  return ifElse(
    gt('@amount', 1_000_000),
    splitPayment(addr1, addr2, '@amount'),
    createCoin(addr3, '@amount')
  );
});
```

#### Phase 3: DSL with TypeScript
```typescript
const puzzle = chia`
  input amount: Coin
  
  when amount > ${THRESHOLD}:
    ${addr1} gets amount / 2
    ${addr2} gets amount / 2
  otherwise:
    ${addr3} gets amount
`;
```

## Implementation Considerations

### Error Handling
- Compile-time validation of puzzle structure
- Runtime validation of conditions
- Clear error messages with source mapping

### Optimization
- Constant folding
- Dead code elimination
- Common subexpression elimination

### Debugging
- Source maps for debugging
- Intermediate representation visualization
- Step-through debugging support

### Type System
- Gradual typing support
- Type inference for common patterns
- Integration with TypeScript

## State Management

State in CoinScript is managed through two mechanisms:

1. **Storage Variables** - Immutable values curried into the puzzle hash
2. **State Variables** - Mutable values stored in the coin's memo field

When a coin with state is spent:
- The current state is read from the coin's memo
- State can be updated during the spend
- New coins are created with updated state in their memos
- The puzzle hash remains the same (same code, different state)

This approach is simpler than using a separate state layer and aligns with how Chia coins naturally work.

## Events

Events in CoinScript are implemented as coin announcements:

```coinscript
event Transfer(address indexed from, address indexed to, uint256 amount);

// In an action:
emit Transfer(sender, recipient, amount);
```

The `emit` keyword creates a coin announcement with the event data. This is a direct mapping to Chia's announcement conditions, making it simple and efficient.

## Exception Handling

CoinScript provides the `exception` keyword for explicitly failing a spend:

```coinscript
// Fail with a message
if (balance < requiredAmount) {
    exception("Insufficient balance");
}

// Fail without a message
if (address == 0x0) {
    exception;
}
```

The `exception` keyword compiles directly to ChiaLisp's `(x)` operator, which causes immediate failure. This is different from `require()` which checks a condition:

- `require(condition, "message")` → `(assert condition)` - Fails if condition is false
- `exception("message")` → `(x)` - Always fails unconditionally

Use `exception` when you need to explicitly abort execution in error cases where continuing would be invalid.

## Layers

While CoinScript provides direct support for common patterns, you can still explicitly add layers for more complex functionality:

```coinscript
coin MyLayeredCoin {
    layer singleton with launcherId: 0x...;
    layer ownership with owner: "xch1...";
    layer royalty with address: "xch1...", percentage: 5;
    
    // ... rest of coin definition
}
```

Available layers:
- `singleton` - Ensures coin uniqueness
- `ownership` - Adds ownership rules
- `royalty` - Enforces royalty payments
- `metadata` - Stores additional metadata
- `transfer` - Custom transfer logic
- `actionlayer` - Advanced action routing with merkle trees

## Conclusion

Building a high-level language for ChiaLisp requires balancing:
- **Expressiveness**: Can developers write what they need?
- **Safety**: Can we catch errors at compile time?
- **Performance**: Does it generate efficient ChiaLisp?
- **Adoptability**: Is it easy to learn and use?

The recommended approach is to start simple with a builder API and gradually add more sophisticated features based on user needs. 