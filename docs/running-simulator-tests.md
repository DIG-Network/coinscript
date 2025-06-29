# Running State Management Tests with Chia Simulator

This guide explains how to run the Chia Puzzle Framework's state management tests with a real Chia blockchain simulator.

## Prerequisites

1. **Install Chia Blockchain**
   ```bash
   # Install Chia blockchain
   git clone https://github.com/Chia-Network/chia-blockchain.git
   cd chia-blockchain
   sh install.sh
   . ./activate
   ```

2. **Start the Simulator**
   ```bash
   # Start the Chia development simulator
   chia dev sim start
   ```

   The simulator will start on `localhost:8555` by default.

## Running the Tests

### 1. Basic Simulator Demo
This test demonstrates basic state persistence:

```bash
npm test -- --testPathPattern="state-simulator-demo" --verbose
```

Expected output:
- ✅ Connected to Chia Simulator
- 📊 Current block height: X
- 🔄 State persistence across blocks
- 📈 State progression: 1 → 2 → 3

### 2. Comprehensive State Management Test
This test shows the full state management system:

```bash
npm test -- --testPathPattern="state-simulator-real" --verbose
```

Features demonstrated:
- State persistence across multiple blocks
- Complex state transitions
- Value transfers with state maintenance  
- Security and access control
- State history tracking
- Performance benchmarks

### 3. State Management Demonstration
This test provides a detailed walkthrough without needing a simulator:

```bash
npm test -- --testPathPattern="state-management-demonstration" --verbose
```

Shows:
- 🎯 State management concepts
- 🔒 Security features
- 🎮 Complex state machines
- 📚 How persistence works
- 🌍 Real-world applications

## Understanding the Output

### State Transitions
Each block shows:
```
📦 Block N - State Description:
  State: { counter: X, lastUpdater: "0x...", ... }
  Action: functionName(params)
  Result: state changes
```

### Security Validation
Shows both successful and failed scenarios:
```
✅ Valid operation - passes all checks
❌ Invalid operation - fails with reason
```

### Performance Metrics
```
⚡ X updates/second
📊 Block height progression
```

## Troubleshooting

### Simulator Not Found
If you see "Could not connect to simulator":
1. Ensure Chia is installed: `chia version`
2. Start the simulator: `chia dev sim start`
3. Check it's running: `chia dev sim status`

### TLS Certificate Issues
The tests use a mock TLS object by default. For production:
1. Generate proper certificates
2. Update the test to use: `new Tls('path/to/ca.crt', 'path/to/ca.key')`

### Performance Issues
If tests are slow:
1. Ensure simulator is running locally
2. Check system resources
3. Reduce iteration count in performance tests

## Integration with Your Project

To use the state management system in your project:

1. **Define your contract**:
   ```typescript
   coin MyStatefulContract {
     state {
       uint256 myValue;
     }
     
     @stateful
     action updateValue(uint256 newValue) {
       state.myValue = newValue;
       recreateSelf();
     }
   }
   ```

2. **Compile and deploy**:
   ```typescript
   const compiled = compileCoinScript(contractSource);
   const puzzleHash = compiled.mainPuzzle.toModHash();
   ```

3. **Create solutions with state**:
   ```typescript
   const solution = createSolution()
     .addAction('updateValue', [42])
     .addState({ myValue: currentValue })
     .build();
   ```

## Next Steps

1. Explore the example contracts in `examples/`
2. Read the state management documentation in `knowledge/context.md`
3. Try modifying the test contracts to match your use case
4. Join the Chia developer community for support

## Resources

- [Chia Developer Portal](https://developers.chia.net/)
- [Chia Simulator Documentation](https://docs.chia.net/guides/simulator-user-guide/)
- [ChiaLisp Reference](https://chialisp.com/)
- [Chia Wallet SDK](https://github.com/xch-dev/chia-wallet-sdk)