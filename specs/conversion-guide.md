Great. I’ll now create a comprehensive, bidirectional conversion specification between your TypeScript puzzle objects (built using the Layer 1 fluent abstraction) and ChiaLisp source code. This will include human-readable ChiaLisp output, full support for currying and composability, and assume conversion both from fluent-DSL to `mod (ARGS) ...` style source code, and from ChiaLisp source code back into equivalent TypeScript object representations.

I'll follow up shortly with the detailed guide.


# Converting Chia Puzzle Framework Objects to and from ChiaLisp

**Objective:** Provide detailed instructions for converting a high-level TypeScript puzzle object (as defined in the **chia-puzzle-framework** implementation) into equivalent ChiaLisp code, and vice versa. We also explain how to generate TypeScript code from a given ChiaLisp puzzle. These instructions are comprehensive enough that an LLM or developer can implement the conversions accurately.

---

## Overview of Puzzle Representations

In the **chia-puzzle-framework**, puzzles are represented by TypeScript classes and objects. These high-level objects (such as `Puzzle`, `Condition`, `StandardPuzzle`, `MultiSigPuzzle`, `CATWrapper`, etc.) encapsulate puzzle logic and data **without requiring direct Chialisp coding**. Under the hood, each puzzle object corresponds to a ChiaLisp CLVM program. Conversions between the two representations involve:

* **TypeScript to Chialisp:** Translating a `Puzzle` object (and its composed conditions or wrappers) into the **ChiaLisp source code** or CLVM S-expression that it represents.
* **Chialisp to TypeScript:** Interpreting a Chialisp puzzle (source or compiled form) to reconstruct the equivalent **TypeScript object structure** using the framework’s classes.
* **Generating TypeScript code from Chialisp:** Producing the actual TypeScript API calls (builder pattern or class constructors) that would create a given Chialisp puzzle.

**Important:** These conversions assume familiarity with the puzzle framework’s structure and known Chia puzzle templates. We are *not* focusing on low-level CLVM bytecode or runtime behavior, but on the structural translation between the two representations.

---

## TypeScript Puzzle Object to ChiaLisp Code

Converting a TypeScript-based puzzle into ChiaLisp involves mapping each high-level construct to its underlying CLVM program or expression. The process typically works **top-down**, following how the puzzle was constructed:

### 1. Converting Conditions to CLVM Form

At the core of many puzzle programs is a list of **conditions** (the outputs that control coin behavior). In the TypeScript framework, conditions are represented by the `Condition` class with an opcode and arguments. Each `Condition` corresponds to a Chialisp list structure when expressed in CLVM. For example:

* **CREATE\_COIN condition (`Condition.createCoin(puzzleHash, amount, hint?)`):** In Chialisp this is a list starting with the opcode `51` followed by the puzzle hash and amount (and optional hint).
  **Chialisp form:** `(51 <puzzle_hash> <amount> [<hint>])`
  If multiple conditions exist, they will each be a sub-list in the overall conditions list.

* **ASSERT\_SECONDS\_RELATIVE (`Condition.assertSecondsRelative(seconds)`):** Maps to opcode `80` with one argument (the required time).
  **Chialisp form:** `(80 <seconds>)`

* **AGG\_SIG\_ME (`Condition.aggSigMe(publicKey, message)`):** Maps to opcode `50` with two arguments (public key and message hash).
  **Chialisp form:** `(50 <pubkey> <message>)`

When converting, **each `Condition` object is serialized to a list**: the first element is the opcode number (as defined in `ConditionOpcode` enum), followed by its arguments as atoms or byte strings. The framework often provides a method like `Condition.toProgram()` that produces this list for you.

### 2. Simple Puzzle (PuzzleBuilder) to Chialisp

If a puzzle was created using `PuzzleBuilder` by simply adding conditions, it results in a program that **returns a fixed list of conditions**. In Chialisp, such a puzzle is essentially a quoted list of those condition sub-lists.

**Conversion steps:**

* Take the array of `Condition` objects from the builder.
* Convert each to its CLVM list form (as above).
* Wrap them in an enclosing list, and quote it so that the puzzle, when executed, yields that list as the result (rather than treating it as code).

**Example:** Suppose the builder was used as:

```ts
const myPuzzle = new PuzzleBuilder()
    .addCondition(Condition.createCoin(targetHash, 1000n))
    .addCondition(Condition.assertHeightAbsolute(2000))
    .build();
```

This represents a puzzle that, when spent, must create a coin of 1000 mojos to `targetHash` **and** cannot be spent until block height 2000. The equivalent Chialisp source would look like:

```chialisp
(q 
  . (
      (51 0xTARGET_HASH 1000)        ;; CREATE_COIN (targetHash, 1000)
      (83 2000)                     ;; ASSERT_HEIGHT_ABSOLUTE 2000
    )
)
```

Here `51` is the opcode for `CREATE_COIN` and `83` for `ASSERT_HEIGHT_ABSOLUTE`. The entire list is quoted (`q . (<list>)`) so that the program returns these two conditions unconditionally. In other words, the CLVM program is essentially `(q . [cond1, cond2, ...])`.

If the builder had no conditions (empty list), the resulting Chialisp would be `(q . ())`, meaning an empty condition list (a puzzle that imposes no conditions, allowing a coin to be spent freely).

### 3. Standard Puzzle (Signature-locked puzzle) to Chialisp

The **StandardPuzzle** class represents Chia’s **“pay to (public key) with delegated puzzle”** logic. In Chialisp, the standard transaction puzzle (`p2_delegated_puzzle_or_hidden_puzzle.clvm`) is well-known. It takes a *synthetic public key* and expects either a signature or a hidden puzzle reveal in the solution. For our framework (which doesn’t emphasize the hidden puzzle feature unless explicitly used), the typical usage is to require a BLS signature on a delegated puzzle.

**Conversion approach:**

