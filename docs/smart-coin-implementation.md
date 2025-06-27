Perfect. I’ll create a full-featured TypeScript abstraction for SmartCoins that supports creating and spending them using any puzzle from Layer 1. This will include logic for locking mojos, handling change, and assembling SpendBundles.

I’ll follow up shortly with the complete implementation guide and code.


# SmartCoin Abstraction Implementation

## Interfaces and Types

To integrate with Chia's Layer 1 (on-chain coins and puzzles) and Layer 2 (off-chain drivers like wallets), we first define some fundamental interfaces and types. These mirror Chia's coin and spend bundle structures, ensuring compatibility with RPC and wallet APIs:

```typescript
/** Hex string type for serialized programs, hashes, signatures, etc. */
type HexString = string;

/** Basic coin record interface (Layer 1 UTXO). */
interface Coin {
  /** Parent coin ID (as hex string) of this coin. */
  parentCoinInfo: HexString;
  /** Puzzle hash (32-byte hash hex) of the coin's puzzle. */
  puzzleHash: HexString;
  /** Amount of the coin in mojos (Chia's smallest unit). */
  amount: number | bigint;
}

/** A single coin spend, consisting of the coin and its puzzle reveal + solution. */
interface CoinSpend {
  /** The coin being spent (with parent, puzzle hash, and amount). */
  coin: Coin;
  /** The puzzle reveal (CLVM program in serialized hex form) for this coin. */
  puzzle_reveal: HexString;
  /** The solution (CLVM program in serialized hex form) for the puzzle. */
  solution: HexString;
}

/** A spend bundle, containing one or more coin spends and an aggregated signature. */
interface SpendBundle {
  /** List of coin spends to include in this transaction. */
  coin_spends: CoinSpend[];
  /** BLS aggregated signature for all spends (hex string). */
  aggregated_signature: HexString;
}

/** Type for specifying a puzzle or puzzle hash. 
 *  - If a `Program` is given, it is treated as the puzzle CLVM program.
 *  - If a `string` is given, it is treated as a puzzle hash (hex string). */
type PuzzleInput = Program | HexString;
```

> **Note:** The `Coin`, `CoinSpend`, and `SpendBundle` definitions correspond to the standard Chia transaction format. Each coin spend includes the coin's identifying data and the full puzzle program (puzzle reveal) with a solution. The `SpendBundle` groups these spends with an `aggregated_signature` for validation. The `PuzzleInput` type allows flexibility to pass either a full puzzle (`Program`) or a puzzle hash, as needed.

## SmartCoin Class Implementation

The `SmartCoin` class below provides a high-level abstraction for creating and spending Chia smart coins. It handles puzzle hash computation, change-making, and assembling the spend bundle. The interface is designed to be clean and developer-friendly, with JSDoc comments explaining usage:

