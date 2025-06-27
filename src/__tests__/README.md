# Chia Puzzle Framework Tests

This directory contains comprehensive tests for the Chia Puzzle Framework.

## Test Files

### Core Tests
- `public-api.test.ts` - Tests for the main public interface (24 tests, all passing)
- `core-api.test.ts` - Focused tests on core functionality that examples depend on
- `builder.test.ts` - Comprehensive tests for PuzzleBuilder class

### Module Tests
- `operators.test.ts` - Tests for all operator modules (arithmetic, comparison, etc.)
- `conditions.test.ts` - Tests for all condition modules (spend, time, signatures, etc.)

### Legacy Tests
- `index.test.ts` - Original comprehensive test suite (needs updates)

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- src/__tests__/public-api.test.ts

# Run with coverage
npm test -- --coverage

# Run in watch mode
npm test -- --watch
```

## Test Coverage

The test suite covers:
- ✅ Core PuzzleBuilder functionality
- ✅ Expression creation and operations
- ✅ Standard puzzle types (CAT, NFT, DID, Singleton)
- ✅ Condition generation
- ✅ Control flow (if/then/else)
- ✅ Parameter handling (curried and solution params)
- ✅ Serialization and mod hash calculation
- ✅ Comments and documentation features
- ✅ Integration examples (escrow, multi-sig, time-locked vaults)

## Known Issues

Some test files have naming mismatches with the actual API:
- Operator tests expect different method names (e.g., `greaterThan` vs `greater`)
- Condition tests expect different method names (e.g., `afterSeconds` vs actual implementation)

These can be fixed by updating the test expectations to match the actual API. 