* Identify the *template code* for the standard puzzle. (The framework likely has this compiled; for conversion, we can refer to the known source in Chialisp.)
* This template is a `mod` that expects arguments: in the standard Chia code, `(SYNTHETIC_PUBLIC_KEY original_public_key delegated_puzzle solution)`. If using only delegated puzzle (no hidden puzzle), `original_public_key` is set to `()`, and the puzzle ensures that an `AGG_SIG_ME` with the synthetic key is present for the `delegated_puzzle`.
* In our simplified framework usage, `StandardPuzzle.fromPublicKey(pubKey)` curries in the provided public key as the **SYNTHETIC\_PUBLIC\_KEY**, and typically we do not curry an inner puzzle (meaning the inner puzzle will be provided via the solution each time).

**Chialisp structure (conceptual):**

A simplified view of the standard puzzle code when a delegated puzzle is used might be:

```chialisp
(mod (PK dummy_puz dummy_sol)
    (include condition_codes.clvm)
    (if (c (list AGG_SIG_ME PK (sha256tree dummy_puz)) (a dummy_puz dummy_sol))
        (q . ())  ; if signature verification passes, return inner puzzle's conditions
        (x)       ; fail otherwise
    )
)
```

* `PK` is the curried-in public key (which corresponds to the `SYNTHETIC_PUBLIC_KEY` in full code).
* `dummy_puz` and `dummy_sol` represent the *delegated puzzle* and its solution provided at spend time.
* The code constructs an `AGG_SIG_ME` condition (`(50 PK message)`) where `message` is the hash of the delegated puzzle program (Chialisp uses `sha256tree` on the puzzle and solution for the message). It then **cons** (`c`) this signature check condition onto the result of running the delegated puzzle.
* If the signature is not valid, the puzzle fails (in the full code, this is handled by an `assert` or an `if` returning `(x)` which is false/FAIL).

**Currying details:** In the actual conversion:

* The public key is inserted (curried) into the puzzle code. So the CLVM program you produce will have the public key constant embedded.
* If the standard puzzle was created with an inner puzzle curried as well (via `StandardPuzzle.wrap(innerPuzzle, pubKey)`), then the inner puzzle’s program gets curried into the second argument slot. In that case, the coin **always uses that inner puzzle**. The Chialisp then has the inner puzzle code (or its hash) directly in the program.

**Output Chialisp:** To get the Chialisp for a StandardPuzzle:

1. Start from the known `p2_delegated_puzzle_or_hidden_puzzle` source (or a simplified equivalent if ignoring hidden puzzle).
2. Substitute the specific public key for `SYNTHETIC_PUBLIC_KEY`.
3. If an inner puzzle is curried (fixed), substitute that in place of `delegated_puzzle` argument in the mod. (Often, the standard puzzle is curried with just the key, leaving the inner puzzle dynamic, but currying both is possible.)
4. The resulting program, when disassembled, will show the structure verifying the signature and calling the inner puzzle.

**Example:** If `publicKey = 0xABC123...` and no inner puzzle is curried, the Chialisp (simplified) might appear as:

```chialisp
(q . ( (lambda (dummy_puz dummy_sol)    ;; pseudo-lambda for mod
           (c (list 50 0xABC123... (sha256tree dummy_puz)) (a dummy_puz dummy_sol))
       )
     )
)
```

In reality, the `mod ...` form compiles to a low-level form with the curried key. The key point is that the conversion will produce a program that *contains the public key and (if provided) the inner puzzle’s code or hash.* This program corresponds to the "standard transaction puzzle" with your specific key.

### 4. MultiSig Puzzle (M-of-N) to Chialisp

The **MultiSigPuzzle** class encapsulates a puzzle that requires a threshold of signatures from a set of public keys. Internally, this is represented by a Chialisp program that knows the list of authorized keys and the required number (M) that must sign.

**Conversion approach:**

* Obtain the **multisig puzzle template** (the CLVM source that implements threshold logic). If the framework has `getMultiSigPuzzleTemplate()`, it likely corresponds to a Chialisp `(mod ...)` that takes a list of pubkeys and a threshold as curried-in data.
* In Chialisp, such a program would accept a solution that provides multiple signatures and then verify that at least M of those signatures are valid for the given pubkeys.

**Chialisp structure (conceptual):**

While the exact implementation can vary, conceptually the puzzle might:

* Have the list of `N` public keys and an integer `M` curried in.
* In the solution, receive a list of signatures (and possibly the message they sign; often the message will be derived from the coin spend as per `AGG_SIG_ME` rules).
* The puzzle will iterate or check each provided signature against the corresponding pubkeys and count valid ones.
* Succeed (return the delegated conditions) only if the count of valid signatures ≥ M; otherwise fail.

**Example pseudo-code:**

```chialisp
(mod (PUBKEY_LIST THRESHOLD delegated_puzzle delegated_solution)
    (include condition_codes.clvm)
    (defun count_valid_sigs (keys sigs)
       (if (null? keys) 0
           (+
             (if (check_signature (f keys) (f sigs) message) 1 0)
             (count_valid_sigs (r keys) (r sigs))
           )
       )
    )
    (if (>= (count_valid_sigs PUBKEY_LIST SIG_LIST) THRESHOLD)
        (a delegated_puzzle delegated_solution)   ; proceed with inner puzzle conditions
        (x)                                      ; fail if not enough signatures
    )
)
```

Here `SIG_LIST` would come from the provided solution (list of signatures), and `message` would be the standard coin-specific message (e.g., hash of delegated puzzle or coin info) that all signers sign. The function `check_signature` stands in for the BLS signature verify (which in actual CLVM is done via conditions like `AGG_SIG_ME` – however, the multisig puzzle might simply output multiple `AGG_SIG_ME` conditions, one for each provided signature, and rely on at least M being present in the spend bundle).

**Currying details:** When converting:

