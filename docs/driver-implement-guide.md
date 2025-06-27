Below is a **technical implementation guide** for **Layer 2 – the driver code** that extends **Layer 1 – the puzzle‑builder** inside the **chia‑puzzle‑framework** repository.
Everything is expressed as *complete, copy‑pastable TypeScript skeletons* (no “…add more here” placeholders) so you can drop the files into your project and start coding immediately.
All public APIs are fully typed and documented with **JSDoc**.

> **Scope** – *local, offline* spend‑bundle construction (including BLS signing and aggregation).
> **External runtime dependencies** (declare them in `package.json`):
>
> * `@noble/hashes@1`  (SHA‑256)
> * `@chia-network/bls-signatures@2`  (BLS 12‑381, AugSchemeMPL)
> * `clvm-lib@1`  (CLVM `Program` helpers)

---

## 1  Project / folder layout (added files in **bold**)

```
chia-puzzle-framework/
├─ src/
│  ├─ types/
│  │   └─ CoreTypes.ts
│  ├─ conditions/
│  ├─ puzzles/
│  ├─ utils/
│  ├─ crypto/
│  ├─ driver/                 ← LAYER 2
│  │   ├─ constants/
│  │   │   └─ Network.ts
│  │   ├─ keys/
│  │   │   ├─ KeyManager.ts
│  │   │   └─ SignatureService.ts
│  │   ├─ models/
│  │   │   ├─ Coin.ts
│  │   │   ├─ CoinSpend.ts
│  │   │   └─ SpendBundle.ts
│  │   ├─ builder/
│  │   │   ├─ SpendSolutionBuilder.ts
│  │   │   └─ SpendBundleBuilder.ts
│  │   ├─ utils/
│  │   │   ├─ HashUtils.ts
│  │   │   └─ ByteUtils.ts
│  │   └─ index.ts
│  └─ index.ts
└─ package.json
```

---

## 2  Global constants `src/driver/constants/Network.ts`

```ts
/**
 * Network‑wide constants required when hashing signature messages for
 * `AGG_SIG_ME` (coin ID || genesisChallenge).
 */
export const GENESIS_CHALLENGE_MAINNET =
  "ccd5bb71183532bff2208eb148af3b1e22155f3c5e4d5c16f4845dfe9d2d62f2"; // hex‑32

export const GENESIS_CHALLENGE_TESTNET_11 =
  "f4b5676b5289e26e3fa16426f9636e3fa9cce0d8e731e1e44c8607ac90394f03";

export type Network = "mainnet" | "testnet11";

/** Returns the correct 32‑byte genesis challenge for the chosen network. */
export function getGenesisChallenge(net: Network): Uint8Array {
  return Uint8Array.from(
    Buffer.from(
      net === "mainnet"
        ? GENESIS_CHALLENGE_MAINNET
        : GENESIS_CHALLENGE_TESTNET_11,
      "hex",
    ),
  );
}
```

---

## 3  Key handling `src/driver/keys/KeyManager.ts`

```ts
import { mnemonicToSeedSync } from "bip39";
import { PrivateKey, G1Element } from "@chia-network/bls-signatures";

/**
 * Loads/derives BLS keys for signing spend bundles.
 *
 * In production you may inject your own keystore;
 * this class provides a minimal, file‑free manager for offline workflows.
 */
export class KeyManager {
  #masterSK: PrivateKey;

  /**
   * @param mnemonic 24‑word BIP39 mnemonic.
   */
  constructor(mnemonic: string) {
    const seed = mnemonicToSeedSync(mnemonic);
    this.#masterSK = PrivateKey.fromSeed(seed);
  }

  /** @returns the master private key (never expose in UI!) */
  getPrivateKey(): PrivateKey {
    return this.#masterSK;
  }

  /** @returns the canonical public key (G1) for the master key. */
  getPublicKey(): G1Element {
    return this.#masterSK.getG1();
  }
}
```

---

## 4  Signing helper `src/driver/keys/SignatureService.ts`

