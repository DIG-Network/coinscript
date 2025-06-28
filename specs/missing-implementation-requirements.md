# Missing Implementation Requirements for Production ChiaLisp Conversion

## Overview
This document outlines the missing pieces required to complete the production-ready implementation of the ChiaLisp conversion layer for the Chia Puzzle Framework.

## Current Status
The framework has been updated to use `clvm-lib` for proper CLVM serialization and operations. The clvm-lib API has been identified and uses properties instead of methods for accessing Program data.

## API Corrections

### clvm-lib Program API (CORRECT)
Based on the TypeScript definitions in `node_modules/clvm-lib/dist/src/index.d.ts`:

#### Properties (not methods):
- `atom: Uint8Array` - Get atom value (null if cons)
- `cons: Cons` - Get cons pair [Program, Program] 
- `first: Program` - Get first element of cons
- `rest: Program` - Get rest element of cons
- `isAtom: boolean` - Check if atom
- `isCons: boolean` - Check if cons
- `isNull: boolean` - Check if null

#### Methods:
- `toInt(): number` - Convert atom to integer
- `toBigInt(): bigint` - Convert atom to bigint
- `toList(strict?: boolean): Program[]` - Convert to list
- `toBytes(): Uint8Array` - Convert atom to bytes
- `toText(): string` - Convert atom to text
- `toHex(): string` - Convert to hex string
- `hashHex(): string` - Get tree hash as hex
- `serialize(): Uint8Array` - Serialize to CLVM bytes

## Required Code Updates

### 1. Fix PuzzleConverter.ts
Replace method calls with property access:
- Change `program.as_pair()` to access `program.first` and `program.rest` 
- Change `program.as_atom()` to `program.atom`
- Change `program.as_int()` to `program.toInt()`
- Change `program.as_list()` to `program.toList()`

### 2. Fix PuzzleTemplates.ts 
Similar updates needed for Program property access.

### 3. Fix CLVMSerializer.ts
Update to use correct Program properties and methods.

## Missing Implementations

### 1. Puzzle Templates

The puzzle templates are currently placeholders. Production requires actual compiled CLVM bytecode for:

#### Standard Puzzle (p2_delegated_puzzle_or_hidden_puzzle)
- **File**: `p2_delegated_puzzle_or_hidden_puzzle.clvm`
- **Required**: Actual compiled bytecode hex
- **Source**: Official Chia blockchain repository
- **Approximate hex**: `ff02ffff01ff02ff0effff04ff02ffff04ff05ffff04ff0bffff04ff17ff8080808080ff0180ffff04ffff01ffffffff4947ff0233ffff01ff02ff02ffff03ff05ffff01ff02ff36ffff04ff02ffff04ff0dffff04ffff0bff2cffff0bff3cff3480ffff0bff2cffff0bff2cffff0bff3cff1480ff0980ffff0bff2cff0bffff0bff3cff8080808080ff8080808080ffff010b80ff0180ffffff02ffff03ff17ffff01ff02ffff03ff82013fffff01ff04ffff04ff38ffff04ffff0bffff02ff26ffff04ff02ffff04ff13ffff04ff822bffff04ff82013fff8080808080ffff01ff02ff16ffff04ff02ffff04ff82013fffff04ffff0bffff02ff26ffff04ff02ffff04ff13ffff04ff2bff80808080ffff04ff2bff808080808080ff8080808080ffff01ff04ff17ffff01ff02ff0affff04ff02ffff04ff03ffff04ff82013fff8080808080ff80808080ff0180ffff04ffff01ffffff5002ff3624ffff04ff0bff80808080ff02ffff03ffff07ff0580ffff01ff0bffff0102ffff02ff26ffff04ff02ffff04ff09ff80808080ffff02ff26ffff04ff02ffff04ff0dff8080808080ffff01ff0bffff0101ff058080ff0180ff018080`

#### Multi-Signature Puzzle
- **File**: `p2_m_of_n_delegate_direct.clvm` or similar
- **Required**: Compiled template supporting M-of-N signatures

#### CAT v2 Puzzle
- **File**: `cat_v2.clvm`
- **Required**: Official CAT v2 compiled bytecode
- **Known hash**: `72dec062874cd4d3aab892a0906688a1ae412b0109982e1797a170add88bdcdc`

#### Singleton Puzzle
- **File**: `singleton_top_layer_v1_1.clvm`
- **Required**: Official singleton compiled bytecode
- **Known hash**: `40f828d8dd55603f4ff9fbf6b73271e904e69406982f4fbefae2c8dcceaf9834`

### 2. ChiaLisp Compiler Integration

The `Program.fromSource()` exists but requires proper ChiaLisp source, not arbitrary strings.

**Required**: 
- Proper ChiaLisp source generation
- Support for mod expressions
- Include statements handling

### 3. Solution Building for Complex Puzzles

#### SmartCoin Solution Building
- Current implementation uses placeholder bytes
- Need to properly build condition list as CLVM Program:
```typescript
// Convert conditions to Program list
const conditionPrograms = conditions.map(c => {
  const opcodeProgram = Program.fromInt(c.opcode);
  const argPrograms = c.args.map(arg => convertToProgram(arg));
  return Program.fromList([opcodeProgram, ...argPrograms]);
});
const conditionList = Program.fromList(conditionPrograms);
```

### 4. Missing Condition Type Handling

Need to handle all condition types in the switch statement properly with correct argument count and type conversions.

### 5. Test Updates

Update tests to:
- Use correct method names (`hash` instead of `sha256`)
- Fix type assertions
- Add round-trip conversion tests

## Implementation Priority

1. **Fix all Program API usage** (High - Blocking compilation)
2. **Fix test method names** (High - Blocking tests)
3. **Implement proper solution building** (High - Core functionality) 
4. **Add official puzzle templates** (Medium - Can use placeholders initially)
5. **Add remaining condition types** (Medium - Completeness)
6. **Integration tests** (Low - After core works)

## Next Steps

1. Update all files using incorrect Program API
2. Fix test files to use correct Hasher method names
3. Implement proper CLVM Program building for solutions
4. Add at least placeholder puzzle templates that produce valid CLVM
5. Create integration tests for basic operations

The framework architecture is sound. With these corrections, it will provide a production-ready TypeScript abstraction for Chia puzzle development. 