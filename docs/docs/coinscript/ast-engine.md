---
sidebar_position: 5
title: The AST Engine
description: Understanding the Abstract Syntax Tree engine that powers CoinScript and the Chia Puzzle Framework
---

# The AST Engine

The Abstract Syntax Tree (AST) engine is the core technology that enables CoinScript and the Chia Puzzle Framework. It provides a programmatic way to represent, manipulate, and compile ChiaLisp code.

## Overview

The AST engine creates an in-memory representation of ChiaLisp programs as tree structures. This enables:

- **Type-safe code generation** - Build ChiaLisp without string concatenation
- **Code transformation** - Optimize and modify programs programmatically  
- **Multiple abstractions** - Layer different syntaxes on top of the same core
- **Static analysis** - Validate and analyze code before compilation

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  CoinScript │     │PuzzleBuilder│     │  ChiaLisp   │
│   (.coins)  │     │    (JS)     │     │   (.clsp)   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────┐
│                    AST Engine                       │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐   │
│  │ Parser │  │  Node  │  │Visitor │  │ Emitter│   │
│  │        │  │ Types  │  │Pattern │  │        │   │
│  └────────┘  └────────┘  └────────┘  └────────┘   │
└─────────────────────────┬───────────────────────────┘
                          ▼
                   ┌──────────┐
                   │   CLVM   │
                   │  (hex)   │
                   └──────────┘
```

## AST Node Types

The AST represents ChiaLisp programs using different node types:

### Basic Nodes

```javascript
// Atom - represents a single value
{
  type: 'atom',
  value: 42
}

// String 
{
  type: 'string',
  value: 'Hello World'
}

// Hex/Bytes
{
  type: 'hex',
  value: '0xdeadbeef'
}

// Symbol - variable or function name
{
  type: 'symbol',
  name: 'my_variable'
}
```

### Composite Nodes

```javascript
// List - S-expression
{
  type: 'list',
  elements: [
    { type: 'symbol', name: '+' },
    { type: 'atom', value: 1 },
    { type: 'atom', value: 2 }
  ]
}

// Function call
{
  type: 'apply',
  function: { type: 'symbol', name: 'sha256' },
  args: [
    { type: 'string', value: 'data' }
  ]
}

// Module definition
{
  type: 'module',
  parameters: ['action', 'amount'],
  body: {
    type: 'list',
    elements: [/* ... */]
  }
}
```

## Building AST Manually

Here's how different abstraction levels build the same program:

### Raw AST Construction

```javascript
// Building (+ 1 2) manually
const ast = {
  type: 'list',
  elements: [
    { type: 'symbol', name: '+' },
    { type: 'atom', value: 1 },
    { type: 'atom', value: 2 }
  ]
};
```

### AST Builder Functions

```javascript
import { list, symbol, atom } from 'chia-puzzle-framework/ast';

// Same expression with helper functions
const ast = list(
  symbol('+'),
  atom(1),
  atom(2)
);
```

### PuzzleBuilder (Higher Abstraction)

```javascript
// PuzzleBuilder provides methods that generate AST
const puzzle = new PuzzleBuilder()
  .value(b => b.add(1, 2));

// Internally creates the same AST structure
```

### CoinScript (Highest Abstraction)

```coinscript
// CoinScript compiles to AST
function calculate() returns uint256 {
  return 1 + 2;
}
```

## AST Transformations

The power of the AST comes from the ability to transform code:

### Example: Constant Folding

```javascript
// Transform AST to evaluate constant expressions
function constantFold(node) {
  if (node.type === 'list' && node.elements[0].name === '+') {
    const args = node.elements.slice(1);
    if (args.every(arg => arg.type === 'atom')) {
      const sum = args.reduce((acc, arg) => acc + arg.value, 0);
      return { type: 'atom', value: sum };
    }
  }
  return node;
}

