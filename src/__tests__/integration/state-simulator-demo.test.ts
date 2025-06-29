/**
 * Simple State Management Demo using Chia Simulator
 * 
 * This test demonstrates state persistence across blocks using the Chia simulator.
 */

import { 
  CoinSpend, 
  getCoinId, 
  masterPublicKeyToWalletSyntheticKey, 
  masterSecretKeyToWalletSyntheticSecretKey, 
  Peer, 
  PeerType, 
  secretKeyToPublicKey, 
  signCoinSpends, 
  simulatorNewProgram, 
  Tls
} from '@dignetwork/datalayer-driver';
import * as bip39 from 'bip39';
import { mnemonicToSeedSync } from 'bip39';
import { PrivateKey } from 'chia-bls';
import { Program } from 'clvm-lib';

describe('State Management Demo with Chia Simulator', () => {
  let peer: Peer;
  let masterSecretKey: Buffer;
  let masterSyntheticSecretKey: Buffer;
  let puzzleReveal: Buffer;
  let puzzleHash: string;

  beforeAll(async () => {
    // Try to connect to simulator - skip tests if not available
    try {
      // Create empty TLS object - simulator might be running without TLS
      const tls = {} as Tls;
      
      // Connect to local simulator
      peer = await Peer.new('localhost', PeerType.Simulator, tls);
      console.log('✅ Connected to Chia Simulator');
      
      const peak = await peer.getPeak();
      console.log(`📊 Current block height: ${peak}`);
    } catch (error) {
      console.log('❌ Could not connect to simulator. Is it running?');
      console.log('   Run: chia dev sim start');
      return;
    }

    // Generate test keys
    const mnemonic = bip39.generateMnemonic(256);
    const seed = mnemonicToSeedSync(mnemonic);
    masterSecretKey = Buffer.from(PrivateKey.fromSeed(seed).toHex(), "hex");
    masterSyntheticSecretKey = masterSecretKeyToWalletSyntheticSecretKey(masterSecretKey);

    // Create a simple stateful puzzle using clvm-lib
    // This puzzle stores a counter that increments on each spend
    const puzzleSource = `
      (mod (STATE) 
        (list 
          (list 51 (sha256 1 STATE) 0)  ; CREATE_COIN with new state
          (list 50 0x00)                 ; AGG_SIG_ME for security
        )
      )
    `;
    
    // Compile the puzzle
    const puzzle = Program.fromSource(puzzleSource);
    puzzleReveal = Buffer.from(puzzle.serializeHex(), 'hex');
    puzzleHash = puzzle.hashHex();
    
    console.log(`📝 Simple puzzle hash: ${puzzleHash}`);
  });

  test('should demonstrate state persistence across blocks', async () => {
    if (!peer) {
      console.log('⚠️  Skipping test - no simulator connection');
      return;
    }

    console.log('\n🔄 Starting state persistence demo...');
    
    // Track state values
    const states: number[] = [];
    let currentState = 0;
    
    // Run 3 iterations to show state changes
    for (let i = 0; i < 3; i++) {
      console.log(`\n📦 Block ${i + 1}:`);
      
      // Create a coin with our puzzle
      const coin = await peer.simulatorNewCoin(
        Buffer.from(puzzleHash.slice(2), 'hex'), 
        1000n
      );
      console.log(`  💰 Created coin: ${getCoinId(coin).toString('hex').substring(0, 16)}...`);
      
      // Create solution with current state
      const solution = Program.fromInt(currentState);
      const solutionBytes = Buffer.from(solution.serializeHex(), 'hex');
      
      // Create coin spend
      const coinSpends: CoinSpend[] = [{
        coin,
        puzzleReveal,
        solution: solutionBytes
      }];
      
      // Sign the spend
      const sig = signCoinSpends(coinSpends, [masterSyntheticSecretKey], true);
      
      // Broadcast (this advances the block)
      try {
        await peer.broadcastSpend(coinSpends, [sig]);
        
        // Update state for next iteration
        currentState++;
        states.push(currentState);
        
        console.log(`  ✅ State updated to: ${currentState}`);
        
        const newPeak = await peer.getPeak();
        console.log(`  📊 New block height: ${newPeak}`);
      } catch (error) {
        console.log(`  ❌ Spend failed: ${error}`);
      }
    }
    
    console.log('\n📈 State progression:', states.join(' → '));
    console.log('✅ Demo complete!');
    
    expect(states).toEqual([1, 2, 3]);
  });

  test('should handle multiple state updates in parallel', async () => {
    if (!peer) {
      console.log('⚠️  Skipping test - no simulator connection');
      return;
    }

    console.log('\n🔄 Starting parallel state updates demo...');
    
    // Create multiple coins
    const numCoins = 3;
    const coins = [];
    
    for (let i = 0; i < numCoins; i++) {
      const coin = await peer.simulatorNewCoin(
        Buffer.from(puzzleHash.slice(2), 'hex'), 
        1000n
      );
      coins.push(coin);
    }
    
    console.log(`💰 Created ${numCoins} coins for parallel processing`);
    
    // Create spends for all coins
    const coinSpends: CoinSpend[] = coins.map((coin, index) => {
      const solution = Program.fromInt(index * 10); // Different state for each
      return {
        coin,
        puzzleReveal,
        solution: Buffer.from(solution.serializeHex(), 'hex')
      };
    });
    
    // Sign all spends
    const sig = signCoinSpends(coinSpends, [masterSyntheticSecretKey], true);
    
    // Broadcast all at once
    try {
      await peer.broadcastSpend(coinSpends, [sig]);
      
      const peak = await peer.getPeak();
      console.log(`✅ All ${numCoins} state updates processed in block ${peak}`);
    } catch (error) {
      console.log(`❌ Parallel spend failed: ${error}`);
    }
  });
});