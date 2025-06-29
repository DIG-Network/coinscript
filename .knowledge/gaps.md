# Implementation Gaps and Known Issues

## Status: 2024-12-30T06:00:00Z

This file tracks known implementation gaps, missing functionality, and behavioral mismatches between specifications and code.

## Critical Gaps

None remaining - all critical gaps have been resolved!

## Medium Priority Gaps

### 1. Inner Solution Parameter Handling
- **Issue**: State management layer doesn't properly handle inner_solution parameter
- **Files Affected**:
  - `src/layers/stateManagementLayer.ts`
- **Current State**: Actions don't receive inner_solution when using inner puzzles
- **Needed**: Pass inner_solution parameter to stateful actions with inner puzzles
- **Impact**: Limited inner puzzle functionality in stateful contracts
- **Status**: 🟡 Medium Priority - Enhances functionality

## Behavioral Mismatches

### 1. Singleton Layer Parameter Format
- **Issue**: `withSingletonLayer` expects string but tests pass object
- **Expected**: String launcher ID
- **Actual**: Object with launcherId property
- **Status**: 🟡 Needs Investigation

## Missing Implementations

### 1. Dynamic Mod Hash Calculation
- **Description**: Replace hardcoded STANDARD_MOD_HASHES with dynamic calculation
- **Status**: 🟡 Medium Priority - From tasks.md

## Testing Gaps

### 1. Integration Test Compilation
- **Issue**: Some integration tests still have minor issues
- **Root Cause**: API usage patterns need updating
- **Impact**: Cannot verify full functionality in all scenarios
- **Status**: 🟡 Minor - Most tests pass

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
- **Status**: ✅ Resolved

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

### 6. Inner Puzzle Pattern Support
- **Issue**: No support for inner puzzle patterns in CoinScript
- **Resolution**: Implemented inner() method and inner puzzle expressions
- **Resolved**: 2024-12-30T05:30:00Z
- **Status**: ✅ Core functionality implemented

### 7. State Management Layer MOD_HASH Calculation
- **Issue**: State management layer used placeholder values for MOD_HASH
- **Resolution**: 
  - Added automatic MOD_HASH calculation from inner puzzle tree
  - Uses toModHash() utility to calculate proper sha256tree hash
  - Accepts optional moduleHash parameter to override calculation
- **Files Fixed**:
  - `src/layers/stateManagementLayer.ts` - Added proper hash calculation
  - `src/core/utils.ts` - Added toModHash utility function
- **Resolved**: 2024-12-30T06:00:00Z
- **Status**: ✅ Resolved

### 8. TreeNode/Expression Method Gaps
- **Issue**: TreeNode and Expression types lacked required methods for API compatibility
- **Resolution**:
  - Added toModHash(), toPuzzleReveal(), and toChiaLisp() to core utils
  - Extended Expression class with these methods
  - Created extendTreeNode() helper for adding methods to TreeNode instances
- **Files Fixed**:
  - `src/core/utils.ts` - Added utility functions
  - `src/builder/PuzzleBuilder.ts` - Added methods to Expression class
  - `src/coinscript/ast.ts` - Added method signatures to Expression interface
- **Resolved**: 2024-12-30T06:00:00Z
- **Status**: ✅ Resolved

### 9. SolutionBuilder API Mismatch
- **Issue**: SolutionBuilder add() method expected single argument but tests passed multiple
- **Resolution**:
  - Updated add() to accept variable arguments: add(...values)
  - Maintained backward compatibility for single argument usage
  - Deprecated addMany() but kept it functional
- **Files Fixed**:
  - `src/builder/SolutionBuilder.ts` - Updated add() method signature
- **Resolved**: 2024-12-30T06:00:00Z
- **Status**: ✅ Resolved

### 10. Announcement Function Type Restrictions
- **Issue**: Announcement functions didn't accept Expression/TreeNode types
- **Resolution**:
  - Updated type definitions to accept TreeNode and Expression-like objects
  - Added type checking for objects with 'tree' property
  - Created aliases createAnnouncement/assertAnnouncement for convenience
- **Files Fixed**:
  - `src/conditions/messages.ts` - Updated type definitions and handling
  - `src/conditions/index.ts` - Added announcement aliases
- **Resolved**: 2024-12-30T06:00:00Z
- **Status**: ✅ Resolved

### 11. PuzzleBuilder Missing Methods
- **Issue**: PuzzleBuilder lacked several methods used in tests
- **Resolution**:
  - Added ifConditions() as deprecated alias for if()
  - Added validateState() for state structure documentation
  - Updated returnConditions() to accept optional Expression parameter
  - Added inner() method to create INNER_PUZZLE references
  - Added addParam() that throws helpful error message
- **Files Fixed**:
  - `src/builder/PuzzleBuilder.ts` - Added all missing methods
- **Resolved**: 2024-12-30T06:00:00Z
- **Status**: ✅ Resolved

### 12. Conditions Module Missing
- **Issue**: The conditions module was imported but didn't have proper exports
- **Resolution**: Created proper index.ts that exports all condition functions
- **Files Fixed**:
  - `src/conditions/index.ts` - Added comprehensive exports
- **Resolved**: 2024-12-30T06:00:00Z
- **Status**: ✅ Resolved

### 13. Hex Return Type
- **Issue**: hex() returned Atom but some functions expected string
- **Resolution**: Updated announcement functions to properly handle Atom types
- **Implementation**: Type checking now handles Atom objects correctly
- **Resolved**: 2024-12-30T06:00:00Z
- **Status**: ✅ Resolved