---
sidebar_position: 2
title: Getting Started
---

# Getting Started with CoinScript

This guide will help you set up your development environment and get ready to write your first CoinScript smart contract.

## Prerequisites

Before you begin, make sure you have:

- **Node.js** (version 16 or higher)
- **npm** or **yarn** package manager
- A code editor (we recommend VS Code with syntax highlighting extensions)
- Basic knowledge of JavaScript/TypeScript
- Understanding of blockchain concepts

## Installation

### 1. Install the Chia Puzzle Framework

```bash
npm install --save-dev chia-puzzle-framework
```

Or with yarn:

```bash
yarn add --dev chia-puzzle-framework
```

### 2. Install the CoinScript CLI (Optional)

For command-line compilation and tools:

```bash
npm install -g @coinscript/cli
```

### 3. Set Up Your Project

Create a new directory for your project:

```bash
mkdir my-chia-project
cd my-chia-project
npm init -y
```

### 4. Create Your Project Structure

```
my-chia-project/
├── contracts/         # CoinScript contracts (.coins files)
├── build/            # Compiled output
├── test/             # Test files
├── scripts/          # Deployment and interaction scripts
└── package.json
```

## Your First CoinScript File

Create a file `contracts/HelloCoin.coins`:

```coinscript
// HelloCoin.coins
coin HelloCoin {
  storage string message = "Hello, Chia!";
  storage address owner;
  
  constructor(address initialOwner) {
    owner = initialOwner;
  }
  
  action greet() view returns string {
    return message;
  }
  
  action updateMessage(string newMessage) {
    requireSignature(owner);
    message = newMessage;
  }
}
```

## Compiling CoinScript

### Using the Framework

Create a build script `scripts/build.js`:

```javascript
const { PuzzleBuilder } = require('chia-puzzle-framework');
const fs = require('fs');
const path = require('path');

async function build() {
  // Create build directory
  const buildDir = path.join(__dirname, '../build');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
  }
  
  // Compile CoinScript
  const puzzle = new PuzzleBuilder();
  await puzzle.load('./contracts/HelloCoin.coins');
  
  // Save outputs
  const outputs = {
    chialisp: puzzle.toChiaLisp(),
    clvm: puzzle.toCLVM(),
    puzzleHash: puzzle.hash(),
    abi: puzzle.getABI() // Contract interface
  };
  
  fs.writeFileSync(
    path.join(buildDir, 'HelloCoin.json'),
    JSON.stringify(outputs, null, 2)
  );
  
  console.log('✅ Contract compiled successfully!');
  console.log(`Puzzle Hash: ${outputs.puzzleHash}`);
}

build().catch(console.error);
```

Run the build:

```bash
node scripts/build.js
```

### Using the CLI

If you installed the CLI:

```bash
coinscript compile contracts/HelloCoin.coins --output build/
```

## Development Environment Setup

### VS Code Extensions

Install these extensions for the best development experience:

1. **CoinScript Language Support** - Syntax highlighting and IntelliSense
2. **ChiaLisp** - View compiled ChiaLisp with syntax highlighting
3. **Prettier** - Code formatting

### Editor Configuration

Create `.vscode/settings.json`:

```json
{
  "files.associations": {
    "*.coins": "coinscript",
    "*.clsp": "lisp"
  },
  "editor.formatOnSave": true
}
```

## Testing Your Contracts

Create a test file `test/HelloCoin.test.js`:

```javascript
const { PuzzleBuilder, SolutionBuilder, Simulator } = require('chia-puzzle-framework');

describe('HelloCoin', () => {
  let puzzle;
  let simulator;
  
  beforeEach(async () => {
    puzzle = new PuzzleBuilder();
    await puzzle.load('./contracts/HelloCoin.coins');
    simulator = new Simulator();
  });
  
  test('should return greeting', async () => {
    const solution = new SolutionBuilder()
      .addParam('action', 'greet')
      .build();
      
    const result = await simulator.run(puzzle, solution);
    expect(result).toBe('Hello, Chia!');
  });
});
```

## Next Steps

Now that you have your environment set up:

1. **[Quick Start Tutorial](./quick-start)** - Build a complete example
2. **[Basic Examples](./basic-examples)** - Learn common patterns
3. **[CoinScript Introduction](./coinscript/introduction)** - Deep dive into the language
4. **[PuzzleBuilder Guide](./coinscript/puzzle-solution-builder)** - Programmatic contract building

## Troubleshooting

### Common Issues

**Module not found errors**
```bash
npm install --save-dev @types/node
```

**ChiaLisp compilation errors**
- Check your CoinScript syntax
- Ensure all variables are properly declared
- Verify function signatures match usage

**Testing issues**
- Make sure you're using the correct solution parameters
- Check that the simulator is properly initialized

## Getting Help

- 📚 Read the [CoinScript Reference](./coinscript/reference)
- 💬 Join the [Chia Developer Discord](https://discord.gg/chia)
- 🐛 Report issues on [GitHub](https://github.com/chia-blockchain/chia-puzzle-framework)

Ready to build? Head to the [Quick Start Tutorial](./quick-start)! 