```typescript
import { Program } from "clvm-lib";  // Chia Lisp program representation (CLVM)
import { PrivateKey, AugSchemeMPL } from "chia-bls";  // BLS for signing (if needed)

/**
 * SmartCoin abstraction for managing Chia smart coins.
 * 
 * This class supports:
 * - Creating new smart coins (outputs) by specifying a puzzle or puzzle hash and amount.
 * - Spending existing smart coins (given a Coin record and corresponding puzzle/solution).
 * - Automatic puzzle hash calculation for puzzles, and change output logic for unspent value.
 * - Construction of a SpendBundle containing the coin spend(s).
 * 
 * Note: This class does *not* submit transactions to the network or simulate CLVM execution.
 * It focuses on correct SpendBundle construction. The caller should handle signing 
 * (aggregating BLS signatures) and network submission via Chia RPC or wallet APIs.
 */
class SmartCoin {
  /** The coin being spent (if this SmartCoin represents an existing coin). */
  public readonly coin?: Coin;
  /** The full puzzle program for this coin (if known). */
  public readonly puzzle?: Program;
  /** The puzzle hash for this coin's puzzle. */
  public readonly puzzleHash: HexString;
  /** Amount of the coin in mojos. For new coins, this is the specified amount. */
  public readonly amount: bigint;

  /**
   * Private constructor – use static factory methods to instantiate.
   * @param puzzle     The CLVM puzzle Program for this coin (optional).
   * @param coin       The coin record for an existing coin (optional).
   * @param amount     Amount of the coin in mojos.
   * @param puzzleHash Puzzle hash (hex) for the coin's puzzle (optional, if puzzle not given).
   */
  private constructor(puzzle?: Program, coin?: Coin, amount?: bigint, puzzleHash?: HexString) {
    if (puzzle) {
      // If a puzzle Program is provided, compute its hash.
      this.puzzle = puzzle;
      this.puzzleHash = puzzle.hashHex();
    } else if (puzzleHash) {
      // If only a puzzle hash is provided (for new coin output use-case).
      this.puzzleHash = puzzleHash.startsWith("0x") ? puzzleHash.slice(2) : puzzleHash;
    } else if (coin) {
      // If only a coin is provided (should have puzzleHash in it).
      this.puzzleHash = coin.puzzleHash ?? (coin as any).puzzle_hash;  // support either naming
    } else {
      throw new Error("SmartCoin constructor requires a puzzle, a puzzleHash, or a coin.");
    }

    // Determine amount in bigint
    if (coin) {
      // If a coin is provided, use its amount (override amount param if not provided)
      const coinAmount = typeof coin.amount === "bigint" ? coin.amount : BigInt(coin.amount);
      this.amount = amount ?? coinAmount;
      this.coin = coin;
    } else {
      // For new coin (no existing coin), amount must be provided
      if (amount === undefined) {
        throw new Error("Amount is required for a new SmartCoin output.");
      }
      this.amount = amount;
    }

    // If both coin and puzzle are provided, verify they match.
    if (this.coin && this.puzzle) {
      const coinPH = this.coin.puzzleHash ?? (this.coin as any).puzzle_hash;
      const coinPHClean = coinPH.startsWith("0x") ? coinPH.slice(2) : coinPH;
      const puzzlePHClean = this.puzzleHash.startsWith("0x") ? this.puzzleHash.slice(2) : this.puzzleHash;
      if (coinPHClean.toLowerCase() !== puzzlePHClean.toLowerCase()) {
        throw new Error("Puzzle hash mismatch between the coin record and provided puzzle Program.");
      }
    }
  }

  /**
   * Factory to create a SmartCoin for an existing coin record.
   * @param coin   Coin record to spend (must include puzzle hash and amount).
   * @param puzzle Puzzle Program that matches the coin's puzzle hash (curried if needed).
   * @returns SmartCoin instance representing the spendable coin.
   */
  static fromCoin(coin: Coin, puzzle: Program): SmartCoin {
    // Ensure the puzzle corresponds to the coin's puzzle hash:
    const puzzleHashHex = puzzle.hashHex();
    const coinPH = coin.puzzleHash ?? (coin as any).puzzle_hash;
    const coinPHClean = coinPH.startsWith("0x") ? coinPH.slice(2) : coinPH;
    if (coinPHClean.toLowerCase() !== puzzleHashHex.slice(2).toLowerCase() && coinPHClean.toLowerCase() !== puzzleHashHex.toLowerCase()) {
      throw new Error("Provided puzzle program does not match coin's puzzle hash.");
    }
    // Convert amount to bigint for internal use:
    const amountBig = typeof coin.amount === "bigint" ? coin.amount : BigInt(coin.amount);
    return new SmartCoin(puzzle, coin, amountBig);
  }

  /**
   * Factory to define a new smart coin output to be created.
   * @param puzzleOrHash The puzzle Program **or** puzzle hash for the new coin.
   * @param amount       Amount of the new coin in mojos.
   * @returns SmartCoin instance representing a new coin output (to be created in a spend).
   */
  static create(puzzleOrHash: PuzzleInput, amount: number | bigint): SmartCoin {
    const amountBig = typeof amount === "bigint" ? amount : BigInt(amount);
    if (typeof puzzleOrHash === "string") {
      // Provided a puzzle hash directly
      const hashHex = puzzleOrHash;
      return new SmartCoin(undefined, undefined, amountBig, hashHex);
    } else {
      // Provided a full puzzle Program
      const puzzle = puzzleOrHash;
      return new SmartCoin(puzzle, undefined, amountBig);
    }
  }

  /**
   * Spend this smart coin, constructing a SpendBundle.
   * 
   * There are two usage modes:
   * 1. **Specify outputs (and optional fee)**: Provide a list of outputs (puzzle or hash + amount),
   *    and optionally a change puzzle and fee. The method will build the solution internally using
   *    `CREATE_COIN` conditions for each output and change.
   * 2. **Provide a custom solution**: Directly supply a CLVM solution program (as a Program or hex string).
   *    In this case, the outputs/change must be encoded in that solution by the caller, and the method 
   *    will use it as-is.
   * 
   * @param outputs      Array of outputs to create, each with a puzzle (Program or hash) and mojo amount.
   * @param changePuzzle (Optional) Puzzle or puzzle hash for change. If not provided, defaults to re-using 
   *                     this coin's own puzzle for change. Only used if a change coin is needed.
   * @param fee          Amount in mojos to leave as fee for miners. Defaults to 0. 
   *                     Fee is paid by not allocating the full coin value to outputs (leftover value becomes fee).
   * @param solution     (Optional) Explicit solution program to use instead of auto-generating conditions. 
   *                     If provided, the `outputs`, `changePuzzle`, and `fee` parameters are ignored.
   * @returns A `SpendBundle` containing this coin's spend. (If multiple coins need to be spent in one transaction, 
   * you can combine their SpendBundles by merging coin_spends and aggregating signatures.)
   * 
   * @throws Error if attempting to spend without an existing coin record, or if outputs+fee exceed the coin's amount.
   */
  spend(
    outputs: { puzzle: PuzzleInput; amount: number | bigint }[] = [], 
    changePuzzle?: PuzzleInput, 
    fee: number | bigint = 0, 
    solution?: Program | HexString
  ): SpendBundle {
    if (!this.coin) {
      throw new Error("Cannot spend a SmartCoin that doesn't have an existing coin record.");
    }
    if (!this.puzzle) {
      throw new Error("Puzzle program is required to spend this coin (none provided).");
    }

    // Convert fee to bigint and ensure non-negative
    const feeBig = typeof fee === "bigint" ? fee : BigInt(fee);
    if (feeBig < 0) {
      throw new Error("Fee cannot be negative");
    }

    // Prepare puzzle reveal (serialized puzzle program in hex)
    const puzzleRevealHex: HexString = this.puzzle.serializeHex();

    // Determine solution program hex
    let solutionHex: HexString;
    if (solution !== undefined) {
      // Use custom solution directly (caller constructed the solution to satisfy the puzzle)
      solutionHex = typeof solution === "string" ? solution : solution.serializeHex();
    } else {
      // Auto-generate solution from outputs and fee via CREATE_COIN conditions.
      const outputsList = outputs.map(o => ({
        puzzle: o.puzzle, 
        amount: typeof o.amount === "bigint" ? o.amount : BigInt(o.amount)
      }));
      // Sum output amounts
      let totalOutputMojos = 0n;
      for (const o of outputsList) {
        totalOutputMojos += o.amount;
      }
      const coinAmount = typeof this.coin.amount === "bigint" ? this.coin.amount : BigInt(this.coin.amount);
      if (totalOutputMojos + feeBig > coinAmount) {
        throw new Error("Total output amounts plus fee exceed this coin's amount.");
      }
      const changeAmount = coinAmount - totalOutputMojos - feeBig;

      // Build list of condition expressions (CREATE_COIN conditions for each output, and change if needed)
      const conditionLines: string[] = [];
      for (const o of outputsList) {
        // Determine puzzle hash for output (compute if Program provided, or use directly if hash string provided)
        let outPuzzleHashHex: string;
        if (typeof o.puzzle === "string") {
          outPuzzleHashHex = o.puzzle;
        } else {
          outPuzzleHashHex = o.puzzle.hashHex();
        }
        // Ensure 0x prefix for Chialisp literal
        if (!outPuzzleHashHex.startsWith("0x")) {
          outPuzzleHashHex = "0x" + outPuzzleHashHex;
        }
        conditionLines.push(`(51 ${outPuzzleHashHex} ${o.amount})`);
      }
      if (changeAmount > 0n) {
        // If there's leftover change, create a change coin back to either the specified change puzzle or default to this coin's puzzle
        let changePuzzleHash: string;
        if (changePuzzle) {
          if (typeof changePuzzle === "string") {
            changePuzzleHash = changePuzzle;
          } else {
            changePuzzleHash = changePuzzle.hashHex();
          }
        } else {
          changePuzzleHash = this.puzzleHash;
        }
        if (!changePuzzleHash.startsWith("0x")) {
          changePuzzleHash = "0x" + changePuzzleHash;
        }
        conditionLines.push(`(51 ${changePuzzleHash} ${changeAmount})`);
      }

      // Form the full condition list as a CLVM list. We use Program.fromSource to parse the list of conditions.
      const conditionsSource = `(${conditionLines.join(" ")})`;
      const conditionsProgram = Program.fromSource(conditionsSource);
      // Wrap the conditions list in an outer list to form the solution (solution = (conditions))
      solutionHex = Program.fromSource(`(${conditionsProgram})`).serializeHex();
      // ^ The solution is one list whose first element is the condition list:contentReference[oaicite:3]{index=3}.
    }

    // Construct the CoinSpend object
    const coinSpend: CoinSpend = {
      coin: this.coin,
      puzzle_reveal: puzzleRevealHex,
      solution: solutionHex
    };
    return {
      coin_spends: [coinSpend],
      // No signature included here; it must be supplied by signing with the appropriate private key(s)
      aggregated_signature: ""
    };
  }
}
```

