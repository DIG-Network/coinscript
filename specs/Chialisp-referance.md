# Chialisp Complete Guide

## Table of Contents
1. [What is Chialisp](#what-is-chialisp)
2. [Installation and Setup](#installation-and-setup)
3. [Basic Syntax and Structure](#basic-syntax-and-structure)
4. [Modules in Chialisp](#modules-in-chialisp)
5. [Operators and Functions](#operators-and-functions)
6. [Smart Coins and Puzzles](#smart-coins-and-puzzles)
7. [Code Examples and Best Practices](#code-examples-and-best-practices)
8. [Advanced Topics](#advanced-topics)
9. [Development Tools](#development-tools)
10. [Additional Resources](#additional-resources)

## What is Chialisp

Chialisp is a pure functional programming language designed specifically for the Chia blockchain. It serves as the smart contract language that enables programmable money through "smart coins" - coins with built-in spending conditions.

### Key Features
- **Security-First Design**: No side effects or hidden information make security flaws easier to identify
- **Sandboxed Execution**: CLVM (Chialisp Virtual Machine) runs in complete isolation
- **Functional Paradigm**: Based on Lisp with immutable data structures
- **Auditability**: Programs are transparent and verifiable
- **Turing Complete**: Full computational power while maintaining security

### Purpose
Chialisp enables behavior similar to smart contracts on other blockchains but uses Chia's coin set (UTXO-like) model. Every coin on the Chia blockchain has an associated Chialisp program (puzzle) that dictates how and when it can be spent.

## Installation and Setup

### Prerequisites
- Python 3.10 or higher
- Virtual environment (recommended)

### Installation Steps

1. **Create a virtual environment**:
```bash
# Linux/Mac
python3 -m venv venv
source venv/bin/activate

# Windows
py -m venv venv
.\venv\Scripts\activate
```

2. **Install Chia Dev Tools**:
```bash
pip install chia-dev-tools
```

3. **Verify installation**:
```bash
run '(q . "test")'
# Output: "test"
```

### Command-Line Tools

**`run`** - Compile Chialisp code:
```bash
run '(+ 2 3)'  # Direct evaluation
run program.clsp  # Compile from file
```

**`brun`** - Execute compiled CLVM with arguments:
```bash
brun '(+ 2 3)' '()'  # Output: 5
brun compiled_program '(100 200)'  # With arguments
```

**`cdv`** - Chia development tools:
```bash
cdv clsp curry program.clsp -a argument
cdv rpc coinrecords --by puzzlehash 0x...
```

## Basic Syntax and Structure

### LISP Fundamentals
Chialisp uses fully parenthesized prefix notation:
```clsp
(operator operand1 operand2 ...)
```

### Data Types
- **Atoms**: Numbers or byte strings (e.g., `42`, `"hello"`, `0xdeadbeef`)
- **Lists**: Ordered collections (e.g., `(1 2 3)`, `(+ 2 3)`)
- **Nil**: Empty list `()` represents false

### Program Arguments
Programs receive arguments that can be accessed by position:
- `@` or `1` - entire argument list
- `2` - first argument (head of list)
- `3` - rest of arguments (tail of list)
- `4` - second argument (head of tail)
- `5` - third argument
- etc.

Example:
```clsp
; With arguments (100 200 300)
brun '2' '(100 200 300)'  ; Returns: 100
brun '5' '(100 200 300)'  ; Returns: 300
```

## Modules in Chialisp

### Basic Module Structure
```clsp
(mod (parameter1 parameter2)
  ; Optional includes
  (include *standard-cl-24*)
  
  ; Function definitions
  (defun function-name (args) 
    function-body)
  
  ; Constants
  (defconstant CONSTANT_NAME value)
  
  ; Main program logic
  main-expression
)
```

### Module Components

#### **`mod`** - Module wrapper
Defines a reusable program with parameters:
```clsp
(mod (x y)
  (+ (* x x) (* y y))  ; Returns x² + y²
)
```

#### **`include`** - Import libraries
```clsp
(include *standard-cl-24*)  ; Modern Chialisp features
(include sha256tree.clib)   ; Custom library
```

#### **`defun`** - Function definitions
```clsp
(mod ()
  (defun factorial (n)
    (if (> n 1)
      (* n (factorial (- n 1)))
      1
    )
  )
  (factorial 5)  ; Returns: 120
)
```

#### **`defun-inline`** - Inline functions
Replaced at compile time for efficiency:
```clsp
(defun-inline square (x) (* x x))
```

#### **`defconstant`** - Named constants
```clsp
(defconstant AGG_SIG_ME 50)
(defconstant CREATE_COIN 51)
```

#### **`lambda`** - Anonymous functions
```clsp
(lambda (x y) (+ x y))
```

#### **`defmacro`** - Macros
For code generation:
```clsp
(defmacro assert (condition message)
  (qq (if (not (unquote condition))
    (x (unquote message))
  ))
)
```

## Operators and Functions

### Arithmetic Operators
| Operator | Description | Example |
|----------|-------------|---------|
| `+` | Addition | `(+ 2 3 4)` → `9` |
| `-` | Subtraction | `(- 10 3 2)` → `5` |
| `*` | Multiplication | `(* 2 3 4)` → `24` |
| `/` | Division (rounds toward -∞) | `(/ 15 3)` → `5` |
| `divmod` | Division with remainder | `(divmod 17 5)` → `(3 . 2)` |

### Comparison Operators
| Operator | Description | Example |
|----------|-------------|---------|
| `=` | Equality | `(= 5 5)` → `1` |
| `>` | Greater than (numeric) | `(> 5 3)` → `1` |
| `>s` | Greater than (bytes) | `(>s "b" "a")` → `1` |
| `not` | Logical not | `(not ())` → `1` |
| `all` | All truthy | `(all 1 2 3)` → `1` |
| `any` | Any truthy | `(any () 0 5)` → `1` |

### List Operations
| Operator | Description | Example |
|----------|-------------|---------|
| `f` | First element | `(f (1 2 3))` → `1` |
| `r` | Rest of list | `(r (1 2 3))` → `(2 3)` |
| `c` | Cons (prepend) | `(c 1 (2 3))` → `(1 2 3)` |
| `l` | Is list? | `(l (1 2))` → `1` |

### Control Flow
#### **`if`** - Conditional (lazy evaluation)
```clsp
(if (> x 100)
  "large"
  "small"
)
```

#### **`i`** - Conditional (strict evaluation)
Evaluates all branches before selection

#### **`x`** - Raise exception
```clsp
(x "error message")
```

### Evaluation Control
| Operator | Description | Example |
|----------|-------------|---------|
| `q` | Quote | `(q . 42)` → `42` |
| `a` | Apply/evaluate | `(a (q . +) (q . (2 3)))` → `5` |
| `qq` | Quasiquote | Template with unquote |
| `unquote` | Evaluate in qq | `(qq (+ 2 (unquote x)))` |

### Cryptographic Functions
| Function | Description |
|----------|-------------|
| `sha256` | SHA-256 hash |
| `point_add` | BLS12-381 point addition |
| `g1_add` | G1 point addition |
| `bls_verify` | BLS signature verification |

### String/Byte Operations
| Function | Description | Example |
|----------|-------------|---------|
| `concat` | Concatenate | `(concat "hello" " " "world")` |
| `strlen` | Length | `(strlen "hello")` → `5` |
| `substr` | Substring | `(substr "hello" 1 3)` → `el` |
| `logand` | Bitwise AND | |
| `logior` | Bitwise OR | |
| `logxor` | Bitwise XOR | |
| `ash` | Arithmetic shift | |

## Smart Coins and Puzzles

### Core Concepts

**Smart Coins** have three components:
1. **Parent coin ID** - 32-byte identifier of creating coin
2. **Puzzle hash** - 32-byte hash of the Chialisp program
3. **Amount** - Value in mojos (1 XCH = 10¹² mojos)

**Puzzles** are Chialisp programs that define spending rules
**Solutions** are arguments provided when spending

### Coin Lifecycle
1. Coin created with puzzle hash and amount
2. To spend: reveal puzzle + provide solution
3. Puzzle executes with solution
4. Returns list of conditions
5. Network validates conditions

### Standard Conditions

| Condition | Code | Description |
|-----------|------|-------------|
| `CREATE_COIN` | 51 | Create new coin |
| `AGG_SIG_ME` | 50 | Require signature |
| `RESERVE_FEE` | 52 | Reserve transaction fee |
| `ASSERT_SECONDS_ABSOLUTE` | 81 | Time lock (seconds) |
| `ASSERT_HEIGHT_ABSOLUTE` | 83 | Block height lock |

Example usage:
```clsp
; Create a new coin
(list CREATE_COIN puzzle_hash amount)

; Require signature
(list AGG_SIG_ME public_key message)
```

### Currying
Pre-load puzzle parameters:
```bash
cdv clsp curry puzzle.clsp -a 0xdeadbeef -a 1000
```

In code:
```clsp
(mod (FIXED_PARAMETER solution)
  ; FIXED_PARAMETER is curried in
  (if (= solution FIXED_PARAMETER)
    (list (list CREATE_COIN puzzle_hash amount))
    (x)
  )
)
```

## Code Examples and Best Practices

### Hello World
```clsp
(mod ()
  (q . "Hello, Chialisp!")
)
```

### Simple Calculator
```clsp
(mod (operation x y)
  (if (= operation "+") (+ x y)
  (if (= operation "-") (- x y)
  (if (= operation "*") (* x y)
  (if (= operation "/") (/ x y)
    (x "Invalid operation")
  ))))
)
```

### Password-Locked Coin (Educational - NOT SECURE)
```clsp
(mod (PASSWORD_HASH password conditions)
  (if (= (sha256 password) PASSWORD_HASH)
    conditions
    (x "Wrong password")
  )
)
```
**Warning**: Passwords are visible in mempool - use signatures instead!

### Signature-Secured Coin
```clsp
(mod (PUBLIC_KEY conditions)
  (c 
    (list AGG_SIG_ME PUBLIC_KEY (sha256tree conditions))
    conditions
  )
)
```

### Time-Locked Coin
```clsp
(mod (UNLOCK_TIME conditions)
  (c 
    (list ASSERT_SECONDS_ABSOLUTE UNLOCK_TIME)
    conditions
  )
)
```

### Best Practices
1. **Security First**: Always use cryptographic signatures over passwords
2. **Validate Inputs**: Check all solution parameters
3. **Minimize Costs**: Optimize for CLVM cost efficiency
4. **Test Thoroughly**: Use simulator for comprehensive testing
5. **Document Code**: Clear comments for complex logic

## Advanced Topics

### Modern Chialisp Features
With `(include *standard-cl-24*)`:

#### **let bindings**
```clsp
(let ((x 10) (y 20))
  (+ x y)
)
```

#### **assign with destructuring**
```clsp
(assign (first . rest) my_list
  ; Use first and rest here
)
```

#### **@ capture syntax**
```clsp
(assign my_list @ (x y . z)
  ; @ captures entire list
  ; x, y, z destructure it
)
```

### Inner Puzzles
Nested puzzle architecture:
```clsp
(mod (INNER_PUZZLE inner_solution)
  ; Outer puzzle wraps inner
  (a INNER_PUZZLE inner_solution)
)
```

### Singletons
Unique coins with persistent identity:
- Guaranteed uniqueness via launcher
- Used for NFTs, DIDs
- Maintain state across spends

### CATs (Chia Asset Tokens)
Fungible tokens on Chia:
```clsp
; Simplified CAT structure
(mod (TAIL_HASH INNER_PUZZLE inner_solution)
  ; Verify TAIL conditions
  ; Execute inner puzzle
)
```

### DeFi Patterns
- **Atomic Swaps**: Cross-coin exchanges
- **Offers**: Decentralized order matching
- **AMMs**: Automated market makers
- **Vaults**: Time-locked value storage

## Development Tools

### IDEs and Editors

#### **Rhizosphere**
Python-based GUI IDE:
- Syntax highlighting
- Hex serialization
- Wallet integration
- [GitHub: BrandtH22/Rhizosphere](https://github.com/BrandtH22/Rhizosphere)

#### **Clovyr Code**
Browser-based environment:
- Pre-configured tools
- No installation needed
- [https://clovyr.app/instant/code.2Dchia](https://clovyr.app/instant/code.2Dchia)

#### **VS Code**
- Chialisp language extension
- Syntax highlighting
- Available in marketplace

### Testing Tools

#### **cdv test**
```bash
cdv test  # Run test suite
```

#### **Chia Simulator**
```python
# Local blockchain for testing
from chia.simulator import simulator
```

### Debugging

#### **cldb debugger**
```bash
cldb program.clvm '(arguments)'
```

#### **Print debugging**
```clsp
(mod (x)
  (c (q . "Debug:") (c x (q . ())))
)
```

## Additional Resources

### Official Documentation
- **Primary**: [https://chialisp.com/](https://chialisp.com/)
- **Chia Docs**: [https://docs.chia.net/](https://docs.chia.net/)
- **Interactive Examples**: Available on chialisp.com

### Community
- **Discord**: #chialisp channel on Chia Network server
- **GitHub**: [Chia-Network](https://github.com/Chia-Network)
- **Forum**: [ChiaForum.com](https://chiaforum.com)

### Learning Path
1. Start with basic syntax and operators
2. Practice with simple puzzles
3. Learn about coins and conditions
4. Explore currying and parameters
5. Study security patterns
6. Build complex smart contracts

### Libraries
- **Cypher ChiaLisp Library**: [hashgreen/cypher-chialisp](https://github.com/hashgreen/cypher-chialisp)
- **Standard Library**: Included with `*standard-cl-24*`

### Video Resources
- Official Chia Network tutorials on YouTube
- Community-created content
- Conference talks and presentations

---

This README provides a comprehensive guide to Chialisp programming. For the latest updates and additional examples, refer to the official documentation at [chialisp.com](https://chialisp.com/). Remember that Chialisp prioritizes security and correctness - always test thoroughly and consider edge cases when developing smart contracts.