// Before: (+ 1 2 3)
// After: 6
```

### Example: Function Inlining

```javascript
// Inline simple function calls
function inlineFunction(ast, functionDefs) {
  return visit(ast, {
    apply(node) {
      const funcName = node.function.name;
      const funcDef = functionDefs[funcName];
      
      if (funcDef && funcDef.inline) {
        // Replace parameters with arguments
        return substitute(funcDef.body, funcDef.params, node.args);
      }
      
      return node;
    }
  });
}
```

## The Compilation Pipeline

Here's how CoinScript compiles through the AST engine:

### 1. CoinScript → AST

```coinscript
coin SimplePayment {
  storage address owner = 0x1234...;
  
  action pay(address to, uint256 amount) {
    requireSignature(owner);
    sendCoins(to, amount);
  }
}
```

### 2. CoinScript AST Representation

```javascript
{
  type: 'coin',
  name: 'SimplePayment',
  storage: [
    {
      type: 'storage',
      dataType: 'address',
      name: 'owner',
      value: '0x1234...'
    }
  ],
  actions: [
    {
      type: 'action',
      name: 'pay',
      parameters: [
        { name: 'to', dataType: 'address' },
        { name: 'amount', dataType: 'uint256' }
      ],
      body: [
        {
          type: 'requireSignature',
          address: { type: 'symbol', name: 'owner' }
        },
        {
          type: 'sendCoins',
          recipient: { type: 'symbol', name: 'to' },
          amount: { type: 'symbol', name: 'amount' }
        }
      ]
    }
  ]
}
```

### 3. Transform to ChiaLisp AST

```javascript
{
  type: 'module',
  parameters: ['action', 'to', 'amount'],
  includes: ['condition_codes.clib'],
  constants: [
    {
      name: 'OWNER',
      value: '0x1234...'
    }
  ],
  body: {
    type: 'if',
    condition: {
      type: 'apply',
      function: { type: 'symbol', name: '=' },
      args: [
        { type: 'symbol', name: 'action' },
        { type: 'string', value: 'pay' }
      ]
    },
    then: {
      type: 'list',
      elements: [
        // AGG_SIG_ME condition
        {
          type: 'list',
          elements: [
            { type: 'symbol', name: 'AGG_SIG_ME' },
            { type: 'symbol', name: 'OWNER' },
            // ... signature data
          ]
        },
        // CREATE_COIN condition
        {
          type: 'list',
          elements: [
            { type: 'symbol', name: 'CREATE_COIN' },
            { type: 'symbol', name: 'to' },
            { type: 'symbol', name: 'amount' }
          ]
        }
      ]
    },
    else: {
      type: 'apply',
      function: { type: 'symbol', name: 'x' },
      args: []
    }
  }
}
```

### 4. Emit ChiaLisp

```clsp
(mod (action to amount)
  (include condition_codes.clib)
  
  (defconstant OWNER 0x1234...)
  
  (if (= action "pay")
    (list
      (list AGG_SIG_ME OWNER (sha256 to amount))
      (list CREATE_COIN to amount)
    )
    (x)
  )
)
```

## AST Visitors and Transformers

The AST engine provides visitor patterns for traversing and modifying trees:

### Basic Visitor

```javascript
import { visit } from 'chia-puzzle-framework/ast';

// Count all function calls
const callCount = {};
visit(ast, {
  apply(node) {
    const funcName = node.function.name;
    callCount[funcName] = (callCount[funcName] || 0) + 1;
  }
});
```

### Transformer

```javascript
import { transform } from 'chia-puzzle-framework/ast';

// Replace all instances of a symbol
const transformed = transform(ast, {
  symbol(node) {
    if (node.name === 'OLD_NAME') {
      return { ...node, name: 'NEW_NAME' };
    }
    return node;
  }
});
```

## Type System Integration

The AST engine includes type information for validation:

```javascript
// Type-annotated AST node
{
  type: 'apply',
  function: { type: 'symbol', name: 'sha256' },
  args: [
    { 
      type: 'symbol', 
      name: 'data',
      dataType: 'bytes'
    }
  ],
  returnType: 'bytes32'
}