* Embed the array of public keys into the program (likely as a list of byte strings).
* Embed the threshold value (as an integer atom).
* The resulting Chialisp code has these parameters fixed. It will be a larger constant program because the list of keys is part of it.

**Output Chialisp:** After currying, the disassembled program might show the list of pubkey bytes and threshold. For instance, for keys `[K1, K2, K3]` and M=2, you’d see those keys in the code along with the number 2. The logic will reflect the verification steps or conditions generation for each key.

### 5. CAT Wrapper to Chialisp

The **CATWrapper** adds an outer layer that enforces the rules of a **Chia Asset Token (CAT)**. Converting this wrapper involves using the CAT puzzle template (often referred to as `cat.clvm` or specifically CAT2 for the updated version) and inserting the required parameters.

**CAT puzzle key points:**

* It ensures that any **new coin created** from this coin has the same *asset ID* (often the TAIL program hash) and that the rules of the TAIL (Token Asset Issuance Limitation) are followed.
* It typically uses the concept of a “**tail hash**” (the asset ID) and tracks the **inner puzzle hash** to delegate standard spending logic.

**Conversion steps:**

1. Retrieve the CAT CLVM template code. This is a `mod` that likely takes two arguments curried in:

   * The 32-byte **Asset ID** (unique identifier for the token type).
   * The **inner puzzle hash** (the puzzle hash of the wrapped inner puzzle).
2. The CAT wrapper program, when executed, will require that:

   * If the coin is spent normally, any `CREATE_COIN` conditions use the same asset ID (enforced by outputting a `ASSERT_MY_COIN_ID` or similar conditions).
   * It may also allow a special issuance or melt if certain conditions (defined by the TAIL program) are met. But generally, for user transactions, the asset ID must persist.
   * It will eventually call the *inner puzzle* (by hash) to get additional conditions. In practice, the CAT puzzle doesn’t include the full inner puzzle source, only its hash, to minimize the on-chain footprint.

**Chialisp form (simplified idea):**

```chialisp
(mod (TAIL_HASH INNER_PUZZLE_HASH inner_solution)
   ;; Ensure all created coins have the same TAIL_HASH (asset id)
   (for coin in (coins created by this spend):
        (assert (== coin.tail TAIL_HASH)) )
   ;; Verify optional tail issuance conditions (omitted for simplicity)
   ;; Call inner puzzle by hash:
   (agglom INNER_PUZZLE_HASH inner_solution)
)
```

*Note:* The above is pseudo-code. In reality, the CAT puzzle uses announcement verifications and conditions. The key for conversion is that the **TAIL\_HASH (assetId)** and **INNER\_PUZZLE\_HASH** will be inserted into the code.

**Currying in conversion:**

* `assetId` (Bytes32) is curried as a constant.
* `innerPuzzleHash` (also 32 bytes) is curried.
* The resulting CLVM program will have those constants and enforce the rules.

If we disassemble the curried CAT puzzle, we’ll see something like the asset ID bytes and the inner hash bytes in the list of constants at the top. The logic portion will contain checks like `ASSERT_MY_ID` or specific opcodes for the announcements that relate to CAT issuance.

**Important:** Because the inner puzzle is represented only by its hash in the outer layer, the actual inner puzzle code is **not present** in the combined Chialisp. The CAT puzzle will call the inner puzzle by its hash (using a Chialisp trick to execute a puzzle by hash if provided with the corresponding solution – this is part of CAT’s design). Therefore, the conversion to Chialisp can output the CAT puzzle code with the inner hash, but not the inner puzzle’s source (unless the inner was separately compiled and provided in full, which usually it is not for CATs).

### 6. Singleton Wrapper to Chialisp

The **SingletonWrapper** enforces uniqueness of a coin by requiring it to recreate exactly one “child” coin of the same structure each time (preventing splitting into two). Converting this involves the singleton top-layer CLVM (often called `singleton_top_layer.clvm`).

**Singleton puzzle key points:**

* It uses a **Launcher ID** (the ID of a dedicated launcher coin) to identify the singleton lineage.
* It ensures every spend of the singleton coin *must create one (and only one) new singleton coin* (with the same puzzle structure), or optionally zero if the singleton is being destroyed. This is usually done by requiring an output coin with the same puzzle hash and an **odd amount** (odd mojo value signals continuity of the singleton).
* A singleton spend also requires a **lineage proof** (information about the parent coin) in the solution to verify the coin’s origin (matching the launcher or previous singleton).

**Conversion steps:**

1. Get the Singleton top-layer CLVM code. This mod likely takes as curried data:

   * A structure containing the **launcher ID** (and possibly the original launcher puzzle hash).
   * The **inner puzzle hash** (the puzzle hash of whatever puzzle is wrapped inside the singleton).
2. Insert the provided `launcherId` (Bytes32) into that structure and curry it in, along with the inner puzzle’s hash.
3. The Chialisp program will perform checks such as:

   * `ASSERT_MY_PARENT_ID` equals either the launcher ID (for the first generation) or matches a stored value from the lineage proof for subsequent spends.
   * Count outputs: exactly one coin must carry forward the singleton (commonly it’s enforced by requiring one output with the same puzzle hash and an **odd** amount).
   * Pass through to the inner puzzle logic (similar to CAT, this might use the inner hash and require the inner puzzle’s conditions via the solution).

**Chialisp outline:**

```chialisp
(mod (LAUNCHER_ID INNER_PUZZLE_HASH solution lineage_proof)
   (include condition_codes.clvm)
   ;; Verify parent info via lineage_proof (ensure uniqueness lineage)
   (if (not (or (= (f lineage_proof) LAUNCHER_ID)  ; parent is launcher or 
                (valid_singleton_parent lineage_proof LAUNCHER_ID)))
       (x))  ;; fail if wrong lineage
   ;; Ensure exactly one child coin with same singleton structure exists
   (assert_single_output INNER_PUZZLE_HASH)
   ;; Run inner puzzle (by hash) with given solution for additional conditions
   (agglom INNER_PUZZLE_HASH solution)
)
```

