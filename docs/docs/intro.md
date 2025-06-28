---
sidebar_position: 1
title: Welcome to Chia Puzzle Framework
---

# Welcome to Chia Puzzle Framework Documentation

Welcome to the comprehensive documentation for the Chia Puzzle Framework, including **CoinScript** - a high-level language for Chia smart coin development.

## What You'll Find Here

### 🪙 CoinScript Documentation

CoinScript is a Solidity-like language that compiles to ChiaLisp, making Chia development accessible to developers from other blockchain ecosystems.

**[Get Started with CoinScript →](./coinscript/why-coinscript.md)**

- [Why CoinScript?](./coinscript/why-coinscript.md) - Understand the motivation and benefits
- [Quick Start Guide](./coinscript/quick-start.md) - Create your first smart coin in minutes
- [Examples](./coinscript/examples.md) - Learn through practical examples
- [Language Reference](./coinscript/reference.md) - Complete language documentation

### 🔧 Framework Tools

Learn about the powerful tools that make up the Chia Puzzle Framework:

- [PuzzleBuilder & SolutionBuilder](./coinscript/puzzle-solution-builder.md) - JavaScript APIs for puzzle creation
- [AST Engine](./coinscript/ast-engine.md) - The technology powering the framework
- [Builder Patterns](./coinscript/builder-patterns.md) - Advanced patterns and techniques

## Quick Example

Here's a taste of what you can build with CoinScript:

```coinscript
coin SimplePayment {
  storage address owner = 0x1234...;
  
  action transfer(address recipient, uint256 amount) {
    requireSignature(owner);
    sendCoins(recipient, amount);
  }
}
```

This compiles to optimized ChiaLisp that runs on the Chia blockchain!

## Getting Started

1. **Install the Framework**
   ```bash
   npm install chia-puzzle-framework
   ```

2. **Choose Your Path**
   - **New to Chia?** Start with [Why CoinScript?](./coinscript/why-coinscript.md)
   - **Ready to code?** Jump to the [Quick Start Guide](./coinscript/quick-start.md)
   - **Want to see examples?** Check out [CoinScript Examples](./coinscript/examples.md)

## Why Use This Framework?

- **🚀 Lower Barrier to Entry** - Write smart coins without learning Lisp
- **🛡️ Type Safety** - Catch errors at compile time
- **🔄 Seamless Integration** - Works with existing Chia tools
- **📚 Comprehensive Documentation** - Everything you need in one place
- **🎯 Production Ready** - Used in real Chia applications

## Community & Support

- **GitHub**: [Chia Puzzle Framework](https://github.com/DIG-Network)
- **Discord**: Join the Chia developer community
- **Forum**: Discuss and get help

## Contributing

We welcome contributions! Whether it's improving documentation, adding examples, or enhancing the framework itself.

---

Ready to start building? Head to the [CoinScript documentation](./coinscript/why-coinscript.md) and begin your journey into Chia smart coin development!