// Type checking during compilation
function typeCheck(node) {
  if (node.type === 'apply') {
    const funcSig = functionSignatures[node.function.name];
    
    // Verify argument types match
    node.args.forEach((arg, i) => {
      const expectedType = funcSig.params[i];
      const actualType = inferType(arg);
      
      if (!isCompatible(actualType, expectedType)) {
        throw new TypeError(
          `Expected ${expectedType}, got ${actualType}`
        );
      }
    });
    
    return funcSig.returnType;
  }
}
```

## Optimization Passes

The AST engine enables various optimizations:

### Dead Code Elimination

```javascript
function eliminateDeadCode(ast) {
  return transform(ast, {
    if(node) {
      // Remove if statements with constant conditions
      if (node.condition.type === 'atom') {
        return node.condition.value ? node.then : node.else;
      }
      return node;
    }
  });
}
```

### Common Subexpression Elimination

```javascript
function eliminateCommonSubexpressions(ast) {
  const expressions = new Map();
  
  return transform(ast, {
    apply(node) {
      const key = serializeNode(node);
      
      if (expressions.has(key)) {
        // Replace with reference to computed value
        return { type: 'symbol', name: expressions.get(key) };
      }
      
      // Store for future reference
      const tempVar = generateTempVar();
      expressions.set(key, tempVar);
      
      return {
        type: 'let',
        bindings: [{ name: tempVar, value: node }],
        body: { type: 'symbol', name: tempVar }
      };
    }
  });
}
```

## Debugging with AST

The AST representation makes debugging easier:

```javascript
// Pretty print AST
function prettyPrint(node, indent = 0) {
  const spaces = ' '.repeat(indent);
  
  switch (node.type) {
    case 'atom':
      return `${spaces}Atom(${node.value})`;
    
    case 'symbol':
      return `${spaces}Symbol(${node.name})`;
    
    case 'list':
      const elements = node.elements
        .map(el => prettyPrint(el, indent + 2))
        .join('\n');
      return `${spaces}List[\n${elements}\n${spaces}]`;
    
    // ... other node types
  }
}

console.log(prettyPrint(ast));
```

## Extensibility

The AST engine is designed to be extensible:

### Custom Node Types

```javascript
// Define a custom node type for a domain-specific construct
const customNodeTypes = {
  timelockCondition: {
    validate(node) {
      return node.timestamp && typeof node.timestamp === 'number';
    },
    
    transform(node) {
      return {
        type: 'list',
        elements: [
          { type: 'symbol', name: 'ASSERT_SECONDS_ABSOLUTE' },
          { type: 'atom', value: node.timestamp }
        ]
      };
    }
  }
};
```

### Plugin System

```javascript
// Register a plugin that adds new functionality
registerPlugin({
  name: 'macro-expansion',
  
  visitors: {
    macro(node, context) {
      const expansion = context.macros[node.name];
      if (expansion) {
        return expansion(...node.args);
      }
      throw new Error(`Unknown macro: ${node.name}`);
    }
  }
});
```

## Performance Considerations

The AST engine is optimized for:

1. **Memory efficiency** - Nodes are immutable and can be shared
2. **Fast traversal** - Visitor pattern minimizes overhead
3. **Incremental compilation** - Only changed subtrees are recompiled
4. **Caching** - Common subexpressions are memoized

## Summary

The AST engine is the foundation that enables:

1. **CoinScript** - High-level syntax compiles to AST
2. **PuzzleBuilder** - JavaScript API generates AST
3. **Optimizations** - Transform AST for better performance
4. **Type safety** - Validate programs before deployment
5. **Extensibility** - Add new features and languages

By understanding the AST engine, you can:
- Create custom languages that compile to ChiaLisp
- Build advanced code generation tools
- Optimize smart contracts programmatically
- Debug and analyze CoinScript programs

The AST engine makes ChiaLisp accessible while maintaining its power and flexibility!