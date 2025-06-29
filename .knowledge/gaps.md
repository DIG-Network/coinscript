# Implementation Gaps and Known Issues

## Status: 2024-12-29T20:30:00Z

This file tracks known implementation gaps, missing functionality, and behavioral mismatches between specifications and code.

## Critical Gaps

### 1. State Management Layer MOD_HASH Calculation
- **Issue**: State management layer uses placeholder values for MOD_HASH
- **Files Affected**: 
  - `src/layers/stateManagementLayer.ts`
  - All stateful CoinScript tests
- **Current State**: 
  - State management layer implemented and generating valid ChiaLisp
  - Using placeholder `"1"` for MOD_HASH in finalizer
  - Need to calculate actual puzzle mod hash for proper coin recreation
- **Progress** (2024-12-29T21:00:00Z):
  - ✅ Implemented full state management layer based on state-pattern-analysis.md
  - ✅ Fixed CLVM compilation errors
  - ✅ Proper state currying and finalizer pattern working
  - ❌ MOD_HASH calculation still using placeholder
- **Impact**: State persistence won't work correctly without proper puzzle hash
- **Status**: 🟡 Partially Complete - Core functionality done, MOD_HASH calculation needed

### 2. PuzzleBuilder Missing Methods (Lower Priority)
- **Issue**: PuzzleBuilder lacks several methods used in tests
- **Files Affected**: 
  - `src/__tests__/integration/puzzle-types-simulator.test.ts`
- **Missing Methods**:
  - `ifConditions()` - Workaround: Use `if()` with Expression
  - `addParam()` - Workaround: Use `add()` method
  - `validateState()` - State validation method
  - `returnConditions(expr)` - Workaround: Use returnValue()
- **Impact**: Tests need to use alternative APIs
- **Status**: 🟡 Low Priority - Has workarounds

### 3. Conditions Module Missing (Not Critical)
- **Issue**: The conditions module is imported but doesn't exist
- **Workaround**: Use `includeConditionCodes()` which provides constants
- **Status**: 🟡 Low Priority - Has workaround

## Resolved Gaps ✅

### 1. ChiaLisp String Literal Generation
- **Issue**: Generated `"()"` as string literals instead of `()` or `NIL`
- **Resolution**: Updated parser to use NIL for empty lists
- **Files Fixed**:
  - `src/coinscript/parser.ts` - parsePrimary() and generateExpressionStatic()
- **Resolved**: 2024-12-29T00:30:00Z
- **Status**: ✅ Resolved

### 2. State Field Access
- **Issue**: `state.fieldName` didn't generate proper CLVM code
- **Resolution**: Implemented proper list access operations in MemberExpression
- **Implementation**: 
  - `state.counter` → `(f current_state)` for first field
  - `state.owner` → `(f (r current_state))` for second field
- **Resolved**: 2024-12-29T00:45:00Z
- **Status**: ✅ Resolved

### 3. Action Routing with Slot Machine
- **Issue**: Action routing was generated even when slot machine layer active
- **Resolution**: Added check to skip action routing when hasStatefulActions is true
- **Resolved**: 2024-12-29T00:50:00Z
- **Status**: ✅ Partially Resolved (main issue fixed)

### 4. CoinScript State Management
- **Issue**: State management wasn't properly integrated with CoinScript
- **Resolution**: Implemented @stateful decorator and state blocks
- **Resolved**: 2024-12-28T23:30:00Z
- **Status**: ✅ Resolved

### 5. Expression Type Conflicts
- **Issue**: Naming conflict between AST Expression and BuilderExpression
- **Resolution**: Renamed imports to avoid collision
- **Resolved**: 2024-12-28T20:00:00Z
- **Status**: ✅ Resolved

## Behavioral Mismatches

### 1. Singleton Layer Parameter Format
- **Issue**: `withSingletonLayer` expects string but tests pass object
- **Expected**: String launcher ID
- **Actual**: Object with launcherId property
- **Status**: 🟡 Needs Investigation

## Missing Implementations

### 1. Condition Helper Functions
- **Description**: Need to implement missing condition helper functions
- **Required Functions**:
  - Coin creation helpers
  - Announcement helpers
  - Fee reservation helpers
- **Status**: 🔴 Not Started

### 2. PuzzleBuilder Extensions
- **Description**: Need to extend PuzzleBuilder with missing methods
- **Required Methods**:
  - Conditional execution helpers
  - Parameter handling
  - State validation
- **Status**: 🔴 Not Started

## Testing Gaps

### 1. Integration Test Compilation
- **Issue**: Many integration tests have TypeScript errors
- **Root Cause**: Missing methods and type mismatches
- **Impact**: Cannot verify full functionality
- **Status**: 🟡 In Progress

## Notes

- The critical slot machine layer issue is the last major blocker
- Once fixed, all state management tests should pass
- Lower priority issues have workarounds and don't block functionality
- Update this file when gaps are resolved or new ones discovered 