Again, pseudo-code: the actual singleton CLVM uses specific opcodes like `CREATE_COIN` with `-113` (a magic hint for singleton) and conditions to enforce odd amounts. But for conversion, the main constants are `LAUNCHER_ID` and `INNER_PUZZLE_HASH` curried in.

**Resulting Chialisp:** When converted, the program will contain the 32-byte launcher ID embedded and the inner puzzle hash. The logic ensures uniqueness as described. The disassembled form will show these values and a sequence of conditions like `ASSERT_MY_PARENT_ID ...`, `ASSERT_MY_PUZZLEHASH` (for the child), etc.

### 7. NFT Puzzle (State and Ownership layers) to Chialisp

The **NFTPuzzle** combines multiple layers: it’s effectively a Singleton wrapper plus additional NFT-specific state and ownership wrappers. Converting an `NFTPuzzle` means currying into two more templates on top of the singleton:

* **NFT State Layer:** Holds metadata (e.g., URI or hash of content) and royalty info.
* **NFT Ownership Layer:** Controls ownership transfer rules, possibly involving DIDs and offer handling.

**Conversion steps:**

1. **Singleton layer:** As above, curry in the `launcherId` and inner puzzle hash to get the singleton top layer code.
2. **State layer:** Retrieve the NFT state layer CLVM template (often called `nft_state_layer.clvm`). Curry in:

   * The **metadata** (could be a hash or IPFS link data, likely as bytes).
   * The **royalty address** and **royalty percentage** (if applicable; percentage might be represented as basis points or a fraction).
   * The **puzzle hash of the underlying singleton+inner** (so the state layer knows what it wraps).
     This produces a new puzzle which enforces that any transfer must respect royalty payments (by adding a `CREATE_COIN` for the royalty address on sales) and allows updating the metadata via a controlled process (often using an announcement or specific condition to change the metadata in future spends).
3. **Ownership layer:** Retrieve the NFT ownership layer template (`nft_ownership_layer.clvm`). Curry in:

   * The **owner identity** (this could be a DID bytes32, or if no DID, it might curry in a fallback owner public key or just an empty value).
   * A **transfer program** or approval mechanism (for offers, typically an empty list or specific conditions; if not using offers, this might be an empty placeholder).
   * The **puzzle hash of the state layer puzzle** (linking to the layer below).
     This yields the final NFT puzzle that is applied to the coin. The ownership layer will require that spends are authorized by the current owner (or that a valid offer exchange happened), and it will update the curried owner on transfer.

After step 3, the fully curried NFT puzzle is ready. The conversion to Chialisp would output the assembled code with all those values embedded.

**Chialisp structure:**

The NFT puzzle is deeply nested. Conceptually:

* **Ownership mod** `(OWNER_ID, TRANSFER_PROGRAM, STATE_PUZZLE_HASH)` – ensures correct owner or offer, then calls into state layer.
* **State mod** `(METADATA, ROYALTY_ADDR, ROYALTY_PERCENT, INNER_PUZZLE_HASH)` – ensures royalty and metadata rules, then calls into singleton/inner.
* **Singleton mod** `(LAUNCHER_ID, INNER_PUZZLE_HASH)` – ensures uniqueness, then calls inner.

Each layer calls the next by using the puzzle hash and solution. In practice, the NFT puzzle might use an “incremental currying” approach, but the end result is equivalent to nesting these mod functions.

**Resulting Chialisp code:** If disassembled, one would see:

* The constants: e.g., owner DID (if any), royalty percent, addresses, metadata, launcher ID, etc., all as literal bytes/atoms in the program.
* Conditions enforcing each layer’s rules:

  * e.g., Ownership layer might contain `ASSERT_MY_DID` or use announcements for offers (like an `ASSERT_PUZZLE_ANNOUNCEMENT` with a specific prefix to ensure an offer was taken).
  * State layer might include conditions like `(CREATE_COIN <royalty_addr> <calc_amount>)` when a trade is detected, or allow a `(CREATE_COIN ... -24 ...)` for metadata update (negative amounts are trick markers in NFT).
  * Singleton layer conditions as described earlier.
* Ultimately, the innermost `innerPuzzle` (often a simple `Puzzle` requiring a signature from the owner’s public key) is referenced by hash. The actual code for that inner puzzle is not embedded; only its hash is used to verify consistency when passing solutions.

**Note:** Just like CAT, because the inner puzzle is only referenced by hash in the outer layers, the combined NFT puzzle code does not explicitly contain the inner puzzle’s source. It relies on the fact that when the coin is spent, the spender provides the inner puzzle’s *solution* and reveal that matches the expected hash (for the very first spend, the reveal of inner must be known to all; subsequent spends might not need to reveal it if it stays the same, unless the puzzle changes owners or so). For conversion output, we typically produce the puzzle with hashes in place.

---

## ChiaLisp Code to TypeScript Puzzle Object

Converting from ChiaLisp back into the TypeScript framework means **recognizing which high-level puzzle pattern** the CLVM code represents and then extracting the parameters to reconstruct the corresponding objects. This is effectively a reverse-engineering process:

