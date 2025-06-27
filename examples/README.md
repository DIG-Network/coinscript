# CoinScript Examples

A comprehensive collection of examples demonstrating CoinScript features, progressing from basic to advanced concepts.

## 📚 Learning Path

### 🟢 Basic Examples (00-09)
Start here if you're new to CoinScript or Chia smart coins.

| Example | Topic | Key Concepts |
|---------|-------|--------------|
| [00-hello-world](00-hello-world.coins) | Simplest coin | Basic structure, actions, solutions |
| [01-basic-payment](01-basic-payment.coins) | Default actions | `default` action, simpler solutions |
| [02-require-signature](02-require-signature.coins) | Security basics | `require()`, `msg.sender`, signatures |
| [03-storage-variables](03-storage-variables.coins) | Immutable storage | Storage types, currying, calculations |
| [04-multiple-actions](04-multiple-actions.coins) | Action routing | Multiple actions, events |
| [05-require-statements](05-require-statements.coins) | Validation | Complex conditions, error handling |
| [06-send-coins](06-send-coins.coins) | Creating coins | `send()`, memos, fee handling |
| [07-events](07-events.coins) | Logging | Events, announcements |
| [08-if-statements](08-if-statements.coins) | Control flow | Conditionals, branching |
| [09-arithmetic](09-arithmetic.coins) | Math operations | Calculations, operators |

### 🟡 Intermediate Examples (10-19)
Learn advanced features and patterns.

| Example | Topic | Key Concepts |
|---------|-------|--------------|
| [10-decorators-intro](10-decorators-intro.coins) | Access control | `@onlyAddress` decorator |
| [11-singleton-decorator](11-singleton-decorator.coins) | Singleton coins | `@singleton` decorator |
| [12-state-basics](12-state-basics.coins) | Mutable state | State vs storage |
| [13-state-mappings](13-state-mappings.coins) | Complex state | Mappings, arrays |
| [14-escrow-pattern](14-escrow-pattern.coins) | Multi-party | Escrow, timeouts |
| [15-timelock-patterns](15-timelock-patterns.coins) | Time-based | Block height, timestamps |
| [16-multi-sig](16-multi-sig.coins) | Multiple signatures | M-of-N patterns |
| [17-delegation](17-delegation.coins) | Delegated spending | Proxy patterns |
| [18-cat-token](18-cat-token.coins) | Fungible tokens | CAT standard |
| [19-nft-basics](19-nft-basics.coins) | Non-fungible tokens | NFT patterns |

### 🔴 Advanced Examples (20-29)
Complex patterns and real-world applications.

| Example | Topic | Key Concepts |
|---------|-------|--------------|
| [20-stateful-token](20-stateful-token.coins) | Stateful contracts | `@stateful`, slot-machine |
| [21-state-management](21-state-management.coins) | State updates | Complex state transitions |
| [22-dex-basics](22-dex-basics.coins) | Decentralized exchange | Trading, liquidity |
| [23-auction-pattern](23-auction-pattern.coins) | On-chain auctions | Bidding, time windows |
| [24-oracle-integration](24-oracle-integration.coins) | External data | Oracle patterns |
| [25-layer-composition](25-layer-composition.coins) | Multiple layers | Composability |
| [26-upgradeable-contracts](26-upgradeable-contracts.coins) | Upgrades | Proxy patterns |
| [27-cross-coin-communication](27-cross-coin-communication.coins) | Coin interaction | Announcements, offers |
| [28-optimization-patterns](28-optimization-patterns.coins) | Gas optimization | Efficient code |
| [29-security-patterns](29-security-patterns.coins) | Security | Best practices |

### ⚡ Expert Examples (30-39)
Production-ready patterns and complete applications.

| Example | Topic | Key Concepts |
|---------|-------|--------------|
| [30-full-dapp](30-full-dapp.coins) | Complete DApp | Full application |
| [31-yield-farming](31-yield-farming.coins) | DeFi yields | Staking, rewards |
| [32-governance-token](32-governance-token.coins) | DAO governance | Voting, proposals |
| [33-lottery-system](33-lottery-system.coins) | Decentralized lottery | Randomness, fairness |
| [34-payment-channels](34-payment-channels.coins) | State channels | Off-chain scaling |
| [35-atomic-swaps](35-atomic-swaps.coins) | Cross-chain | Atomic swaps |
| [36-merkle-trees](36-merkle-trees.coins) | Merkle proofs | Efficient verification |
| [37-zero-knowledge](37-zero-knowledge.coins) | Privacy | ZK patterns |
| [38-game-mechanics](38-game-mechanics.coins) | On-chain gaming | Game logic |
| [39-production-ready](39-production-ready.coins) | Best practices | Production tips |

## 🚀 Getting Started

### Prerequisites
- Node.js 14+ installed
- Basic understanding of blockchain concepts
- Familiarity with JavaScript (for running examples)

### Running Examples

Each example consists of:
- `.coins` file - The CoinScript source code
- `.js` file - JavaScript runner that compiles and demonstrates the code

To run an example:
```bash
node 00-hello-world.js
```

### Understanding the Output

Each example will show:
1. **Generated ChiaLisp** - The compiled puzzle
2. **Puzzle Hash** - The unique identifier
3. **Solution Examples** - How to spend the coin
4. **Key Concepts** - What you learned

## 📖 Key Concepts Quick Reference

### Storage vs State
- **Storage**: Immutable, curried into puzzle, affects puzzle hash
- **State**: Mutable, passed in solution/memo, doesn't affect puzzle hash

### Actions
- Every coin needs at least one action
- `default` action doesn't need ACTION parameter
- Named actions require ACTION as first solution parameter

### Decorators
- `@onlyAddress(addr1, addr2)` - Restrict action to specific addresses
- `@singleton` - Make coin a singleton
- `@stateful` - Enable state management for action

### Common Patterns
```coinscript
// Basic coin structure
coin MyCoin {
    storage { /* immutable */ }
    state { /* mutable */ }
    event MyEvent(/* params */);
    
    action myAction(/* params */) {
        require(/* condition */);
        send(/* recipient, amount */);
        emit MyEvent(/* args */);
    }
}
```

## 🧪 Testing Your Knowledge

After each section, try to:
1. Modify the example code
2. Create your own variations
3. Combine concepts from multiple examples
4. Build something practical

## 🤝 Contributing

Found an issue or want to add an example? 
1. Check existing examples don't cover it
2. Follow the naming convention (XX-topic-name)
3. Include both .coins and .js files
4. Add clear comments explaining concepts

## 📚 Additional Resources

- [CoinScript Documentation](../docs/)
- [ChiaLisp Reference](https://chialisp.com)
- [Chia Developer Portal](https://developers.chia.net)

## 🎯 Next Steps

1. Start with examples 00-09 to learn basics
2. Build a simple payment system
3. Add security with signatures
4. Experiment with state management
5. Create your own coin!

Happy learning! 🌱 