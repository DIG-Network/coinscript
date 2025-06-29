# Reference Documentation Index

## Overview
This index provides a comprehensive guide to all reference documentation in the knowledge base.

## Reference Files

### 1. State Pattern Analysis
- **File**: `./.knowledge/reference/state-pattern-analysis.md`
- **Description**: Deep analysis of the state management pattern implementation in CoinScript
- **Key Concepts**:
  - State persistence across coin spends
  - Action-based state transitions
  - State management layer architecture
  - CoinScript @stateful decorator
- **When to Consult**:
  - Implementing stateful CoinScript contracts
  - Understanding state persistence patterns
  - Debugging state-related issues



### 2. Simulator State Testing
- **File**: `./.knowledge/reference/simulator-state-testing.md`
- **Description**: Guide for testing state management with the Chia simulator
- **Key Concepts**:
  - Simulator setup and configuration
  - State transition testing
  - Cross-block state persistence
  - Performance benchmarking
- **When to Consult**:
  - Writing simulator integration tests
  - Testing stateful contracts
  - Debugging state-related issues

### 3. ChiaLisp CATs (Chia Asset Tokens)
- **File**: `./.knowledge/reference/chialisp-cats.md`
- **Description**: Comprehensive CAT implementation details and patterns
- **Key Concepts**:
  - CAT puzzle structure
  - Ring signature mechanics
  - Tail program implementation
  - Asset issuance and melting
- **When to Consult**:
  - Implementing custom tokens
  - Understanding CAT mechanics
  - Creating asset protocols

### 4. ChiaLisp Inner Puzzles
- **File**: `./.knowledge/reference/chialisp-inner-puzzles.md`
- **Description**: Inner puzzle patterns and composition techniques
- **Key Concepts**:
  - Puzzle composition patterns
  - Inner/outer puzzle relationships
  - Solution forwarding
  - Puzzle revelation strategies
- **When to Consult**:
  - Building layered puzzles
  - Understanding puzzle composition
  - Implementing wrapper puzzles

### 5. ChiaLisp State Management
- **File**: `./.knowledge/reference/chialisp-state.md`
- **Description**: State management patterns and implementations in ChiaLisp
- **Key Concepts**:
  - State encoding/decoding
  - State persistence patterns
  - State validation
  - State machine implementations
- **When to Consult**:
  - Implementing stateful puzzles
  - Understanding state patterns
  - Debugging state issues

### 6. ChiaLisp Reference
- **File**: `./.knowledge/reference/chialisp-referance.md`
- **Description**: Core ChiaLisp language reference and concepts
- **Key Concepts**:
  - CLVM operators
  - ChiaLisp syntax
  - Common patterns
  - Best practices
- **When to Consult**:
  - Learning ChiaLisp basics
  - Understanding CLVM operations
  - Reference for operators

### 7. ChiaLisp Syntax and Development Patterns
- **File**: `./.knowledge/reference/chialisp_syntax_patterns.md`
- **Description**: Comprehensive index of ChiaLisp syntax patterns and best practices from professional code
- **Key Concepts**:
  - Module structure and parameter patterns
  - Include system and libraries
  - Function definitions (defun, defun-inline, macros)
  - Common design patterns (singleton, layer, oracle, etc.)
  - Security patterns and best practices
  - State management techniques
  - Currying and tree hashing patterns
- **When to Consult**:
  - Writing production ChiaLisp code
  - Understanding professional ChiaLisp patterns
  - Learning advanced ChiaLisp techniques
  - Implementing secure puzzles

### 8. CoinScript ChiaLisp Compliance Summary
- **File**: `./.knowledge/reference/coinscript-chialisp-compliance-summary.md`
- **Description**: Analysis of CoinScript's compliance with ChiaLisp patterns and best practices
- **Key Concepts**:
  - Test suite results (19/19 passing)
  - Successfully implemented patterns
  - Areas for improvement
  - Code generation quality analysis
  - Recommendations for users and developers