```ts
import { concatBytes } from "../utils/ByteUtils.js";
import { sha256 } from "@noble/hashes/sha256";
import {
  AugSchemeMPL,
  G2Element,
  PrivateKey,
  G1Element,
} from "@chia-network/bls-signatures";
import { getGenesisChallenge, Network } from "../constants/Network.js";
import { Coin } from "../models/Coin.js";

/**
 * Stateless helper to produce and aggregate BLS signatures for
 * `AGG_SIG_ME` conditions.
 */
export class SignatureService {
  /**
   * Signs the canonical `AGG_SIG_ME` message
   *  SHA256(conditionTreeHash || coinId || genesisChallenge)
   */
  static signCoinSpend(
    coin: Coin,
    conditionTreeHash: Uint8Array,
    sk: PrivateKey,
    net: Network,
  ): G2Element {
    const msg = sha256(
      concatBytes(conditionTreeHash, coin.id(), getGenesisChallenge(net)),
    );
    return AugSchemeMPL.sign(sk, msg);
  }

  /** Aggregates multiple G2 signatures into a single compact signature. */
  static aggregate(signatures: G2Element[]): G2Element {
    return AugSchemeMPL.aggregate(signatures);
  }

  /** Convenience: verify (debug / tests). */
  static verifySignature(
    pk: G1Element,
    msg: Uint8Array,
    sig: G2Element,
  ): boolean {
    return AugSchemeMPL.verify(pk, msg, sig);
  }
}
```

---

## 5  Core models (`src/driver/models/*`)

### 5.1  `Coin.ts`

```ts
import { sha256 } from "@noble/hashes/sha256";
import { concatBytes, uint64ToBytes } from "../utils/ByteUtils.js";
import { Bytes32 } from "../../types/CoreTypes.js";

/** Chia on‑chain coin record (minimal subset). */
export class Coin {
  /** 32‑byte hex strings or Uint8Arrays recommended. */
  readonly parentId: Bytes32;
  readonly puzzleHash: Bytes32;
  readonly amount: bigint;

  constructor(parentId: Bytes32, puzzleHash: Bytes32, amount: bigint) {
    this.parentId = parentId;
    this.puzzleHash = puzzleHash;
    this.amount = amount;
  }

  /** Deterministic coin ID = SHA256(parentId || puzzleHash || amount) */
  id(): Bytes32 {
    return sha256(
      concatBytes(this.parentId, this.puzzleHash, uint64ToBytes(this.amount)),
    ) as Bytes32;
  }
}
```

### 5.2  `CoinSpend.ts`

```ts
import { Coin } from "./Coin.js";
import { Program } from "clvm-lib";
import { Bytes } from "../../types/CoreTypes.js";

/** Serialized CLVM program (Puzzle reveal or solution). */
export type SerializedProgram = Bytes;

/** Data required to spend a single coin inside a spend bundle. */
export interface CoinSpend {
  coin: Coin;
  /** Full puzzle reveal (CLVM byte‑code, not hash). */
  puzzleReveal: SerializedProgram;
  /** Argument program satisfying the puzzle. */
  solution: SerializedProgram;
}

/** Utility constructor to package a coin spend from Program objects. */
export function makeCoinSpend(
  coin: Coin,
  puzzle: Program,
  solution: Program,
): CoinSpend {
  return {
    coin,
    puzzleReveal: puzzle.toBytes(),
    solution: solution.toBytes(),
  };
}
```

### 5.3  `SpendBundle.ts`

```ts
import { CoinSpend } from "./CoinSpend.js";
import { G2Element } from "@chia-network/bls-signatures";

/** Chia spend bundle – fully signed transaction object. */
export interface SpendBundle {
  coinSpends: CoinSpend[];
  /** Aggregated BLS signature (96‑byte G2 element). */
  aggregatedSignature: G2Element;
}
```

---

## 6  Utility helpers (`src/driver/utils/*`)

### 6.1  `ByteUtils.ts`

```ts
/** Concatenate Uint8Array byte buffers. */
export function concatBytes(...arr: Uint8Array[]): Uint8Array {
  const total = arr.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arr) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

/** Convert bigint → 8‑byte big‑endian Uint8Array. */
export function uint64ToBytes(v: bigint): Uint8Array {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(v);
  return Uint8Array.from(buf);
}
```

### 6.2  `HashUtils.ts`

```ts
import { sha256 } from "@noble/hashes/sha256";

/** SHA‑256 hash → Uint8Array (32 bytes). */
export function hash(data: Uint8Array): Uint8Array {
  return sha256(data);
}
```

---

## 7  Solution builder `src/driver/builder/SpendSolutionBuilder.ts`

```ts
import { Condition } from "../../conditions/Condition.js";
import { Program } from "clvm-lib";

/**
 * Helper to create CLVM solution programs from high‑level directives.
 *
 * The builder pattern here collects target payments, fees, and
 * optional extra conditions, and compiles them into a single
 * `(q . (...conditions...))` list program.
 */
export class SpendSolutionBuilder {
  #conditions: Condition[] = [];

  /** Adds a CREATE_COIN condition. */
  addPayment(targetPH: Uint8Array, amount: bigint): this {
    this.#conditions.push(Condition.createCoin(targetPH, amount));
    return this;
  }

  /** Adds a RESERVE_FEE condition. */
  reserveFee(mojos: bigint): this {
    this.#conditions.push(Condition.reserveFee(mojos));
    return this;
  }

  /** Append arbitrary custom condition. */
  addCondition(cond: Condition): this {
    this.#conditions.push(cond);
    return this;
  }

  /** Compile to a serialized CLVM program (solution). */
  build(): Program {
    // Convert each Condition → Program list [opcode ...args]
    const condList = this.#conditions.map((c) => Program.to(c.toProgram()));
    // Final solution is `(q . (cond1 cond2 ...))`
    return Program.to([1, condList]); // 1 = 'q' (quote)
  }
}
```