1. **Identify the Puzzle Type:** We examine the structure of the Chialisp program to determine if it matches one of the known templates (Standard, MultiSig, CAT, Singleton, NFT, or a simple condition list, etc.). Each has telltale signs:

   * **Quoted list of conditions (`q . (...)`):** Indicates a simple puzzle that just returns conditions. This maps to a `PuzzleBuilder` usage or a raw `Puzzle` with conditions.
   * **Contains `AGG_SIG_ME` and delegates to another puzzle (`(a ... )` call):** Likely the Standard Puzzle (pay-to-delegated-puzzle). The presence of an `AGG_SIG_ME` opcode (50) with a specific key suggests a required signature. If the code structure matches the standard template (with or without the hidden puzzle branch), we classify it as a `StandardPuzzle`.
   * **Checks multiple signatures or loops through keys:** Suggests a MultiSig puzzle. For example, if the CLVM code has multiple `AGG_SIG_ME` or uses a counting mechanism with a list of keys, it likely corresponds to `MultiSigPuzzle`.
   * **References to an Asset ID and uses coin announcement/asserts in a specific way:** Indicates a CAT puzzle. CAT puzzles often have an `ASSERT_COIN_ANNOUNCEMENT` or similar condition to enforce the TAIL, and a constant 32-byte value that is the asset ID.
   * **Looks for odd coin values or contains `ASSERT_MY_PARENT_ID` matching a launcher ID:** This is characteristic of the Singleton top layer. If you see conditions or logic ensuring a single output with an odd amount, and a 32-byte value that could be a parent ID, it’s likely a Singleton.
   * **Contains multiple nested layers and values like metadata URIs, DID IDs, royalty percentages:** That’s likely an NFT puzzle, which is essentially a combination of Singleton + NFT-specific layers. The presence of certain unusual conditions (like negative Create Coin conditions or `ASSERT_PUZZLE_ANNOUNCEMENT` with specific constants used in NFT offers) would confirm this.
   * **Other or unknown structure:** If the puzzle doesn’t match any known pattern, it may be a custom puzzle not directly supported by the high-level framework. Conversion might then fall back to a generic representation (e.g., just use `Puzzle.from(hex)` to hold it, or break down conditions generically).

2. **Extract Curried Parameters:** Once the type is identified, extract the values of the key parameters from the Chialisp code:

   * For a **Standard Puzzle**, find the curried-in public key (the 48-byte BLS key). In compiled form, this might appear as part of the constants at the top of the disassembled program. Once you have it, you know the coin is locked to that key.

     * If an inner puzzle is also curried, you would find a compiled inner puzzle or its hash in the constants. In standard puzzle, curried inner usually means the code (or its hash) is included. If the inner is included as code, you can extract that sub-program and recursively convert it (it might be a PuzzleBuilder list or something). If only the hash is included (less common for standard puzzle), you cannot get the inner details without additional info.
   * For a **MultiSig Puzzle**, extract the list of public keys and the threshold. Likely in the disassembly, you’ll see a list structure of pubkey atoms and an integer. For example, you might see something like `(#abcd1234... #deadbeef... #cafe9999...) 2` meaning two is the threshold and the list of keys precedes it. Those keys (after `#` indicating bytes in some hex form) are the pubkeys. Once identified, you can reconstruct the `MultiSigPuzzle(keys, threshold)` object.
   * For a **CAT Wrapper**, look for the asset ID constant. The CAT puzzle usually has the asset ID up front. Also, identify the inner puzzle hash (another 32-byte constant). You will not see the inner puzzle’s full code in most CATs. To represent this in TypeScript:

     * You’d create a `CATWrapper(assetId)` instance.
     * You also need the inner puzzle **itself**. Since only the hash is known from the outer puzzle, you would need additional context to know what the inner puzzle is. In practice, the inner puzzle for a CAT coin is often a standard puzzle (or a delegated puzzle of the owner). If you have the coin’s *solution* or other data, you might be able to guess or retrieve the inner puzzle reveal. But if not, you might have to leave it as an unknown inner.
     * For conversion purposes, if we assume we have the inner puzzle code (perhaps provided alongside the Chialisp puzzle), you would convert that inner portion separately into a `Puzzle` (or a specific class like `StandardPuzzle`) object. Then you can call `CATWrapper.wrap(innerPuzzle)` to rebuild the whole structure.
   * For a **Singleton Wrapper**, find the launcher ID in the code (32 bytes constant). Also, find the inner puzzle hash constant. Similar to CAT, the actual inner puzzle code might not be present, only its hash. You would:

     * Create a `SingletonWrapper(launcherId)` object.
     * Reconstruct or obtain the inner puzzle (if possible) and wrap it: `SingletonWrapper.wrap(innerPuzzle)`.
     * If the singleton is part of an NFT, you will find additional layers (see below).
     * Also note: the solution for singleton spends provides a lineage proof; the presence of certain constants like `-113` in conditions is a sign of a singleton (in Chia, `CREATE_COIN ... -113` hint is used in the official singleton code).
   * For an **NFT Puzzle**, identify the multiple curried values:

     * Likely order (depending on implementation): metadata, royalty address, royalty percentage, state puzzle hash; then owner (DID or pubkey), transfer program, state puzzle hash.

       * You might see the metadata bytes (often an IPFS URI or hash, which might be recognizable as ASCII or just a blob).
       * A royalty address (32 bytes) and percentage (small integer).
       * The DID or owner key (32 bytes for DID or 48 for pubkey).
       * The various hashes linking layers (these may look like random 32-byte constants).
     * To reconstruct:

       * Use `new NFTPuzzle(metadata, {royaltyAddress, royaltyPercent, ownerDid})` to set up the NFT parameters.
       * You will still need the inner puzzle (often a simple `StandardPuzzle` for the owner’s key, unless DID is used in a different way). If the DID is present, often the inner puzzle might be just a condition requiring a signature from a key derived from that DID (the DID itself might be controlling a spending key).
       * Recreate the inner puzzle if known (for example, if the DID has an associated wallet puzzle, or if it’s a standard puzzle with the owner’s pubkey).
       * Then call `NFTPuzzle.wrap(innerPuzzle, launcherId)` to get the final Puzzle.
     * If you cannot retrieve the exact inner puzzle code (only its hash), you might still represent the NFT at a higher level: you know the data (metadata, DID, etc.) and you know the puzzle hash of the inner. The framework could allow creating a placeholder Puzzle from just a hash (though typically `Puzzle.from` needs actual code or hex). At minimum, you can document the inner puzzle hash or treat it as an opaque puzzle.

