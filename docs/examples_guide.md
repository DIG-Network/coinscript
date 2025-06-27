Perfect. I'll create a comprehensive example guide featuring individual, focused examples for signature-locked, time-locked, multi-sig, CAT/NFT wrapper, and singleton puzzles. Each example will focus on how to use the TypeScript DSL to construct these puzzles clearly and effectively.

I'll follow up shortly with the complete guide.


# Building Chia Puzzles with the TypeScript DSL (chia-puzzle-framework)

This guide provides **comprehensive examples** of using the `chia-puzzle-framework` TypeScript DSL to construct common Chia smart coin puzzles. Instead of writing raw Chialisp, we leverage high-level abstractions to create puzzles for various use cases. Each example is presented as an individual script using the DSL fluently, focusing on clarity for developers. We cover the following puzzle types:

* **Signature-Locked Puzzle:** A coin spendable only with a valid signature from a specific key.
* **Time-Locked Puzzle:** A coin locked until a certain time or block height.
* **Multi-Signature Puzzle:** A coin that requires multiple signatures (e.g. M-of-N) to spend.
* **CAT Wrapper Puzzle:** An outer puzzle that **wraps** an inner puzzle with a Chia Asset Token (CAT) layer, enforcing token rules.
* **Singleton Puzzle:** An outer puzzle that ensures a coin is unique (singleton), wrapping an inner puzzle (used for NFTs, DIDs, etc.).

Each section explains the puzzle's purpose and shows how to assemble it using the TypeScript DSL, **without** delving into raw Chialisp (except where absolutely required). This will help you understand how to express common Chia puzzle patterns using the framework's abstraction alone.

## 1. Signature-Locked Puzzle