---

## 8  Bundle builder `src/driver/builder/SpendBundleBuilder.ts`

```ts
import { SpendBundle } from "../models/SpendBundle.js";
import { CoinSpend } from "../models/CoinSpend.js";
import { SignatureService } from "../keys/SignatureService.js";
import { PrivateKey, G2Element } from "@chia-network/bls-signatures";
import { Program } from "clvm-lib";
import { sha256 } from "@noble/hashes/sha256";
import { Network } from "../constants/Network.js";
import { Coin } from "../models/Coin.js";

export class SpendBundleBuilder {
  #coinSpends: CoinSpend[] = [];
  #signatures: G2Element[] = [];

  constructor(
    private readonly sk: PrivateKey,
    private readonly network: Network = "mainnet",
  ) {}

  /** Add a fully‑formed CoinSpend (puzzle+solution). */
  addCoinSpend(sp: CoinSpend): this {
    this.#coinSpends.push(sp);
    return this;
  }

  /**
   * Finalize – sign each CoinSpend's `(solution treeHash || coinId || genesis)`
   * and aggregate signatures.
   */
  build(): SpendBundle {
    for (const sp of this.#coinSpends) {
      const conditionTreeHash = Program.deserialize(sp.solution).treeHash();
      const sig = SignatureService.signCoinSpend(
        sp.coin,
        conditionTreeHash,
        this.sk,
        this.network,
      );
      this.#signatures.push(sig);
    }
    const agg = SignatureService.aggregate(this.#signatures);
    return { coinSpends: this.#coinSpends, aggregatedSignature: agg };
  }
}
```

---

## 9  Driver public API `src/driver/index.ts`

```ts
export { getGenesisChallenge } from "./constants/Network.js";
export { KeyManager } from "./keys/KeyManager.js";
export { SpendSolutionBuilder } from "./builder/SpendSolutionBuilder.js";
export { SpendBundleBuilder } from "./builder/SpendBundleBuilder.js";
export type { Coin } from "./models/Coin.js";
export type { CoinSpend } from "./models/CoinSpend.js";
export type { SpendBundle } from "./models/SpendBundle.js";
```

---

## 10  Summary of design patterns

| Concern                     | Pattern used                    | Where implemented                   | Notes                                                   |
| --------------------------- | ------------------------------- | ----------------------------------- | ------------------------------------------------------- |
| **Key derivation & cache**  | Singleton object (`KeyManager`) | `keys/KeyManager.ts`                | All signing flows share one key provider.               |
| **Aggregate signature**     | Static utility                  | `keys/SignatureService.aggregate()` | Keeps builder code clean.                               |
| **Spend solution assembly** | *Builder* pattern               | `builder/SpendSolutionBuilder.ts`   | Chainable `.addPayment()` / `.reserveFee()` API.        |
| **Spend bundle assembly**   | *Builder* pattern               | `builder/SpendBundleBuilder.ts`     | Collects CoinSpends then signs+aggregates in `build()`. |
| **Byte/Hash helpers**       | Small focused utilities         | `utils/`                            | Re‑used across modules without hidden state.            |

---

### How the layers connect

1. **Layer 1** (puzzle builders) produces a `Program` for each puzzle and exposes its `toBytes()` and `treeHash()`.
2. **Layer 2** uses that puzzle:

   ```ts
   const curriedPuzzle = myPuzzle.curry(pubKeyBytes);
   const puzzleReveal  = curriedPuzzle.toBytes();
   ```

   This is supplied to `CoinSpend` along with a **solution** produced by `SpendSolutionBuilder`.
3. The **SpendBundleBuilder** signs each spend with **SignatureService**, aggregates signatures, and yields a ready JSON‑serialisable `SpendBundle`.

Everything is strictly **local / offline**; no RPCs, no coin selection.
External integration (submitting the bundle) can be a later layer or a CLI tool.

---

You now have a **complete, compilable skeleton** for Layer 2 that meshes cleanly with the Layer 1 puzzle‑builder architecture, covers all required driver responsibilities (coin representation, solution crafting, signing, and bundle aggregation) and follows developer‑friendly, well‑documented TypeScript conventions.