3. **Construct the TypeScript Object:**
   Using the identified type and extracted parameters, instantiate the appropriate class or builder:

   * **Standard Puzzle:** If inner puzzle was not fixed (no curried inner code found), do `StandardPuzzle.fromPublicKey(pubKey)`. If an inner puzzle is curried (i.e., the Chialisp had an embedded inner puzzle), reconstruct that inner as a `Puzzle` object (or higher-level class) and then use `StandardPuzzle.wrap(innerPuzzle, pubKey)` to get the combined puzzle.
   * **MultiSig Puzzle:** Use `new MultiSigPuzzle(pubKeyList, threshold)` to create the puzzle object. This will internally curry those keys and threshold into the multisig template. The resulting object's `getPuzzle()` would yield a `Puzzle` representing the same Chialisp.
   * **CAT Puzzle:** If the inner puzzle’s code is known (or can be represented), do `const cat = new CATWrapper(assetId); const fullPuzzle = cat.wrap(innerPuzzle)`. If the inner is not known, you might create a dummy `Puzzle` just to hold the hash (the framework doesn’t explicitly have a method to wrap by hash only, since normally you’d have the actual inner when constructing a coin). In absence of the inner puzzle code, you could still instantiate `CATWrapper(assetId)` for the outer logic and note the inner hash.
   * **Singleton Puzzle:** Create `const singleton = new SingletonWrapper(launcherId); const fullPuzzle = singleton.wrap(innerPuzzle)`. Again, innerPuzzle should be reconstructed or provided if possible (it might itself be an NFT state puzzle or something).
   * **NFTPuzzle:** Use the NFT parameters to instantiate `new NFTPuzzle(metadata, {royaltyAddress, royaltyPercent, ownerDid})`. Then wrap as `nftPuzzle.wrap(innerPuzzle, launcherId)`. Ensure the innerPuzzle corresponds to the owner’s puzzle (perhaps a StandardPuzzle for the owner’s public key, or a more complex DID puzzle if the DID controls it). Reconstructing that may require external logic if the DID is involved (the inner might allow recovery or transfer via the DID – those details might go beyond the scope of a direct conversion, but in general, the framework’s NFT usage assumes either a simple inner or something you provide).

4. **Recreating Conditions (if puzzle is simple):** If the puzzle was just a conditions list (quoted list), you can directly map each sub-list to a `Condition` call:

   * For each condition in the Chialisp list, take the first element (opcode number) and look up the corresponding static method in `Condition`:

     * e.g., `51` → use `Condition.createCoin(arg1, arg2, ...)`
     * `80` → `Condition.assertSecondsRelative(arg)`
     * `50` → `Condition.aggSigMe(pubKey, msg)`
     * etc. (The `ConditionOpcode` enum in the framework defines all codes).
   * Provide the arguments from the Chialisp as parameters to that method (making sure to convert bytes or integers appropriately to `Bytes` or `bigint` for the TS call).
   * Collect all Condition objects in an array, then use `new PuzzleBuilder().addCondition(cond1).addCondition(cond2)... .build()` to rebuild the Puzzle. (Or use a hypothetical `PuzzleBuilder.fromConditionList(conditionList)` if available).

**Example (Chialisp to conditions):** Given Chialisp puzzle `(q . ((51 0xabcd... 500) (80 3600)))`:

* Parse outer `q . (...)` indicates simple conditions.
* Two conditions inside:

  1. `(51 0xabcd... 500)` -> opcode 51 = CREATE\_COIN. Arguments: puzzle hash = `0xabcd...`, amount = 500. Convert to `Condition.createCoin(<Bytes32 "0xabcd...">, 500n)`.
  2. `(80 3600)` -> opcode 80 = ASSERT\_SECONDS\_RELATIVE. Argument: 3600. Convert to `Condition.assertSecondsRelative(3600)`.
* Build a Puzzle: `PuzzleBuilder().addCondition(cond1).addCondition(cond2).build()`. Now we have a `Puzzle` object equivalent to the original Chialisp.

5. **Verification (optional):** After constructing the TypeScript object, one could verify the conversion by comparing puzzle hashes. The puzzle hash of the reconstructed `Puzzle` should match the puzzle hash of the original Chialisp (if we had the original puzzle reveal). This ensures the conversion was accurate. The framework’s `Hasher.treeHash` or `Puzzle.getPuzzleHash()` can be used for this.

### **Handling Unknown or Partially-Known Puzzles**

In some cases, you might have a Chialisp puzzle that **does not exactly match** the known templates, or as noted, you might not have the inner puzzle source that corresponds to a given hash in an outer wrapper:

* If the puzzle is unknown, the safe fallback is to use the base `Puzzle` class: e.g., `Puzzle.from(hexSource)` to encapsulate it. This at least allows you to handle it (get its hash, run it with a solution if needed) even if you lack a higher-level abstraction.
* If only a hash of an inner puzzle is known (common with CATs, Singleton, NFT outers), you cannot fully reconstruct the inner puzzle just from the hash. In a real scenario, you would retrieve the inner puzzle reveal from the blockchain (if the coin was spent and revealed it) or have it from the coin issuer. For conversion documentation:

  * Acknowledge that without the actual inner puzzle, one can represent the inner logic abstractly or leave it as a placeholder. For instance, you might create a dummy `Puzzle` object via `Puzzle.from(innerPuzzleCodeHex)` **if** you can get the hex from somewhere, or skip wrapping and just note the puzzle hash.
  * The outer object (CATWrapper/SingletonWrapper) can still be created since you know the assetId or launcherId. But you might not call `wrap` if you lack the inner `Puzzle` object; instead, just recognize “this coin’s puzzle is a CAT around an unknown inner”.

In summary, converting from ChiaLisp to the TypeScript framework involves a combination of **pattern recognition** and **parameter extraction**. It requires familiarity with the standard Chia puzzle structures, since the framework is built around those. When implemented in code (or by an LLM), this means having a library of known puzzle bytecode patterns or module names to match against, and then using the framework’s API to rebuild the high-level representation.