A **signature-locked puzzle** restricts coin spending to those who can produce a valid BLS signature with a designated public key. In practice, this means only the holder of the corresponding private key can authorize the spend. The puzzle inherently generates an `AGG_SIG_ME` condition (Chia's signature verification condition) tied to the given public key, so any spend must include a matching signature.

Key points of a signature-locked puzzle:

* It is parameterized by a **public key**. Only a spend bundle with a valid signature from this key (on the specified message) will satisfy the puzzle conditions.
* The developer does **not** need to write low-level Chialisp for signature verification; the DSL provides a straightforward way to require a signature.
* Typically, the message for the signature is derived from the spend (e.g. the puzzle or conditions tree hash, coin ID, etc.), and the condition is automatically added to the puzzle.

Using the `chia-puzzle-framework`, we can create a signature-locked puzzle by providing the public key. For example, the code below builds a puzzle locked by a given public key:

```typescript
import { Puzzle } from "chia-puzzle-framework";

// Public key that must sign to unlock the coin (hex string or ByteBuffer form).
const authorizedPubKey = "b839...ff02";  // Example public key in hex

// Create a signature-locked puzzle that requires a signature from authorizedPubKey.
const sigLockedPuzzle = Puzzle.signatureLock(authorizedPubKey);

// You can retrieve the puzzle hash to use it for address or coin creation.
const puzzleHash = sigLockedPuzzle.hash();
console.log("Signature-locked puzzle hash:", puzzleHash);

// (Optional) For demonstration, output the puzzle reveal (CLVM program) in human-readable form.
console.log("Puzzle program:", sigLockedPuzzle.toSource());
```

**Explanation:** In this script, `Puzzle.signatureLock(pubKey)` returns a puzzle object that is **curried** with the specified public key. Internally, this puzzle will always produce an `AGG_SIG_ME` condition requiring a signature with `authorizedPubKey` on the appropriate message. The developer simply uses the DSL method without writing any Chialisp. The resulting `puzzleHash` can be used as the address where coins should be sent to enforce this lock. When attempting to spend the coin, the spending wallet must provide a valid signature from the corresponding private key, otherwise the spend will be invalid.

## 2. Time-Locked Puzzle

A **time-locked puzzle** prevents a coin from being spent until a certain time or block height has been reached. Chia offers conditions like `ASSERT_HEIGHT_ABSOLUTE` and `ASSERT_SECONDS_ABSOLUTE` to enforce time locks. Using the DSL, we can create a puzzle that automatically includes one of these conditions. The coin will essentially be unspendable until the blockchain's height or timestamp meets the specified threshold.

Key points for a time-locked puzzle:

* It can lock by **block height** or **timestamp**. For example, `ASSERT_HEIGHT_ABSOLUTE` requires the current blockchain height to be at least a certain value before the spend is valid.
* The puzzle itself doesn't need a signature or password; its only condition is the time lock. Once the time condition is satisfied, the coin can be spent (often by anyone, unless combined with other conditions).
* This is useful for implementing coins that release funds after a timelock (akin to an on-chain vault or a delayed payment).

Using the framework's abstraction, creating a time lock is straightforward. Below is an example script that locks a coin until a given block height:

```typescript
import { Puzzle } from "chia-puzzle-framework";

// Define the lock height (absolute block height after which the coin can be spent).
const unlockHeight = 1_000_000;  // Example block height

// Create a puzzle that locks the coin until the specified height.
const timeLockedPuzzle = Puzzle.heightLock(unlockHeight);

// Alternatively, for a time-based lock (timestamp in seconds since epoch):
// const unlockTime = Date.now() / 1000 + 3600;  // now + 1 hour (in seconds)
// const timeLockedPuzzle = Puzzle.timestampLock(Math.floor(unlockTime));

// Get the puzzle hash for use in receiving funds.
console.log("Time-locked puzzle hash:", timeLockedPuzzle.hash());

// (Optional) Display the puzzle reveal for verification.
console.log("Puzzle program:", timeLockedPuzzle.toSource());
```

**Explanation:** Here we use `Puzzle.heightLock(height)` to generate a puzzle that includes an `ASSERT_HEIGHT_ABSOLUTE` condition set to `unlockHeight`. This condition ensures the coin cannot be spent until the blockchain height is at least 1,000,000. If you wanted to lock by wall-clock time instead, you could use a similar method (e.g., `Puzzle.timestampLock(timestamp)`) which would use `ASSERT_SECONDS_ABSOLUTE` internally. In either case, the DSL abstracts the underlying condition code. The resulting `timeLockedPuzzle` will have a hash that can serve as an address. Any attempt to spend the coin earlier than the set time/height will fail due to the automatically generated time-lock condition.

## 3. Multi-Signature Puzzle

A **multi-signature puzzle** requires multiple distinct signatures to spend a coin. This is often used for shared wallets or higher-security vaults. For example, you might have 3 managers and require any 2 of them to co-sign a transaction – a **2-of-3 multisig**. In Chia, multi-sig can be achieved by combining multiple signature conditions (multiple `AGG_SIG` requirements) or by more complex logic to enforce a threshold. The `chia-puzzle-framework` DSL can simplify constructing such puzzles by handling the combinations or threshold logic for you.

Key points for multi-signature puzzles:

* **Threshold M-of-N:** You can specify N public keys and require at least M signatures out of those. For example, with three keys, any two of them could be required to sign.
* The puzzle will typically include conditions that ensure the required number of signatures are present. If not enough valid signatures are provided in the spend, the puzzle fails and the coin remains locked.
* This puzzle type increases security by decentralizing authority (no single key can unilaterally spend) or enables shared control of funds.

Using the DSL, you can create a multi-sig puzzle by providing the list of public keys and the threshold number needed. Here's an example for a 2-of-3 multisig:

```typescript
import { Puzzle } from "chia-puzzle-framework";

// Three participant public keys (hex strings for example).
const alicePubKey = "a1b2...c3d4";
const bobPubKey   = "dead...beef";
const carolPubKey = "f00d...1234";
const pubKeys = [alicePubKey, bobPubKey, carolPubKey];

// Require at least 2 out of the 3 keys to sign to spend the coin.
const threshold = 2;
const multisigPuzzle = Puzzle.multiSig(pubKeys, threshold);

// Puzzle hash can be used as a shared multisig address.
console.log("Multisig (2-of-3) puzzle hash:", multisigPuzzle.hash());
console.log("Puzzle program:", multisigPuzzle.toSource());
```

**Explanation:** In this script, `Puzzle.multiSig(pubKeys, threshold)` builds a puzzle that encodes the rule *"any two of these three public keys must sign off for a valid spend."* Under the hood, the framework might implement this by generating the necessary conditions or logic to check for at least `threshold` signatures. One simple approach is to require signatures from all combinations of the keys taken 2 at a time, but more elegant threshold logic can be used by the framework. The developer using the DSL doesn't need to write that logic manually. The `multisigPuzzle.hash()` yields an address that funds can be sent to. To spend the coin, at least two of the three parties (Alice, Bob, or Carol in this example) must collaborate to provide their signatures in the spend bundle. If only one signature (or none) is present, the spend will not satisfy the puzzle conditions, keeping the coin locked.

## 4. CAT Wrapper Puzzle (Asset Token Wrapper)

Chia Asset Tokens (CATs) are **fungible tokens** on the Chia blockchain, and their puzzle structure involves an **outer wrapper** that enforces token rules (like preventing unauthorized minting or burning) around an inner puzzle that controls the coin's spend conditions. Similarly, Chia NFTs use a wrapping approach with an outer puzzle to ensure uniqueness and an inner puzzle for ownership logic. In this example, we focus on a CAT wrapper puzzle using the DSL, which you can analogously apply to NFT wrappers (with some differences in the outer puzzle logic).

Key concepts for a CAT wrapper puzzle:

* **Outer CAT Layer:** Ensures the coin adheres to the supply rules of a specific token asset ID. It guarantees that the total supply of that CAT type remains consistent unless a valid issuance program (TAIL) allows a change. The outer puzzle will verify the token ID and enforce that outputs properly carry the CAT token.
* **Inner Puzzle:** Controls the spend conditions for the coin's owner. It can be any puzzle (often the standard transaction puzzle or a signature lock) that defines who can spend the coin and how. The inner puzzle is **wrapped** by the CAT outer layer.
* **Wrapping Mechanism:** When spending a CAT coin, the outer puzzle runs and then calls into the inner puzzle (after doing its verifications). The inner puzzle returns conditions (like payments, etc.), and the outer layer typically adds its own conditions or constraints (such as ensuring the outputs are also CAT coins of the same type) before finalizing the spend.

Using the TypeScript DSL, we can construct a CAT puzzle by providing the CAT's **asset ID** (also called the token ID or TAIL hash) and the inner puzzle. The framework will combine them appropriately. For example:

```typescript
import { Puzzle } from "chia-puzzle-framework";

// Suppose we have an inner puzzle (e.g., a standard signature-locked puzzle for the CAT owner).
const ownerPubKey = "abc0...123"; 
const innerPuzzle = Puzzle.signatureLock(ownerPubKey);  // inner puzzle requiring owner's signature

// The CAT asset ID that identifies the token (32-byte ID in hex).
const assetId = "efgh...7890";  // Example CAT asset ID

// Create a CAT wrapper puzzle by wrapping the inner puzzle with the CAT asset ID.
const catPuzzle = Puzzle.wrapWithCAT(assetId, innerPuzzle);

// The resulting puzzle hash is the address for the CAT coin.
console.log("CAT-wrapped puzzle hash:", catPuzzle.hash());
console.log("Puzzle program:", catPuzzle.toSource());
```

**Explanation:** In this script, `Puzzle.wrapWithCAT(assetId, innerPuzzle)` produces a new puzzle that represents a CAT of type `assetId` locked by the `innerPuzzle`. The inner puzzle in our example is a simple signature lock for an owner's key, but it could be more complex (even a multi-sig or another arbitrary puzzle). The outer CAT wrapper ensures that this puzzle behaves as a valid CAT:

* It will enforce that any `CREATE_COIN` conditions follow CAT rules (not creating or destroying token value improperly).
* It passes control to the inner puzzle to dictate spend permissions (in our case, the inner requires the owner's signature).
* When the coin is spent, the outer puzzle wraps around the inner puzzle again for the outputs, preserving the CAT structure.

The developer doesn't write any of the CAT's Chialisp logic manually; the DSL's `wrapWithCAT` handles currying in the asset ID and combining the puzzles correctly. The resulting `catPuzzle.hash()` can be used as a **CAT address** to receive that token. Similarly, for NFTs, a method like `Puzzle.wrapWithNFT(did, innerPuzzle)` might be used (along with a singleton, as shown next) to enforce NFT uniqueness while delegating ownership logic to an inner puzzle.

## 5. Singleton Puzzle (Singleton Wrapper)

A **singleton puzzle** is an outer wrapper that ensures only a single "instance" of a coin (identified by a unique launcher ID) exists at any time. This pattern is crucial for non-fungible tokens (NFTs), Decentralized IDs (DIDs), and other use cases where a coin must be unique and traceable through its lineage. The singleton puzzle (often called the **singleton top layer**) works by requiring that the coin either:

* Was created by a specific **launcher coin** (tying it to a unique ID),
* and whenever it's spent, it must recreate exactly one new coin with the same singleton structure (or deliberately **terminate** if the singleton is being destroyed).

In other words, the singleton wrapper "proves that the puzzle is unique and cannot be duplicated". It does so by embedding the launcher's ID and imposing conditions on spends (using assertions like `ASSERT_MY_PARENT_ID` to ensure the parent was correct, and requiring the creation of a new singleton child with the same ID unless it's being melted).

Key points for a singleton puzzle:

* **Launcher ID:** A unique identifier (coin ID of a dedicated launcher coin) is used to ensure uniqueness. The singleton puzzle is typically curried with a structure containing this launcher ID.
* **Inner Puzzle:** Similar to CATs, the singleton wraps an inner puzzle that governs the spending rules for the coin's owner. For an NFT, the inner puzzle might handle ownership transfers, royalties, etc., but the outer singleton layer ensures there's only one NFT with that ID.
* **Enforced Uniqueness:** The puzzle will assert that either the coin's parent was the launcher or another singleton in the lineage, and that exactly one new singleton coin is created on spend (to carry on the unique line). If these conditions aren't met, the spend is invalid, preventing duplicate "clones" of the singleton.

Using the DSL, creating a singleton involves specifying the launcher's ID and the inner puzzle. The framework will construct the combined program. For example:

```typescript
import { Puzzle } from "chia-puzzle-framework";

// Unique launcher coin ID for the singleton (32-byte identifier of the coin that initialized the singleton).
const launcherId = "abcd...ef01";

// Define an inner puzzle for the singleton (e.g., an NFT ownership logic or simple lock).
const singletonOwnerPubKey = "1234...cafe";
const singletonInnerPuzzle = Puzzle.signatureLock(singletonOwnerPubKey);

// Create the singleton top-layer puzzle by wrapping the inner puzzle with the singleton structure.
const singletonPuzzle = Puzzle.wrapWithSingleton(launcherId, singletonInnerPuzzle);

// Singleton puzzle hash (address for the singleton coin).
console.log("Singleton puzzle hash:", singletonPuzzle.hash());
console.log("Puzzle program:", singletonPuzzle.toSource());
```

**Explanation:** In this code, `Puzzle.wrapWithSingleton(launcherId, innerPuzzle)` produces a puzzle that enforces the singleton semantics using the given `launcherId` and wraps the provided `innerPuzzle`. The resulting `singletonPuzzle` is the full puzzle program that would be used for a singleton coin. Key aspects handled by the framework's singleton wrapper include:

* Currying in a *singleton structure* that contains the launcher ID (and possibly the launcher puzzle hash).
* Adding conditions to every spend to **verify the lineage**: The puzzle will assert that the coin's parent ID matches either the launcher or another singleton in the chain (using something equivalent to `ASSERT_MY_PARENT_ID` and a check against the launcher ID).
* Ensuring exactly one new singleton child is created on spend. The singleton puzzle typically checks the output conditions from the inner puzzle and morphs one of them to enforce the singleton wrapper on the new coin. If no new singleton child is created (except in a special "termination" spend), or if more than one appears, the puzzle fails, thereby preventing duplication of the singleton.

By using the DSL method, the developer doesn't need to implement these low-level checks; the `wrapWithSingleton` abstraction encapsulates the standard singleton logic. The inner puzzle (here a simple signature lock for the owner) can be anything, and is responsible for the functional behavior (who can spend, etc.), while the singleton outer layer guarantees uniqueness of the coin's lineage. The `singletonPuzzle.hash()` can serve as the identifier (puzzle hash) for the singleton coin, and this is the address you'd use when you create or transfer the singleton.

---

**Conclusion:** Using the `chia-puzzle-framework` TypeScript DSL, developers can express complex Chia puzzle constructs in a fluent and readable manner. The examples above demonstrate how core patterns – signature locks, time locks, multi-signature requirements, asset token wrapping, and singleton enforcement – can be built using high-level abstractions. By relying on the framework's puzzle and condition primitives, one avoids writing raw Chialisp for each use case, reducing the chance for errors and improving clarity. Each example script stands on its own, and together they serve as a reference for constructing custom smart coins on Chia using TypeScript.

**Sources:**

* Chia Network Documentation – *Chialisp and TypeScript*: Example of creating a signature-enforced coin via TypeScript.
* Chialisp Documentation – *Conditions Reference*: Definition of time-lock conditions like `ASSERT_HEIGHT_ABSOLUTE`.
* Chia Product Roadmap – *Multisig Vault Puzzle*: Describes a 2-of-3 multisig example (any two of three keys required for signing).
* Chialisp Documentation – *CATs*: Explains CAT puzzle structure wrapping an inner puzzle and enforcing supply rules.
* Chialisp Documentation – *Singletons*: Describes singleton puzzles ensuring unique coin state via a launcher id and inner puzzles (used for NFTs, DIDs).

---

## CoinScript Examples

The framework now includes CoinScript, a high-level domain-specific language that compiles to ChiaLisp. Here are the available examples:

### Basic Examples

1. **00-hello-world.coins** - Simple coin that can be spent
2. **01-basic-payment.coins** - Basic payment functionality with recipient
3. **02-require-signature.coins** - Signature requirements
4. **03-storage-variables.coins** - Immutable storage variables
5. **04-multiple-actions.coins** - Multiple actions in one coin
6. **05-require-statements.coins** - Various require statement patterns
7. **06-send-coins.coins** - Creating coins with send()

### Exception Handling (08-exception-handling.coins)

The `exception` keyword provides explicit control over failure cases. It compiles directly to ChiaLisp's `(x)` operator:

```coinscript
coin SafeVault {
    storage {
        address owner = "xch1...";
        uint256 dailyLimit = 1000000;
    }
    
    action withdraw(address to, uint256 amount) {
        require(msg.sender == owner, "Only owner");
        
        // Explicit failure for invalid recipient
        if (to == 0x0) {
            exception("Cannot withdraw to zero address");
        }
        
        // Explicit failure for limit exceeded
        if (amount > dailyLimit) {
            exception("Exceeds daily limit");
        }
        
        send(to, amount);
    }
    
    action emergencyStop() {
        require(msg.sender == owner);
        // Always fails - effectively locks the vault
        exception("Emergency stop activated");
    }
}
```

Key differences:
- `require(condition, msg)` - Fails if condition is false
- `exception(msg)` or `exception;` - Always fails unconditionally
- Useful for validation, error cases, and emergency stops

Run examples with:
```bash
node examples/[example-name].js
```