**Explanation:** In the `spend` method above, if no explicit solution is provided, the SmartCoin builds a solution containing `CREATE_COIN` conditions (Chialisp opcode `51`) for each desired output and for any change. Each condition is a list of the form `(51 <puzzle_hash> <amount>)`, which instructs the blockchain to create a new coin with that puzzle hash and amount. We use `Program.fromSource` to assemble the conditions list and wrap it as the solution Program. If the sum of output amounts is less than the coin's value, a change output is automatically added (using the original puzzle or a provided change puzzle for the remainder). Any remaining unallocated value after outputs and change is implicitly taken as a transaction fee by the network.

The result of `spend()` is a `SpendBundle` object containing the coin spend. By default, the `aggregated_signature` is left empty (`""`), since signing requires the private key corresponding to the puzzle (for example, a public key curried into the puzzle). If the puzzle includes an `AGG_SIG_ME` condition (as is common for smart coins requiring a signature), the developer should sign the spend. For instance, using Chia's BLS library one would compute the signature on the message (which typically includes the conditions tree hash, coin ID, and genesis challenge) and set the `aggregated_signature` field. After signing, the SpendBundle can be submitted to the network via a full node RPC (e.g. `push_tx`) or a wallet API.

**Usage example:** Suppose we have an existing coin and its puzzle, and we want to spend it to two new coins:

```typescript
// Assume coinRecord.coin is a Coin from RPC, and puzzleProg is the corresponding Program
const smartCoin = SmartCoin.fromCoin(coinRecord.coin, puzzleProg);
// Define two outputs: one to a given puzzle hash, another to a puzzle Program
const outputs = [
  { puzzle: "0x1234abcd...5678", amount: 500n },        // specify by puzzle hash
  { puzzle: somePuzzleProgram, amount: 1000n }          // specify by Program
];
const fee = 50n;  // 50 mojos fee
const spendBundle = smartCoin.spend(outputs, /*changePuzzle=*/undefined, fee);
// ...Now sign the spendBundle with the relevant private key and submit via RPC...
```

This `SmartCoin` abstraction cleanly separates the coin spend construction from the underlying details. It works with any Chia puzzle or curried puzzle (simply provide the corresponding `Program` or puzzle hash), and produces a correctly formatted SpendBundle for use with Chia's wallet or full node. The internal logic automatically computes puzzle hashes and handles change creation, simplifying the developer experience.