---

## Generating TypeScript Code from ChiaLisp

This step goes one level further than the above “Chialisp to object” conversion: we want to output actual **TypeScript code (as a string or file)** that, when executed, would produce the original puzzle. Essentially, we document how to produce the same puzzle using the framework’s fluent API.

To do this, follow the identification and extraction from the previous section, then format it as code:

1. **Standard imports/setup:** In the generated code, you would typically want to import the necessary classes from the framework (e.g. `import { StandardPuzzle, Condition, PuzzleBuilder, CATWrapper, SingletonWrapper, NFTPuzzle, MultiSigPuzzle } from 'chia-puzzle-framework';`). Ensure the output code snippet is self-contained (aside from these imports).

2. **Reconstruct via API calls:**

   * If the puzzle was identified as a **StandardPuzzle** with a known pubkey (and no fixed inner):
     Output code like: \`\`\`ts
     const puzzle = StandardPuzzle.fromPublicKey("\<hex\_public\_key>");

     ````
     (You might format the pubkey as a hex string or bytes, depending on the framework’s expected input. If `PublicKey` type accepts a hex string or Uint8Array, use that.)
     - If an inner puzzle was fixed, and you have its code or can reconstruct it (say it was a list of conditions), then generate code for that inner first, then show wrapping:  
       ```ts
       const innerPuzzle = new PuzzleBuilder()...<build inner conditions>.build();
       const puzzle = StandardPuzzle.wrap(innerPuzzle, "<hex_public_key>");
     ````
   * If the puzzle is a **MultiSigPuzzle** with extracted keys and threshold:

     ```ts
     const pubKeys = ["<hex1>", "<hex2>", ...].map(hex => bytesFromHex(hex));  // assuming a helper to convert hex to Uint8Array
     const puzzle = new MultiSigPuzzle(pubKeys, THRESHOLD);
     ```

     (Alternatively, if framework uses a static constructor, adjust accordingly. The key is to supply the same pubkey list and threshold.)
   * For a **conditions list puzzle** (from PuzzleBuilder):
     Generate code that creates each condition:

     ```ts
     const conditions = [];
     conditions.push(Condition.createCoin("<receiver_puzhash_hex>", 1000n));
     conditions.push(Condition.assertSecondsRelative(3600));
     // ... any other conditions
     const puzzle = new PuzzleBuilder().addConditionList(conditions).build();
     ```

     In practice, you might inline the condition creation chain instead of using an array, but clarity is key. Ensure that byte values (like puzzle hashes or message bytes) are correctly represented (maybe as hex strings or 0x-prefixed constants).
   * For a **CAT-wrapped puzzle**:
     You will need to generate both the inner puzzle code and the wrapping:

     ```ts
     const innerPuzzle = /* ... code to build or obtain inner puzzle ... */;
     const cat = new CATWrapper("<asset_id_hex>");
     const puzzle = cat.wrap(innerPuzzle);
     ```

     If you identified the inner as a standard puzzle for a certain key, you might combine:

     ```ts
     const innerPuzzle = StandardPuzzle.fromPublicKey("<owner_pubkey_hex>");
     const catPuzzle = new CATWrapper("<asset_id_hex>").wrap(innerPuzzle);
     ```

     This code would create the same combined puzzle. If the inner puzzle was more complex (multi-sig or an NFT further inside), generate those accordingly.
   * For a **Singleton puzzle**:

     ```ts
     const innerPuzzle = /* inner puzzle code */;
     const singleton = new SingletonWrapper("<launcher_id_hex>");
     const puzzle = singleton.wrap(innerPuzzle);
     ```

     If this singleton is part of an NFT, you wouldn’t generate this in isolation but as part of NFT (see next). If it’s a standalone singleton for, say, a DID or some unique coin, the inner might be a StandardPuzzle or custom logic.
   * For an **NFT puzzle**: This is the most involved:

     1. Create the inner ownership logic puzzle. Often this is just a standard puzzle for the current owner’s public key (if no DID), or a DID-specific puzzle. For simplicity, if an `ownerDid` was provided, the framework might expect that in NFTPuzzle but still uses an inner puzzle for actual spending. If the DID is controlling the NFT, a common approach is to still have an inner puzzle that requires a signature from the *current* owner's key (which can change when the DID changes the spending key). If that key is known or can be derived, produce a StandardPuzzle for it.

        * For example: `const ownerInner = StandardPuzzle.fromPublicKey("<owner_current_pubkey>");`
     2. Instantiate the NFTPuzzle with metadata and options:

        ```ts
        const nft = new NFTPuzzle(<metadata_bytes>, {
            royaltyAddress: "<royalty_address_hex>",
            royaltyPercent: 5,         // for example
            ownerDid: "<owner_did_id>"
        });
        ```

        (If `ownerDid` is present, the inner puzzle might still be needed for recovery spends or if no DID is present at all, you definitely need the inner StandardPuzzle for the pubkey.)
     3. Wrap:

        ```ts
        const puzzle = nft.wrap(ownerInner, "<launcher_id_hex>");
        ```

     This yields the full NFT puzzle. The code generation should reflect the actual values for metadata (which might be a URL or hash – you may need to encode that properly as a byte array or hex), royalty address (32-byte puzzle hash of the royalty recipient), royaltyPercent (integer), and owner DID (32-byte ID or leave undefined if not applicable).
   * If any intermediate values (like the inner puzzle’s puzzle hash) are needed explicitly (for example, if the framework had methods to set expected inner hash without full inner), you might incorporate those. But in our high-level API usage, we typically provide the inner puzzle object itself.

