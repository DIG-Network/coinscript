# Core Module API Reference

## Overview
The core module provides the fundamental data structures and operations for working with ChiaLisp/CLVM trees. It is the foundation of the entire framework.

## Data Structures

### TreeNode
The base type for all tree structures:
```typescript
type TreeNode = Atom | List | Cons;
```

### Atom
Represents a single value (number, bytes, string, etc.):
```typescript
interface Atom {
  type: 'atom';
  value: AtomValue;
}

type AtomValue = number | bigint | Uint8Array | string | boolean | null;
```

### List
Represents a proper list (nil-terminated):
```typescript
interface List {
  type: 'list';
  items: TreeNode[];
}
```

### Cons
Represents a cons pair (improper list):
```typescript
interface Cons {
  type: 'cons';
  first: TreeNode;
  rest: TreeNode;
}
```

## Builder Functions

### Basic Builders
```typescript
// Create an atom with any value
atom(value: AtomValue): Atom

// Create a list from items
list(items: TreeNode[]): List

// Create a cons pair
cons(first: TreeNode, rest: TreeNode): Cons

// Create nil (empty list)
nil: Atom
```

### Specialized Builders
```typescript
// Create integer atom
int(value: number | bigint): Atom

// Create hex bytes atom (accepts 0x prefix)
hex(value: string): Atom

// Create bytes atom
bytes(value: Uint8Array): Atom

// Create symbol atom
sym(value: string): Atom

// Create string atom (as bytes)
str(value: string): Atom

// Build nested list from items
buildList(...items: TreeNode[]): TreeNode
```

## Type Guards

```typescript
// Check if node is an atom
isAtom(node: TreeNode): node is Atom

// Check if node is a list
isList(node: TreeNode): node is List

// Check if node is a cons pair
isCons(node: TreeNode): node is Cons

// Check if atom represents nil
isNil(node: TreeNode): boolean
```

## Serialization

### serialize()
Convert tree to ChiaLisp string:
```typescript
serialize(node: TreeNode, options?: SerializeOptions): string

interface SerializeOptions {
  useKeywords?: boolean;      // Use 'q' instead of 1
  useOpcodeConstants?: boolean; // Use QUOTE instead of q
  hexPrefix?: boolean;        // Output hex with 0x prefix
  indent?: boolean;           // Pretty-print with indentation
  indentString?: string;      // Indentation string (default: '  ')
  comments?: Map<TreeNode, string>; // Node comments
  blockComments?: string[];   // Standalone comments
  includedLibraries?: string[]; // Included .clib files
}
```

Examples:
```typescript
const tree = list([sym('mod'), sym('@'), sym('@')]);
serialize(tree); // "(mod @ @)"
serialize(tree, { indent: true }); // Formatted output
```

## Parsing

### parse()
Parse ChiaLisp source to tree:
```typescript
parse(source: string, options?: ParseOptions): TreeNode

interface ParseOptions {
  symbolsByDefault?: boolean; // Treat strings as symbols (default: true)
}
```

Examples:
```typescript
parse("(+ 1 2)"); // list([sym('+'), int(1), int(2)])
parse("(c 1 . 2)"); // cons pair notation
parse("0xdeadbeef"); // hex atom
```

## Hashing

### sha256()
Calculate SHA256 hash:
```typescript
sha256(data: Uint8Array | string): Uint8Array
```

### sha256tree()
Calculate ChiaLisp tree hash:
```typescript
sha256tree(node: TreeNode): Uint8Array
```

## Conversion

### treeToProgram()
Convert tree to clvm-lib Program:
```typescript
treeToProgram(node: TreeNode): Program
```

### programToTree()
Convert Program to tree:
```typescript
programToTree(program: Program): TreeNode
```

## CLVM Operators

Pre-defined operator constants:
```typescript
// Core operators
QUOTE     // q - quote
APPLY     // a - apply/eval
IF        // i - if
CONS      // c - cons
FIRST     // f - first
REST      // r - rest
LISTP     // l - is list?
RAISE     // x - raise exception
EQ        // = - equals

// Math operators
ADD       // + - addition
SUBTRACT  // - - subtraction
MULTIPLY  // * - multiplication
DIVIDE    // / - division
DIVMOD    // divmod
GT        // > - greater than
GTS       // >s - greater than (bytes)

// Bit operations
ASH       // ash - arithmetic shift
LSH       // lsh - logical shift
LOGAND    // logand
LOGIOR    // logior
LOGXOR    // logxor
LOGNOT    // lognot

// Logic operations
NOT       // not
ANY       // any
ALL       // all

// Crypto operations
SHA256    // sha256
SHA256TREE // sha256tree
SHA256TREE1 // sha256tree1

// Common constants
NIL       // () - empty list
ARG       // @ - argument reference
ARG1      // 1 - first argument
ARG2      // 2 - second argument
MOD       // mod - module definition
```

## Currying and Substitution

### curry()
Curry a puzzle with fixed arguments:
```typescript
curry(puzzle: TreeNode, ...args: TreeNode[]): TreeNode
```

### substitute()
Replace variables with values:
```typescript
substitute(tree: TreeNode, substitutions: Map<string, TreeNode>): TreeNode
```

## Error Types

```typescript
class TreeError extends Error {
  code: string;
}

class ParseError extends TreeError {
  source?: string;
  position?: number;
}

class SerializeError extends TreeError {}

class ConversionError extends TreeError {}
```

## Common Patterns

### Creating a Module
```typescript
const module = list([
  MOD,
  list([sym('OWNER_PUBKEY'), sym('@')]), // parameters
  list([                                  // body
    IF,
    list([EQ, ARG1, sym('OWNER_PUBKEY')]),
    ARG2,
    list([RAISE])
  ])
]);
```

### Building Conditions
```typescript
const conditions = list([
  list([int(51), hex('0xabcd...'), int(100)]), // CREATE_COIN
  list([int(50), hex('0x1234...'), NIL])       // AGG_SIG_ME
]);
```

### Working with Atoms
```typescript
// Numbers
const num = int(42);
const big = int(123456789012345678901234567890n);

// Hex values
const pubkey = hex('0x1234567890abcdef...');
const hash = hex('deadbeef'); // 0x prefix optional

// Symbols
const param = sym('OWNER');
const op = sym('+');
```

## Best Practices

1. **Use Type Guards**: Always check node types before accessing properties
2. **Prefer Builders**: Use builder functions instead of manual object creation
3. **Handle Nil**: Remember that nil is `atom(null)`, not an empty list
4. **Immutability**: Tree nodes are immutable - operations return new nodes
5. **Error Handling**: Wrap parse/serialize in try-catch for user input

## Performance Considerations

1. **Tree Hashing**: Cache hash results for large trees
2. **Serialization**: Use indent only for debugging (slower)
3. **Parsing**: Pre-validate syntax for better error messages
4. **Large Numbers**: Use bigint for values > MAX_SAFE_INTEGER 