- **When to Consult**:
  - Understanding CoinScript capabilities
  - Evaluating generated ChiaLisp quality
  - Planning CoinScript improvements
  - Debugging compilation issues

### 9. Core Module API
- **File**: `./.knowledge/reference/core-module-api.md`
- **Description**: Complete API reference for the core module
- **Key Concepts**:
  - TreeNode data structures (Atom, List, Cons)
  - Builder functions
  - Serialization and parsing
  - CLVM operators and hashing
- **When to Consult**:
  - Working with low-level ChiaLisp
  - Building tree structures
  - Converting between formats

### 10. Builder Module API
- **File**: `./.knowledge/reference/builder-module-api.md`
- **Description**: Comprehensive PuzzleBuilder and SolutionBuilder reference
- **Key Concepts**:
  - Fluent puzzle construction API
  - Condition builders
  - Control flow helpers
  - Expression system
- **When to Consult**:
  - Building puzzles programmatically
  - Creating complex conditions
  - Working with expressions

### 11. CoinScript Language Reference
- **File**: `./.knowledge/reference/coinscript-language-reference.md`
- **Description**: Complete CoinScript language documentation
- **Key Concepts**:
  - Coin declarations and syntax
  - State management
  - Actions and decorators
  - Built-in functions
- **When to Consult**:
  - Writing CoinScript contracts
  - Understanding decorators
  - Using state management features

### 12. Layers Module API
- **File**: `./.knowledge/reference/layers-module-api.md`
- **Description**: Complete API documentation for all layer modules
- **Key Concepts**: 
  - Layer interfaces and options
  - Singleton, state, ownership, royalty layers
  - Layer composition patterns
  - Usage examples for each layer
- **When to Consult**: When implementing or using layers in CoinScript

### 13. Chia Smart Coins Guide
- **File**: `./.knowledge/reference/chia-smart-coins-guide.md`
- **Description**: Comprehensive guide to Chia smart coins from official documentation
- **Key Concepts**:
  - Smart coin fundamentals and puzzles
  - Password example with currying and hashing
  - Creating and spending coins
  - Security concerns and best practices
  - Common commands and tools
- **When to Consult**: When learning Chia fundamentals or implementing puzzles

### 14. CoinScript Inner Puzzle Syntax Recommendation
- **File**: `./.knowledge/reference/coinscript-inner-puzzle-syntax-recommendation.md`
- **Description**: Proposed syntax and design patterns for incorporating inner puzzles into CoinScript
- **Key Concepts**:
  - Three syntax approaches (explicit, decorator-based, hybrid)
  - Inner puzzle declarations and interfaces
  - Composition helpers and solution types
  - Implementation phases and migration path
  - Security considerations
- **When to Consult**: 
  - Designing inner puzzle features for CoinScript
  - Understanding inner puzzle composition patterns
  - Planning CoinScript language extensions

### 15. CoinScript Inner Puzzle Implementation Guide
- **File**: `./.knowledge/reference/coinscript-inner-puzzle-implementation-guide.md`
- **Description**: Detailed implementation guide for converting CoinScript inner puzzle syntax to ChiaLisp
- **Key Concepts**:
  - Core concept translations (parameters, execution)
  - Implementation patterns (wrappers, singletons, layers)
  - Compiler implementation steps
  - Code generation and currying management
  - Testing strategies and common pitfalls
- **When to Consult**:
  - Implementing inner puzzle support in CoinScript compiler
  - Understanding ChiaLisp inner puzzle generation
  - Debugging inner puzzle compilation issues
  - Writing tests for inner puzzle functionality

## Usage Guidelines

1. **Before Implementation**: Check relevant reference files for patterns and best practices
2. **During Development**: Use as API reference and implementation guide
3. **Debugging**: Consult for understanding expected behavior
4. **Code Review**: Verify implementations match documented patterns

## Maintenance Notes

- Update this index when adding new reference files
- Keep descriptions concise but informative
- Include clear "when to consult" guidance
- Maintain alphabetical or logical ordering 