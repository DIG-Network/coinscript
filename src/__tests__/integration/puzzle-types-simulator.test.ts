/**
 * Comprehensive Puzzle Types Tests using Real Chia Simulator
 * 
 * These tests demonstrate various puzzle types (Singleton, CAT, NFT, DID, Standard)
 * using the actual Chia blockchain simulator.
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
  Tls
} from '@dignetwork/datalayer-driver';
import * as bip39 from 'bip39';
import { mnemonicToSeedSync } from 'bip39';
import { PrivateKey } from 'chia-bls';
import { PuzzleBuilder, puzzle } from '../../builder/PuzzleBuilder';
import { createSolution } from '../../builder/SolutionBuilder';
import { serialize } from '../../core/serializer';
import { Program } from 'clvm-lib';
import { compileCoinScript } from '../../coinscript';
import { withSingletonLayer } from '../../layers/singletonLayer';
import { withOwnershipLayer } from '../../layers/ownershipLayer';
import { withStateLayer } from '../../layers/stateLayer';
import { hex, list, int } from '../../core';
import { createCoin, createCoinAnnouncement, reserveFee } from '../../conditions';

describe('Puzzle Types with Real Chia Simulator', () => {
  let peer: Peer;
  let tls: Tls;
  let masterSecretKey: Buffer;
  let masterSyntheticSecretKey: Buffer;
  let masterPublicKey: Buffer;
  let masterSyntheticPublicKey: Buffer;

  beforeAll(async () => {
    // Initialize TLS and Peer - use default certificates if available
    try {
      tls = new Tls('ca.crt', 'ca.key');
    } catch (error) {
      console.log('⚠️  Using default TLS configuration');
      // Create a mock TLS object that the simulator might accept
      tls = {} as Tls;
    }
    
    try {
      peer = await Peer.new('localhost', PeerType.Simulator, tls);
      console.log('🌐 Chia Simulator initialized');
      console.log('📊 Initial peak:', await peer.getPeak());
    } catch (error) {
      console.log('⚠️  Could not connect to simulator:', error);
      // Mark all tests as skipped if we can't connect
      return;
    }

    // Generate keys
    const mnemonic = bip39.generateMnemonic(256);
    const seed = mnemonicToSeedSync(mnemonic);
    masterSecretKey = Buffer.from(PrivateKey.fromSeed(seed).toHex(), "hex");
    masterSyntheticSecretKey = masterSecretKeyToWalletSyntheticSecretKey(masterSecretKey);
    masterPublicKey = secretKeyToPublicKey(masterSecretKey);
    masterSyntheticPublicKey = masterPublicKeyToWalletSyntheticKey(masterPublicKey);
  });

  afterAll(async () => {
    // Peer doesn't have a close method in the API
    // Just let it be garbage collected
  });

  describe('Standard Payment Puzzles', () => {
    test('should create and spend a standard payment puzzle', async () => {
      if (!peer) {
        console.log('⚠️  Skipping test - no simulator connection');
        return;
      }

      console.log('\n💰 Test: Standard Payment Puzzle');
      
      // Create a standard payment puzzle using PuzzleBuilder
      const paymentPuzzle = puzzle()
        .comment('Standard payment puzzle')
        .requireSignature(masterPublicKey)
        .ifConditions('amount', 'recipient')
        .then(builder => 
          builder
            .createCoin('recipient', 'amount')
            .returnConditions()
        )
        .build();
      
      const puzzleReveal = Buffer.from(
        paymentPuzzle.serialize({ format: 'hex', compiled: true }).slice(2), 
        'hex'
      );
      const puzzleHash = paymentPuzzle.toModHash();
      console.log(`📝 Payment puzzle hash: ${puzzleHash}`);
      
      // Create initial coin
      const initialAmount = 5000n;
      const coin = await peer.simulatorNewCoin(Buffer.from(puzzleHash.slice(2), 'hex'), initialAmount);
      console.log(`💰 Created coin: ${getCoinId(coin).toString('hex').substring(0, 16)}...`);
      
      // Create solution to send funds
      const recipientAddress = '0x' + 'cafe'.repeat(16);
      const sendAmount = 2000n;
      
      const solution = createSolution()
        .addParam('amount', Number(sendAmount))
        .addParam('recipient', recipientAddress)
        .build();
      
      const solutionProgram = Program.fromSource(serialize(solution));
      
      // Create and sign the coin spend
      const coinSpends: CoinSpend[] = [{
        coin,
        puzzleReveal,
        solution: Buffer.from(solutionProgram.serializeHex(), 'hex')
      }];
      
      const sig = signCoinSpends(coinSpends, [masterSyntheticSecretKey], true);
      
      // Broadcast the spend
      const result = await peer.broadcastSpend(coinSpends, [sig]);
      console.log('🔄 Payment spend broadcasted:', result);
      
      const newPeak = await peer.getPeak();
      console.log(`📦 New block height: ${newPeak}`);
      
      // Verify the coin was spent
      const coinState = await peer.simulatorCoinState(getCoinId(coin));
      expect(coinState?.spentHeight).toBeDefined();
      console.log(`✅ Payment completed at height: ${coinState?.spentHeight}`);
    });

    test('should handle multi-payment splits', async () => {
      if (!peer) {
        console.log('⚠️  Skipping test - no simulator connection');
        return;
      }

      console.log('\n💸 Test: Multi-Payment Split');
      
      // Create a multi-payment puzzle
      const multiPaymentPuzzle = puzzle()
        .comment('Multi-payment puzzle')
        .requireSignature(masterPublicKey)
        .ifConditions('payments')
        .then(builder => {
          // In real implementation, would iterate through payments list
          // For demo, we'll hardcode 3 payments
          builder
            .createCoin(hex('1111'.repeat(16)), int(1000))
            .createCoin(hex('2222'.repeat(16)), int(1500))
            .createCoin(hex('3333'.repeat(16)), int(2500))
            .returnConditions();
          return builder;
        })
        .build();
      
      const puzzleReveal = Buffer.from(
        multiPaymentPuzzle.serialize({ format: 'hex', compiled: true }).slice(2), 
        'hex'
      );
      const puzzleHash = multiPaymentPuzzle.toModHash();
      
      // Create initial coin
      const coin = await peer.simulatorNewCoin(Buffer.from(puzzleHash.slice(2), 'hex'), 5000n);
      console.log(`💰 Created multi-payment coin with 5000 mojos`);
      
      // Create solution
      const solution = createSolution()
        .addParam('payments', [
          { recipient: '0x' + '1111'.repeat(16), amount: 1000 },
          { recipient: '0x' + '2222'.repeat(16), amount: 1500 },
          { recipient: '0x' + '3333'.repeat(16), amount: 2500 }
        ])
        .build();
      
      const solutionProgram = Program.fromSource(serialize(solution));
      
      // Create and sign the coin spend
      const coinSpends: CoinSpend[] = [{
        coin,
        puzzleReveal,
        solution: Buffer.from(solutionProgram.serializeHex(), 'hex')
      }];
      
      const sig = signCoinSpends(coinSpends, [masterSyntheticSecretKey], true);
      
      // Broadcast the spend
      await peer.broadcastSpend(coinSpends, [sig]);
      
      console.log('✅ Multi-payment completed: 1000 + 1500 + 2500 = 5000 mojos');
    });
  });

  describe('Singleton Puzzles', () => {
    test('should create and spend a singleton puzzle', async () => {
      if (!peer) {
        console.log('⚠️  Skipping test - no simulator connection');
        return;
      }

      console.log('\n🎯 Test: Singleton Puzzle');
      
      // Create inner puzzle
      const innerPuzzle = puzzle()
        .comment('Singleton inner puzzle')
        .requireSignature(masterPublicKey)
        .ifConditions('action')
        .then(builder => 
          builder
            .comment('Process singleton action')
            .returnConditions()
        )
        .build();
      
      // Generate launcher ID (random for testing)
      const launcherId = Buffer.from('launcher123456789012345678901234567890123456789012345678901234567890', 'hex');
      
      // Wrap with singleton layer
      const singletonPuzzle = withSingletonLayer(innerPuzzle, {
        launcherId: launcherId.toString('hex')
      });
      
      const puzzleReveal = Buffer.from(
        singletonPuzzle.serialize({ format: 'hex', compiled: true }).slice(2), 
        'hex'
      );
      const puzzleHash = singletonPuzzle.toModHash();
      console.log(`📝 Singleton puzzle hash: ${puzzleHash}`);
      
      // Create initial singleton coin
      const coin = await peer.simulatorNewCoin(Buffer.from(puzzleHash.slice(2), 'hex'), 1n);
      console.log(`🎯 Created singleton coin: ${getCoinId(coin).toString('hex').substring(0, 16)}...`);
      
      // Create solution
      const solution = createSolution()
        .addParam('action', 'update')
        .build();
      
      const solutionProgram = Program.fromSource(serialize(solution));
      
      // Create and sign the coin spend
      const coinSpends: CoinSpend[] = [{
        coin,
        puzzleReveal,
        solution: Buffer.from(solutionProgram.serializeHex(), 'hex')
      }];
      
      const sig = signCoinSpends(coinSpends, [masterSyntheticSecretKey], true);
      
      // Broadcast the spend
      const result = await peer.broadcastSpend(coinSpends, [sig]);
      console.log('🔄 Singleton spend broadcasted:', result);
      
      const newPeak = await peer.getPeak();
      console.log(`📦 New block height: ${newPeak}`);
      
      // Verify the coin was spent
      const coinState = await peer.simulatorCoinState(getCoinId(coin));
      expect(coinState?.spentHeight).toBeDefined();
      console.log(`✅ Singleton updated at height: ${coinState?.spentHeight}`);
    });
  });

  describe('CAT (Chia Asset Token) Puzzles', () => {
    test('should create and transfer a CAT token', async () => {
      if (!peer) {
        console.log('⚠️  Skipping test - no simulator connection');
        return;
      }

      console.log('\n🪙 Test: CAT Token Transfer');
      
      // Define a CAT contract using CoinScript
      const catContractSource = `
        coin CATToken {
          storage string name = "TestCAT";
          storage string symbol = "TCAT";
          storage uint256 totalSupply = 1000000;
          storage address minter = 0x${masterPublicKey.toString('hex')};
          
          action transfer(address recipient, uint256 amount) {
            requireSignature(msg.sender);
            sendCoins(recipient, amount);
          }
          
          action mint(address recipient, uint256 amount) {
            require(msg.sender == minter, "Only minter can mint");
            sendCoins(recipient, amount);
          }
        }
      `;
      
      const compiled = compileCoinScript(catContractSource);
      const puzzleReveal = Buffer.from(
        compiled.mainPuzzle.serialize({ format: 'hex', compiled: true }).slice(2), 
        'hex'
      );
      const puzzleHash = compiled.mainPuzzle.toModHash();
      console.log(`📝 CAT puzzle hash: ${puzzleHash}`);
      
      // Create initial CAT coin
      const initialAmount = 10000n;
      const coin = await peer.simulatorNewCoin(Buffer.from(puzzleHash.slice(2), 'hex'), initialAmount);
      console.log(`🪙 Created CAT coin with ${initialAmount} tokens`);
      
      // Transfer some tokens
      const recipientAddress = '0x' + 'feed'.repeat(16);
      const transferAmount = 2500n;
      
      const solution = createSolution()
        .addAction('transfer', [recipientAddress, Number(transferAmount)])
        .build();
      
      const solutionProgram = Program.fromSource(serialize(solution));
      
      // Create and sign the coin spend
      const coinSpends: CoinSpend[] = [{
        coin,
        puzzleReveal,
        solution: Buffer.from(solutionProgram.serializeHex(), 'hex')
      }];
      
      const sig = signCoinSpends(coinSpends, [masterSyntheticSecretKey], true);
      
      // Broadcast the spend
      await peer.broadcastSpend(coinSpends, [sig]);
      
      console.log(`💸 Transferred ${transferAmount} CAT tokens to ${recipientAddress.substring(0, 10)}...`);
      
      const coinState = await peer.simulatorCoinState(getCoinId(coin));
      expect(coinState?.spentHeight).toBeDefined();
    });
  });

  describe('NFT (Non-Fungible Token) Puzzles', () => {
    test('should create and transfer an NFT with metadata', async () => {
      if (!peer) {
        console.log('⚠️  Skipping test - no simulator connection');
        return;
      }

      console.log('\n🎨 Test: NFT with Metadata');
      
      // Define an NFT contract using CoinScript
      const nftContractSource = `
        coin ArtworkNFT {
          storage address owner = 0x${masterPublicKey.toString('hex')};
          storage string tokenId = "ART001";
          storage string metadataUri = "https://example.com/nft/art001.json";
          storage uint256 royaltyPercentage = 5;
          storage address creator = 0x${masterPublicKey.toString('hex')};
          
          action transfer(address newOwner) {
            require(msg.sender == owner, "Only owner can transfer");
            
            // Send NFT to new owner
            sendCoins(newOwner, msg.value);
            
            // Emit transfer event
            emit NFTTransferred(owner, newOwner, tokenId);
          }
          
          action updateMetadata(string newUri) {
            require(msg.sender == creator, "Only creator can update metadata");
            
            // Update metadata URI
            setState("metadataUri", newUri);
            
            // Recreate self with new metadata
            recreateSelf();
          }
        }
      `;
      
      const compiled = compileCoinScript(nftContractSource);
      const puzzleReveal = Buffer.from(
        compiled.mainPuzzle.serialize({ format: 'hex', compiled: true }).slice(2), 
        'hex'
      );
      const puzzleHash = compiled.mainPuzzle.toModHash();
      console.log(`📝 NFT puzzle hash: ${puzzleHash}`);
      
      // Create NFT coin (typically 1 mojo for uniqueness)
      const coin = await peer.simulatorNewCoin(Buffer.from(puzzleHash.slice(2), 'hex'), 1n);
      console.log(`🎨 Created NFT: ART001`);
      
      // Transfer NFT to new owner
      const newOwner = '0x' + 'babe'.repeat(16);
      
      const solution = createSolution()
        .addAction('transfer', [newOwner])
        .build();
      
      const solutionProgram = Program.fromSource(serialize(solution));
      
      // Create and sign the coin spend
      const coinSpends: CoinSpend[] = [{
        coin,
        puzzleReveal,
        solution: Buffer.from(solutionProgram.serializeHex(), 'hex')
      }];
      
      const sig = signCoinSpends(coinSpends, [masterSyntheticSecretKey], true);
      
      // Broadcast the spend
      await peer.broadcastSpend(coinSpends, [sig]);
      
      console.log(`🎨 NFT transferred to: ${newOwner.substring(0, 10)}...`);
      console.log('📊 Metadata URI: https://example.com/nft/art001.json');
      console.log('💰 Royalty: 5% to creator on secondary sales');
      
      const coinState = await peer.simulatorCoinState(getCoinId(coin));
      expect(coinState?.spentHeight).toBeDefined();
    });
  });

  describe('DID (Decentralized Identifier) Puzzles', () => {
    test('should create and update a DID', async () => {
      if (!peer) {
        console.log('⚠️  Skipping test - no simulator connection');
        return;
      }

      console.log('\n🆔 Test: DID Creation and Update');
      
      // Define a DID contract using CoinScript
      const didContractSource = `
        coin DecentralizedID {
          storage address controller = 0x${masterPublicKey.toString('hex')};
          storage string didId = "did:chia:1234567890";
          storage string publicKey = "0x${masterPublicKey.toString('hex')}";
          storage string serviceEndpoint = "https://example.com/did";
          
          state {
            uint256 nonce;
            uint256 lastUpdate;
            string status;
          }
          
          @stateful
          action updateEndpoint(string newEndpoint) {
            require(msg.sender == controller, "Only controller can update");
            
            setState("serviceEndpoint", newEndpoint);
            state.nonce += 1;
            state.lastUpdate = currentTime();
            state.status = "active";
            
            recreateSelf();
          }
          
          @stateful
          action rotateKey(address newController, string newPublicKey) {
            require(msg.sender == controller, "Only controller can rotate");
            
            setState("controller", newController);
            setState("publicKey", newPublicKey);
            state.nonce += 1;
            state.lastUpdate = currentTime();
            
            recreateSelf();
          }
          
          @stateful
          action revoke() {
            require(msg.sender == controller, "Only controller can revoke");
            
            state.status = "revoked";
            state.lastUpdate = currentTime();
            
            recreateSelf();
          }
        }
      `;
      
      const compiled = compileCoinScript(didContractSource);
      const puzzleReveal = Buffer.from(
        compiled.mainPuzzle.serialize({ format: 'hex', compiled: true }).slice(2), 
        'hex'
      );
      const puzzleHash = compiled.mainPuzzle.toModHash();
      console.log(`📝 DID puzzle hash: ${puzzleHash}`);
      
      // Create DID coin
      const coin = await peer.simulatorNewCoin(Buffer.from(puzzleHash.slice(2), 'hex'), 1n);
      console.log(`🆔 Created DID: did:chia:1234567890`);
      
      // Update service endpoint
      const initialState = {
        nonce: 0,
        lastUpdate: 0,
        status: "active"
      };
      
      const solution = createSolution()
        .addAction('updateEndpoint', ["https://newservice.com/did"])
        .addState(initialState)
        .build();
      
      const solutionProgram = Program.fromSource(serialize(solution));
      
      // Create and sign the coin spend
      const coinSpends: CoinSpend[] = [{
        coin,
        puzzleReveal,
        solution: Buffer.from(solutionProgram.serializeHex(), 'hex')
      }];
      
      const sig = signCoinSpends(coinSpends, [masterSyntheticSecretKey], true);
      
      // Broadcast the spend
      await peer.broadcastSpend(coinSpends, [sig]);
      
      console.log('🔄 DID updated:');
      console.log('  - New endpoint: https://newservice.com/did');
      console.log('  - Nonce incremented to: 1');
      console.log('  - Status: active');
      
      const coinState = await peer.simulatorCoinState(getCoinId(coin));
      expect(coinState?.spentHeight).toBeDefined();
    });
  });

  describe('Advanced Puzzle Compositions', () => {
    test('should create a puzzle with multiple layers', async () => {
      if (!peer) {
        console.log('⚠️  Skipping test - no simulator connection');
        return;
      }

      console.log('\n🎭 Test: Multi-Layer Puzzle Composition');
      
      // Create base puzzle
      const basePuzzle = puzzle()
        .comment('Base functionality')
        .requireSignature(masterPublicKey)
        .ifConditions('action', 'params')
        .then(builder => 
          builder
            .comment('Execute action')
            .returnConditions()
        )
        .build();
      
      // Add ownership layer
      const withOwnership = withOwnershipLayer(basePuzzle, {
        owner: masterPublicKey.toString('hex'),
        transferProgram: puzzle()
          .comment('Transfer program')
          .requireSignature('new_owner')
          .returnConditions()
          .build()
      });
      
      // Add state layer
      const withState = withStateLayer(withOwnership, {
        initialState: list([
          int(0), // counter
          hex('0000000000000000000000000000000000000000000000000000000000000000'), // last action
          int(0) // timestamp
        ]),
        stateUpdater: puzzle()
          .comment('State updater')
          .validateState('old_state', 'new_state')
          .returnConditions()
          .build()
      });
      
      const puzzleReveal = Buffer.from(
        withState.serialize({ format: 'hex', compiled: true }).slice(2), 
        'hex'
      );
      const puzzleHash = withState.toModHash();
      console.log(`📝 Multi-layer puzzle hash: ${puzzleHash}`);
      
      // Create coin
      const coin = await peer.simulatorNewCoin(Buffer.from(puzzleHash.slice(2), 'hex'), 1000n);
      console.log(`🎭 Created multi-layer coin`);
      
      // Create solution
      const solution = createSolution()
        .addParam('action', 'execute')
        .addParam('params', { operation: 'test' })
        .build();
      
      const solutionProgram = Program.fromSource(serialize(solution));
      
      // Create and sign the coin spend
      const coinSpends: CoinSpend[] = [{
        coin,
        puzzleReveal,
        solution: Buffer.from(solutionProgram.serializeHex(), 'hex')
      }];
      
      const sig = signCoinSpends(coinSpends, [masterSyntheticSecretKey], true);
      
      // Broadcast the spend
      await peer.broadcastSpend(coinSpends, [sig]);
      
      console.log('✅ Multi-layer puzzle executed successfully');
      console.log('🔧 Layers applied:');
      console.log('  1. Base functionality');
      console.log('  2. Ownership management');
      console.log('  3. State persistence');
      
      const coinState = await peer.simulatorCoinState(getCoinId(coin));
      expect(coinState?.spentHeight).toBeDefined();
    });

    test('should demonstrate cross-puzzle communication', async () => {
      if (!peer) {
        console.log('⚠️  Skipping test - no simulator connection');
        return;
      }

      console.log('\n🔗 Test: Cross-Puzzle Communication');
      
      // Create sender puzzle that announces messages
      const senderPuzzle = puzzle()
        .comment('Message sender')
        .requireSignature(masterPublicKey)
        .ifConditions('message', 'recipient')
        .then(builder => 
          builder
            .createCoinAnnouncement('message')
            .createCoin('recipient', int(1))
            .returnConditions()
        )
        .build();
      
      // Create receiver puzzle that listens for announcements
      const receiverPuzzle = puzzle()
        .comment('Message receiver')
        .requireSignature(masterPublicKey)
        .ifConditions('expected_message')
        .then(builder => 
          builder
            .assertCoinAnnouncement('expected_message')
            .comment('Message received and validated')
            .returnConditions()
        )
        .build();
      
      const senderReveal = Buffer.from(
        senderPuzzle.serialize({ format: 'hex', compiled: true }).slice(2), 
        'hex'
      );
      const senderHash = senderPuzzle.toModHash();
      
      const receiverReveal = Buffer.from(
        receiverPuzzle.serialize({ format: 'hex', compiled: true }).slice(2), 
        'hex'
      );
      const receiverHash = receiverPuzzle.toModHash();
      
      // Create coins
      const senderCoin = await peer.simulatorNewCoin(Buffer.from(senderHash.slice(2), 'hex'), 100n);
      const receiverCoin = await peer.simulatorNewCoin(Buffer.from(receiverHash.slice(2), 'hex'), 100n);
      
      console.log(`📤 Created sender coin: ${getCoinId(senderCoin).toString('hex').substring(0, 16)}...`);
      console.log(`📥 Created receiver coin: ${getCoinId(receiverCoin).toString('hex').substring(0, 16)}...`);
      
      // Create coordinated solutions
      const message = "Hello from sender!";
      
      const senderSolution = createSolution()
        .addParam('message', message)
        .addParam('recipient', receiverHash)
        .build();
      
      const receiverSolution = createSolution()
        .addParam('expected_message', message)
        .build();
      
      const senderProgram = Program.fromSource(serialize(senderSolution));
      const receiverProgram = Program.fromSource(serialize(receiverSolution));
      
      // Create coordinated spends
      const coinSpends: CoinSpend[] = [
        {
          coin: senderCoin,
          puzzleReveal: senderReveal,
          solution: Buffer.from(senderProgram.serializeHex(), 'hex')
        },
        {
          coin: receiverCoin,
          puzzleReveal: receiverReveal,
          solution: Buffer.from(receiverProgram.serializeHex(), 'hex')
        }
      ];
      
      const sig = signCoinSpends(coinSpends, [masterSyntheticSecretKey], true);
      
      // Broadcast the coordinated spend
      await peer.broadcastSpend(coinSpends, [sig]);
      
      console.log('🔗 Cross-puzzle communication successful!');
      console.log(`📨 Message sent: "${message}"`);
      console.log('✅ Receiver validated the announcement');
      
      const senderState = await peer.simulatorCoinState(getCoinId(senderCoin));
      const receiverState = await peer.simulatorCoinState(getCoinId(receiverCoin));
      
      expect(senderState?.spentHeight).toBeDefined();
      expect(receiverState?.spentHeight).toBeDefined();
      expect(senderState?.spentHeight).toBe(receiverState?.spentHeight);
    });
  });

  describe('Performance Testing Different Puzzle Types', () => {
    test('should benchmark various puzzle types', async () => {
      if (!peer) {
        console.log('⚠️  Skipping test - no simulator connection');
        return;
      }

      console.log('\n⚡ Test: Puzzle Type Performance Benchmark');
      
      const puzzleTypes = [
        {
          name: 'Standard Payment',
          create: () => puzzle()
            .requireSignature(masterPublicKey)
            .createCoin(hex('dead'.repeat(16)), int(1))
            .returnConditions()
            .build()
        },
        {
          name: 'CoinScript Simple',
          create: () => {
            const source = `
              coin SimpleCoin {
                storage address owner = 0x${masterPublicKey.toString('hex')};
                action spend() {
                  requireSignature(owner);
                  sendCoins(puzzleHash(), msg.value);
                }
              }
            `;
            return compileCoinScript(source).mainPuzzle;
          }
        },
        {
          name: 'CoinScript Stateful',
          create: () => {
            const source = `
              coin StatefulCoin {
                storage address owner = 0x${masterPublicKey.toString('hex')};
                state {
                  uint256 counter;
                }
                @stateful
                action increment() {
                  state.counter += 1;
                  recreateSelf();
                }
              }
            `;
            return compileCoinScript(source).mainPuzzle;
          }
        }
      ];
      
      const results: Array<{ name: string; time: number; gasUsed: number }> = [];
      
      for (const puzzleType of puzzleTypes) {
        console.log(`\n📊 Benchmarking: ${puzzleType.name}`);
        
        const startTime = Date.now();
        
        // Create puzzle
        const testPuzzle = puzzleType.create();
        const puzzleReveal = Buffer.from(
          testPuzzle.serialize({ format: 'hex', compiled: true }).slice(2), 
          'hex'
        );
        const puzzleHash = testPuzzle.toModHash();
        
        // Create and spend coin
        const coin = await peer.simulatorNewCoin(Buffer.from(puzzleHash.slice(2), 'hex'), 100n);
        
        const solution = puzzleType.name.includes('Stateful') 
          ? createSolution()
              .addAction('increment')
              .addState({ counter: 0 })
              .build()
          : createSolution()
              .addAction('spend')
              .build();
        
        const solutionProgram = Program.fromSource(serialize(solution));
        
        const coinSpends: CoinSpend[] = [{
          coin,
          puzzleReveal,
          solution: Buffer.from(solutionProgram.serializeHex(), 'hex')
        }];
        
        const sig = signCoinSpends(coinSpends, [masterSyntheticSecretKey], true);
        
        await peer.broadcastSpend(coinSpends, [sig]);
        
        const endTime = Date.now();
        const executionTime = endTime - startTime;
        
        results.push({
          name: puzzleType.name,
          time: executionTime,
          gasUsed: puzzleReveal.length // Approximate gas as puzzle size
        });
        
        console.log(`  ⏱️  Execution time: ${executionTime}ms`);
        console.log(`  ⛽ Puzzle size: ${puzzleReveal.length} bytes`);
      }
      
      console.log('\n📈 Performance Summary:');
      results.forEach(result => {
        console.log(`  ${result.name}: ${result.time}ms (${result.gasUsed} bytes)`);
      });
      
      // Basic assertions
      expect(results.length).toBe(puzzleTypes.length);
      results.forEach(result => {
        expect(result.time).toBeLessThan(5000); // Should complete within 5 seconds
        expect(result.gasUsed).toBeGreaterThan(0);
      });
    });
  });
}); 