3. **Formatting and Helper Usage:** In generating code, ensure that any byte strings are handled correctly. The framework likely has utilities or expects certain types:

   * If using hex strings directly in the API (e.g., passing `"0xABC123"` to a function expecting `Bytes`), confirm that the function accepts hex. If not, convert to a `Bytes` object (Uint8Array). Possibly include a comment or function call like `bytesFromHex("abc123")` if such utility exists.
   * For big integers (amounts, time locks), use `n` suffix or `BigInt(...)` in the code to avoid accidental number issues.

4. **Commenting (if needed):** It may be useful to comment the generated code for clarity, especially if handing to an LLM or developer to implement. For instance:

   ```ts
   // Reconstruct Standard Puzzle with pubkey X
   const puzzle = StandardPuzzle.fromPublicKey("0x...");  // hex of BLS pubkey
   ```

   Or comment tricky parts, like the meaning of each parameter in NFTPuzzle.

5. **Verification Step in Code:** Optionally, the code generation can include a verification snippet (this is extra but helpful):

   ```ts
   console.assert(puzzle.getPuzzleHash().equals("<original_puzzle_hash_bytes>"), "Conversion correctness check");
   ```

   This would ensure the generated puzzle matches the original by hash.

**Example Scenario (Generating TS from Chialisp):**

Imagine we have a coin whose puzzle reveal (in Chialisp) was known to be a 2-of-3 multisig with keys K1, K2, K3 and no other conditions. A possible TypeScript code output:

```ts
import { MultiSigPuzzle } from "chia-puzzle-framework";

const pubKeysHex = [
  "aff2...bc",  // K1
  "34de...99",  // K2
  "78ab...12"   // K3
];
const pubKeys = pubKeysHex.map(h => Buffer.from(h, "hex"));
const multiSigPuzzle = new MultiSigPuzzle(pubKeys, 2);

// If there are delegated conditions for spends, one could attach them via createSolution at spend time.
console.log("Puzzle Hash:", multiSigPuzzle.getPuzzle().getPuzzleHash().toString("hex"));
```

This code, when run, would create the MultiSig puzzle equivalent to the original. We included how to form the byte arrays from hex and verifying the puzzle hash.

For a more complex example, say the Chialisp corresponded to an NFT with certain metadata and an owner DID, the generated code could be:

```ts
import { NFTPuzzle, StandardPuzzle } from "chia-puzzle-framework";

// Known values from the puzzle:
const launcherId = "0xLAUNCHER_ID_HEX";
const ownerDID = "0xOWNER_DID_ID_HEX";
const royaltyAddr = "0xROYALTY_ADDR_HEX";
const royaltyPct = 5;
const metadata = Buffer.from("<uri or hash string>", "utf-8");  // or hex if given as hex

// Inner puzzle: assuming the DID controls a specific wallet key, which we have (this may be contextual).
// If we don't have a specific key, we might skip the inner for now or use a placeholder.
const ownerPubKey = "0xOWNER_CURRENT_PUBKEY_HEX";
const ownerInnerPuzzle = StandardPuzzle.fromPublicKey(ownerPubKey);

// Assemble NFT puzzle
const nftPuzzle = new NFTPuzzle(metadata, { royaltyAddress: royaltyAddr, royaltyPercent: royaltyPct, ownerDid: ownerDID });
const fullPuzzle = nftPuzzle.wrap(ownerInnerPuzzle, launcherId);

console.log("NFT Puzzle Hash:", fullPuzzle.getPuzzleHash().toString("hex"));
```

This shows the creation of the NFTPuzzle object with extracted parameters and wrapping the inner puzzle.

---

## Considerations and Validation

* **Completeness of Conversion:** Ensure all pieces of the puzzle are accounted for. A puzzle might combine multiple layers (e.g., a CAT that wraps a StandardPuzzle, or an NFT that wraps a CAT which wraps a StandardPuzzle!). The conversion should not drop any layer. In layered puzzles, convert from outside in:

  1. Identify outermost layer, reconstruct that object.
  2. Move to the next inner layer (the outer layer will give you an inner hash or code to inspect).
  3. Continue until the innermost puzzle (which often will be a conditions list or a StandardPuzzle).
  4. Then generate code nested accordingly: wrapping in reverse order (inner first, then wrap by outer, etc.).

* **Data Types:** Be careful with data types when converting. Chialisp uses byte strings for many things (public keys, hashes). The TypeScript framework uses `Bytes` (likely `Uint8Array` or similar). Conversions should properly handle hex string to byte array. Similarly, CLVM integers (which might appear in decimal in the disassembly) need to become `bigint` or `number` in TypeScript (use `BigInt` for safety if large, especially coin amounts or timestamps).

* **Lossy Conversions:** As noted, converting from Chialisp to TypeScript can be lossy if parts of the puzzle were not revealed (inner puzzle hashes). Document these cases and handle gracefully:

  * Possibly allow creating a `Puzzle` from just a hash for tracking, or at least record the hash for reference.
  * If an LLM is implementing this, it should be instructed to either query an external source for the inner puzzle by hash (if possible via some context or known library of standard puzzles) or to notify that the conversion is incomplete without additional input.

* **Testing:** After implementing conversion functions (in either direction), test them on known examples. For example:

  * Start with a known puzzle object (like a StandardPuzzle with a given key, plus a condition) – convert to Chialisp – then convert back to TypeScript – and ensure you get an equivalent object (maybe compare puzzle hashes or some structural equality).
  * Test with a layered puzzle (like a CAT around a standard puzzle).
  * Test with pure conditions list puzzles.
  * This will validate that your conversion logic preserves the puzzle semantics.

By following the above instructions, an implementer (human or LLM) should be able to systematically translate TypeScript puzzle objects to Chialisp source and reconstruct TypeScript representations from Chialisp. The key is understanding the one-to-one correspondence between framework constructs and puzzle code patterns, and carefully handling all parameters in the conversion. With this mapping, developers can move between the convenience of high-level puzzle-building and the explicit clarity of on-chain Chialisp code, leveraging the best of both worlds.
