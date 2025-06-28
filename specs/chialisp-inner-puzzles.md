Understood. I’ll create a comprehensive, technical tutorial-style guide that covers everything about inner puzzles in Chialisp, including in-depth explanations, code examples, and contextual integration with the broader Chialisp reference. I’ll get started and let you know when it’s ready.


# Inner Puzzles in Chialisp

Chialisp **puzzles** are programs that govern how and when a coin can be spent. By default, each coin has a single puzzle that produces a list of spending **conditions** (e.g. who can spend it next, when it can be spent, etc.). An **inner puzzle** is a Chialisp program nested **inside** another (the **outer puzzle**) such that the inner puzzle’s output (its conditions) is passed to and enforced by the outer puzzle. This “coin within a coin” model makes puzzle behavior **composable**, allowing developers to reuse and stack puzzle logic in powerful ways. In practice, the outer puzzle can impose certain rules or constraints on spending, while the inner puzzle encapsulates independent logic within those rules. Inner puzzles are central to Chia’s coin design, enabling features like Chia Asset Tokens (CATs), NFTs, DIDs, and other **smart coins** that combine multiple layers of rules.

## Outer vs. Inner Puzzles: Structure and Interaction

In a coin with an inner puzzle, the **outer puzzle** acts as a wrapper or controller, and the **inner puzzle** provides additional or customizable behavior. The outer puzzle will **execute** the inner puzzle using the Chialisp apply operator `a` (short for “apply”). This means the outer puzzle calls the inner puzzle with a given inner solution (the inner puzzle’s arguments) and gets back the inner puzzle’s list of conditions. The outer puzzle can then combine, filter, or augment these conditions before returning the final condition list to the blockchain.

The interaction typically works as follows:

* The **outer puzzle** is written to accept as arguments an `INNER_PUZZLE` (usually a compiled Chialisp program) and an `inner_solution`. These are curried in or provided at spend time.
* When executed, the outer puzzle uses `(a INNER_PUZZLE inner_solution)` to run the inner puzzle with its solution. Whatever conditions the inner puzzle returns will be fed back into the outer puzzle’s logic.
* The outer puzzle can then prepend or assert additional conditions on top of the inner puzzle’s output. For example, an outer puzzle might require a signature or enforce an additional constraint, then append the inner puzzle’s conditions to the result.
* Think of the outer puzzle as an **additional layer of control** or a template around the inner coin’s logic. The inner puzzle can “do whatever it wants” within the rules set by the outer layer.

Crucially, the coin’s **puzzle hash** (its on-chain identifier for the puzzle) is the hash of the *combined* program (outer with the inner curried in). Changing either the outer code or the inner puzzle (or its curried arguments) will produce a different puzzle hash/address. The outer and inner puzzle together form the full puzzle that must be revealed when spending the coin, and their combined conditions must all be satisfied. This composition is powerful but means wallets and tools must handle nested puzzles – for example, by “uncurrying” the puzzle reveal to identify the outer puzzle type and inner puzzle inside.

## Currying and Uncurrying Inner Puzzles

**Currying** in Chialisp refers to binding certain arguments into a puzzle *before* the coin is created. In the context of inner puzzles, currying is used to embed an inner puzzle program into an outer puzzle. Instead of hard-coding a specific inner puzzle, the outer puzzle is written generally (with a placeholder for `INNER_PUZZLE`), and you then curry in the actual inner puzzle (as compiled CLVM bytes) and any other constants when creating the coin. Currying allows the outer puzzle code to be reused with different inner puzzles and parameters, while still producing a unique puzzle hash for each combination. By convention, puzzle parameters that must be curried in (like public keys or inner puzzles) are written in **SCREAMING\_SNAKE\_CASE** in the Chialisp source.

**Uncurrying** is the reverse process: given a compiled puzzle (for instance, the puzzle reveal from an existing coin), we can extract the original “uncurried” program and its arguments. Tools like `cdv clsp uncurry` in Chia Dev Tools will return the base **mod** (module) and the list of curried values (such as the specific inner puzzle and constants). Uncurrying is important for wallet software and explorers, as it lets us identify the structure of a coin’s puzzle. For example, a wallet might un-curry a coin’s puzzle reveal to discover that it uses the CAT outer puzzle with a particular inner puzzle, or a singleton outer puzzle with a certain inner puzzle hash. This is how the wallet knows, for instance, that a coin is an NFT or CAT and how to handle it. In summary:

* **Currying** an inner puzzle into an outer puzzle produces a final puzzle program (and hash) unique to that pairing.
* **Uncurrying** a puzzle reveal recovers the outer puzzle template and the inner puzzle (and other curried args), enabling introspection of coin structure.
* The Chialisp standard library provides helpers like `puzzle-hash-of-curried-function` to calculate puzzle hashes when currying in an inner puzzle and arguments, which is heavily used in puzzles like NFTs and singletons.

## Example: Composing an Outer Puzzle with an Inner Puzzle

Let’s walk through a concrete example to illustrate inner puzzles. Suppose we want to create a coin that **requires a signature** from a specific public key *and* is **time-locked** for a certain number of blocks after creation. We can achieve this by composing two puzzle layers:

* An **inner puzzle** that enforces a time-lock condition (using an `ASSERT_HEIGHT_RELATIVE` condition).
* An **outer puzzle** that requires a signature (using an `AGG_SIG_ME` condition) on the spend, and then delegates execution to the inner puzzle.

### Outer Puzzle: Signature-Required Wrapper

First, we write the outer puzzle, which will require the spender to provide a valid signature for the inner solution (thereby authenticating the spend by a particular key). This puzzle takes three parameters: a `PUBLIC_KEY` to require for the signature, an `INNER_PUZZLE` (the compiled inner puzzle program it will wrap), and the `inner_solution` to pass to the inner puzzle at spend time. In Chialisp (with comments for clarity):

```chialisp
(mod (PUBLIC_KEY INNER_PUZZLE inner_solution)  ; Outer puzzle module
    (include condition_codes.clib)
    (include sha256tree.clib)
    
    ; Define a function to prepend a signature condition to a list of conditions
    (defun calculate_output (PUBLIC_KEY inner_solution conditions)
        (c (list AGG_SIG_ME PUBLIC_KEY (sha256tree inner_solution)) 
           conditions
        )
    )
    
    ; Execute the inner puzzle and pass its result into the signature checker
    (calculate_output PUBLIC_KEY inner_solution 
        (a INNER_PUZZLE inner_solution)
    )
)
```

In the outer puzzle above, we use `AGG_SIG_ME` (aggregate signature condition) to demand a signature from `PUBLIC_KEY`. The message being signed is the **tree hash** of the `inner_solution` (calculated with `sha256tree`). This means the signature is effectively on the entire inner puzzle’s solution, ensuring the spend is authorized by the holder of the private key corresponding to `PUBLIC_KEY`. The `(a INNER_PUZZLE inner_solution)` part **runs the inner puzzle** with the provided `inner_solution` and returns that inner puzzle’s list of conditions. These returned conditions (from the inner puzzle) are passed to our `calculate_output` function, which conses (`c`) the signature requirement condition in front of the inner conditions list. In effect, the outer puzzle says: “the spend must have a valid signature on the inner solution, and then we’ll enforce whatever conditions the inner puzzle wants.”

Notice that `PUBLIC_KEY` and `INNER_PUZZLE` are in all-caps – this is a signal that they are meant to be curried in (bound) *before* use. Indeed, when we deploy this puzzle, we will insert the actual public key value and the actual inner puzzle program.

### Inner Puzzle: Time-Lock Logic

Next, we create the inner puzzle. This inner puzzle will ensure that the coin cannot be spent until a certain number of blocks have passed since it was created. We can use the condition opcode `ASSERT_HEIGHT_RELATIVE` for this (which requires that the current block height is at least a given amount higher than the coin’s creation block). Our inner puzzle will take one parameter `REQUIRED_BLOCKS` (the number of blocks to wait) and a list of `conditions` that the spender wants to assert once the time lock has passed:

```chialisp
(mod (REQUIRED_BLOCKS conditions)
    (include condition_codes.clib)
    ; Prepend an ASSERT_HEIGHT_RELATIVE condition, then return all spender-provided conditions
    (c (list ASSERT_HEIGHT_RELATIVE REQUIRED_BLOCKS)
       conditions
    )
)
```

This inner puzzle is straightforward: it outputs an `ASSERT_HEIGHT_RELATIVE` condition with the required block count, followed by whatever other `conditions` were provided. For example, the spender might include a `CREATE_COIN` condition in the `conditions` list to pay someone once the coin is spendable. By itself, this puzzle would be **insecure** – anyone could provide any `conditions` and spend the coin after the time lock, since there’s no signature check on its own. However, when we wrap it inside the outer puzzle above, the signature requirement in the outer layer will secure it so that only the holder of the correct key can authorize the spend (preventing unauthorized spends even after the time lock expires).

Like before, `REQUIRED_BLOCKS` is in caps to indicate it should be curried in. We will bind a specific number (say `20` blocks) as the required delay.

### Currying the Inner Puzzle into the Outer Puzzle

Now that we have the two puzzle code modules, we need to combine them for use. Here are the steps to create a coin with these puzzles:

1. **Compile and Curry the Inner Puzzle:** We first compile the inner puzzle and curry in the `REQUIRED_BLOCKS` constant. For example, using Chia Dev Tools CLI:

   ```bash
   cdv clsp curry inner-puzzle.clsp -a 20
   ```

   This compiles `inner-puzzle.clsp` and binds the value `20` to `REQUIRED_BLOCKS`. The output will be the CLVM representation of the curried inner puzzle (a serialized form, often given as a parenthesized list or hex blob). For instance, the compiled curried puzzle might look like:

   ```clvm
   (a (q 2 (q 4 (c 2 (c 5 ())) 11) (c (q . 82) 1)) (c (q . 20) 1))
   ```

   Don’t worry about the exact form – it’s the low-level CLVM. The key point is we now have an object representing “inner puzzle with 20-block delay” (let’s call this `CompiledInnerPuzzle`).

2. **Curry the Outer Puzzle with the Public Key and Inner Puzzle:** Next, we curry the outer puzzle with two arguments: our chosen public key and the compiled inner puzzle from the previous step. For example:

   ```bash
   cdv clsp curry outer-puzzle.clsp \
       -a 0x<YourPublicKey> \
       -a "<CompiledInnerPuzzle>"
   ```

   Here we provide the public key (as a hex value prefixed with `0x`) and the compiled inner puzzle (as the literal program output in quotes) as arguments. This produces the full **combined puzzle** CLVM for the coin. The result will be a rather complex S-expression representing the outer puzzle with both the `PUBLIC_KEY` and `INNER_PUZZLE` curried in. This is the final puzzle that will control the coin. It’s essentially the outer puzzle code, with those placeholders replaced by actual values.

3. **Calculate Puzzle Hash and Create the Coin:** From the combined puzzle, we compute its **puzzle hash**. In practice, you can use `cdv clsp treehash` or `opc -H` to get the puzzle hash from the compiled puzzle code. Suppose this yields a hash `e4fd576c99d4cb789a21b3...e3c5` (a 32-byte value). We then encode this puzzle hash into a Chia address (e.g. testnet addresses start with `txch`, mainnet with `xch`). For instance:

   ```bash
   cdv encode -p txch e4fd576c99d4cb789a21b3173d18e916c37634720c9ecd9d25f615d24bd1e3c5
   ```

   This gives an address like `txch1...` which corresponds to our curried puzzle. By sending coins to this address (e.g. using `chia wallet send` with the address), we create a new coin on the blockchain whose puzzle is our combined outer+inner puzzle.

4. **Spending the Coin:** To spend this coin, the spender must provide a solution that satisfies both layers. The **solution** will have to include the `inner_solution` for the inner puzzle, which itself may be a list of conditions. In our example, the inner puzzle expects `conditions` as its lone argument (since `REQUIRED_BLOCKS` was curried). So the `inner_solution` (from the outer puzzle’s perspective) is actually the list of conditions for the inner puzzle. If, for example, we want to simply send the value to another address after 20 blocks, our inner solution might be a list with a single `CREATE_COIN` condition. In CLVM solution format, that could look like:

   ```lisp
   ((((51 0x<dest_puzzle_hash> <amount>))))  
   ```

   The multiple parentheses are important – each layer of puzzle and each condition adds an extra list nesting. In this example, the outer puzzle expects one argument `(inner_solution)`, which contains the inner puzzle’s one argument `(conditions)`, which is a list of one condition `(51 ... )`. Thus it ends up nested four layers deep. (Generally, the structure is: `((( (conditions...) )))`. It can be tricky!) The Chia documentation warns that you may need **extra parentheses** in solutions for inner puzzles: each nested puzzle and each condition list introduces another level of parentheses. A common pitfall is not wrapping the solution properly, leading to solution mismatch errors.

   When attempting to spend, the outer puzzle will enforce that a valid signature (from the curried `PUBLIC_KEY`) covers the hash of the inner solution. This means before finalizing the spend, you must sign the message (which is `sha256tree(inner_solution)` combined with the coin’s ID and the Chia genesis challenge, as required by `AGG_SIG_ME`). The Chia Dev Tools or `chia` CLI can be used to hash the solution and produce the signature with your private key. That signature is then provided along with the solution. If everything is done correctly, the spend will be accepted only if:

   * At least 20 blocks have elapsed (inner puzzle’s `ASSERT_HEIGHT_RELATIVE` condition passes).
   * The solution’s signature is valid for your `PUBLIC_KEY` (outer puzzle’s `AGG_SIG_ME` condition passes).
   * Any additional conditions (like the `CREATE_COIN`) are satisfied.

When the coin is spent successfully, the inner puzzle’s conditions (e.g. creating a new coin at the destination address) take effect, and the outer puzzle’s conditions ensure the spend was authorized and respecting the time lock. If you try to spend too early (before 20 blocks), the inner puzzle’s condition fails and the spend is invalid. If you don’t provide a correct signature, the outer puzzle’s condition fails. Thus, both layers work in tandem to enforce the coin’s rules.

## Use Cases and Design Patterns for Inner Puzzles

Inner puzzles are a fundamental pattern in Chia smart coins, enabling modular and reusable designs. Some common use cases and design patterns include:

* **Chia Asset Tokens (CATs):** CATs use an outer puzzle (the CAT puzzle) that ensures the coin’s **amount** of a specific token type remains constant through transactions (preventing token creation or destruction outside of authorized issuance). This CAT outer puzzle allows an arbitrary **inner puzzle** that controls the coin’s ownership and spending rules. Typically, the inner puzzle is just the standard Chia **transaction puzzle** (so that CATs can be spent like normal coins, with standard conditions). The CAT outer layer wraps around the inner puzzle for every spend, enforcing the supply rules while the inner puzzle handles who to pay, etc..

* **Singletons:** A **singleton** is a coin design that ensures there is only ever one “active” coin at a time for a given unique identity. Singletons are implemented as an outer puzzle (the singleton top-layer puzzle) that expects exactly one **odd-numbered coin** to be created when it is spent (this odd amount output is the new singleton) and wraps the same singleton puzzle around it. The singleton puzzle can take an arbitrary inner puzzle to represent the coin’s actual payload logic. This pattern is used for NFTs and DIDs: the singleton layer guarantees uniqueness (and tracks lineage via a **lineage proof**), while the inner puzzle can be specific to the application (e.g. an NFT or identity logic). In essence, the singleton outer puzzle morphs certain conditions (like adjusting the `CREATE_COIN` condition to ensure the new coin stays in the singleton structure) and otherwise delegates to the inner puzzle.

* **Non-fungible Tokens (NFTs):** Chia NFTs are built with **multiple puzzle layers**. They use a singleton as the base (ensuring uniqueness of the token coin) and then have additional layers for NFT-specific functionality. For example, Chia’s NFT standard has an **NFT state layer** (outermost) and an **NFT ownership layer**, each of which treats the next layer as its inner puzzle. The innermost puzzle might be a standard or delegated spend puzzle controlled by the current owner. The state layer handles metadata updates and certain condition filtering, the ownership layer handles transfer conditions (like enforcing an ownership change or royalties), and the final inner puzzle could allow normal spending or custody transfer. Each layer is curried with the puzzle of the layer below it (e.g. ownership layer is curried with the user’s puzzle). This composition allows NFTs to have complex behavior (like updatable metadata, owner verification, etc.) all modularly separated into inner puzzles.

* **Decentralized Identifiers (DIDs):** DIDs in Chia also rely on inner puzzles. A DID coin is implemented as a singleton (outer layer) that wraps a **DID inner puzzle**. The DID inner puzzle contains logic for recovering the DID (allowing a set of “recovery” DIDs to approve a change of the inner puzzle in case the main key is lost) and for normal spending with the owner’s key. The inner puzzle in a DID may itself allow a standard spend (in a certain mode) or initiate a recovery process depending on the provided solution mode. Thus, the DID is another case of a singleton outer puzzle with a specialized inner puzzle.

* **Standard Custody with Delegated Puzzle:** Even the **standard Chia wallet puzzle** (the one controlling normal coins in your wallet) uses a concept akin to an inner puzzle. The standard puzzle (often called `p2_delegated_puzzle_or_hidden_puzzle`) requires a signature from your key on a provided **delegated puzzle** (plus some conditions), and then it `eval`s that delegated puzzle. In effect, the wallet allows you to provide an “inner puzzle” (delegated logic) with each spend, as long as it’s signed. This isn’t curried at coin creation (it’s passed in via the solution each time), but conceptually it’s the same idea: the outer portion verifies the signature and the inner portion (delegated puzzle) generates conditions like payments. This pattern allows you to create coins that can do complex things (like atomic swaps or multi-sig) by injecting custom puzzles at spend time, all secured by a signature. It’s another demonstration of how Chia separates an **authentication layer** (outer signature check) from the **spending logic layer** (inner puzzle).

* **Composable “Vault” or “Wrapper” Coins:** Developers can design their own outer puzzles to act as vaults or controllers for inner puzzles. For instance, you might have an outer puzzle that requires multiple signatures (multi-sig) or checks an oracle value, and only if those conditions pass does it run the inner puzzle (which could be a spend to a new address). By mixing and matching layers, one could create coins that, say, require an oracle approval (outer) and a user signature (inner) to spend, or coins that enforce a certain spending **pattern** on the inner puzzle’s outputs (like restricting where value can go). Chia’s flexible coin model encourages these layered designs as they remain **compatible** with the blockchain’s condition system. The outer puzzle simply wraps additional constraints around the inner puzzle’s behavior.

## Best Practices for Using Inner Puzzles

When developing and working with inner puzzles in Chialisp, keep the following best practices in mind:

* **Follow Currying Conventions:** Define puzzle parameters that will be curried in (like public keys, puzzle hashes, inner puzzles, constants) in uppercase (SCREAMING\_SNAKE\_CASE) to signal their purpose. This makes the puzzle interface clear: anyone using your puzzle knows they must bind those values before creating a coin or during coin creation.

* **Test the Combined Puzzle Thoroughly:** Because an inner+outer puzzle combination is more complex, test different scenarios to ensure the layers interact as expected. Check that the outer puzzle correctly enforces its rules (e.g. signature, time-lock) and doesn’t inadvertently allow the inner puzzle to bypass them. Also ensure that the inner puzzle’s conditions are all either allowed or intentionally filtered by the outer puzzle if necessary (e.g. the singleton outer puzzle explicitly checks and morphs `CREATE_COIN` conditions from the inner puzzle to maintain uniqueness).

* **Use Standard Libraries for Hashing and Currying:** Chialisp provides library support (in files like `curry-and-treehash.clinc`) for operations like computing puzzle hashes of curried puzzles. Use these instead of manually constructing hashes. For example, the function `puzzle-hash-of-curried-function` is used in many advanced puzzles to compute the puzzle hash of an outer puzzle with a given inner puzzle hash. This helps if your outer puzzle needs to refer to the inner puzzle’s hash (commonly done in announcements or proofs of lineage).

* **Keep Solutions Well-Structured:** Pay extra attention to how you structure the solution (arguments) when spending nested puzzles. Each layer of puzzle expects its arguments in a certain list format. As a rule of thumb, if your outer puzzle has one argument which itself is a list intended for the inner puzzle, you will need an additional set of parentheses. Likewise, if the inner puzzle expects a list of conditions, those conditions are enclosed in another layer of parentheses, and each condition is a list. This can result in deep nesting. It’s often helpful to construct the solution step by step or use the `opd`/`opc` (disassemble/assemble) tools to verify the structure. If you see errors like “argument length mismatch” or unintelligible fails, it could be a mis-parenthesized solution.

* **Optimize If Needed:** Each layer of puzzle adds some overhead in conditions and bytecode size. Generally, two-layer puzzles (an outer and an inner) are very common and efficient on Chia. But if you find yourself nesting many layers, be mindful of the CLVM cost and the on-chain size of the puzzle reveal. Chialisp is quite efficient, but unnecessary layers or conditions can add up. Use the CLVM cost simulator to ensure your puzzle can be executed within limits, and consider **tail watering** (removing no-op conditions or combining layers) if appropriate. However, do not compromise the clarity and security of layered logic just to save minor cost – clarity helps avoid bugs.

* **Security First:** Outer puzzles should *strictly enforce* the constraints they are designed for. If your outer puzzle is meant to restrict something (like preventing value from being stolen or enforcing a timeout), double-check that nothing from the inner puzzle’s result can override or circumvent those checks. Use assertions in the outer layer liberally (e.g. assert certain announcements, puzzle hashes, or conditions) to pin down the behavior. Conversely, ensure the inner puzzle cannot accidentally violate the outer puzzle’s expectations – for example, if the outer puzzle assumes the inner will create a specific coin, the inner puzzle should be written to do so (or the outer should verify it explicitly). Many bugs can be avoided by thinking through the “worst-case” inner puzzle a malicious actor might insert and ensuring the outer puzzle would still prevent any forbidden outcome.

## Common Pitfalls with Inner Puzzles

Working with inner puzzles introduces some complexity. Here are common pitfalls and how to avoid them:

* **Incorrect Solution Formatting:** As mentioned, forgetting the proper nesting of parentheses in the solution is a frequent mistake. If the outer puzzle expects a single `inner_solution` argument, you must wrap the inner solution in one extra pair of parentheses when providing it. If the inner solution itself contains a list (like conditions), that adds another level. For example, a simple solution for an inner puzzle might require something like `(((<conditions>)))` rather than just `(<conditions>)`. If in doubt, refer to the puzzle’s `(mod (PARAM1 PARAM2 ... ) ...)` signature and remember that when you curry in values, those params are no longer in the solution. Only the remaining non-curried parameters expect inputs in the solution. This can be counter-intuitive, but it’s essential for the spend to succeed.

* **Not Currying When Required:** If a puzzle is designed to have an inner puzzle, you **must** curry that inner puzzle (and any required constants) before using the puzzle hash to create a coin. If you neglect to curry (for example, you use the outer puzzle’s hash without an inner puzzle), the coin would be created with an incomplete puzzle. You wouldn’t be able to spend it because the puzzle would be expecting an inner puzzle argument that was never provided. Always use the proper currying process (or wallet API that does it) to instantiate the puzzle. The Chia wallet and CLI will typically handle this if you’re using standard templates (like CATs or NFTs), but for custom puzzles, it’s on the developer to do so.

* **Using the Wrong Public Key or Message for `AGG_SIG_ME`:** When requiring signatures in an outer puzzle, ensure you use the correct **public key** and sign the correct **message**. `AGG_SIG_ME` in Chialisp includes the coin ID and genesis challenge in the message hash, meaning you must gather those pieces. For testing, a common mistake is to use `AGG_SIG_UNSAFE` (which doesn’t include coin ID or genesis challenge) in the puzzle but then try to sign with the full message (or vice versa). Stick with `AGG_SIG_ME` for coin spends and use the standard method: hash the solution (inner puzzle’s solution tree hash), concatenate coin ID and genesis challenge, and then sign. The documentation’s example demonstrates concatenating these values and signing via the CLI. If the signature check fails, the spend fails – so it’s critical to get it right.

* **Assuming Inner Puzzle Always Runs:** If the outer puzzle has an assertion or condition that fails before calling the inner puzzle, the inner puzzle won’t execute at all. For instance, if your outer puzzle asserts something about the coin’s environment (like an announcement or a block height) and that condition is false, it might never call `(a INNER_PUZZLE inner_solution)`. This isn’t exactly a pitfall – it’s by design – but be aware when debugging that an inner puzzle may not even run if the outer puzzle short-circuits (by failing an `assert` or condition earlier). Structure your outer puzzle so that any critical outer checks occur either before or after the inner puzzle call as needed. The order of operations can matter.

* **Complex Error Traces:** When something goes wrong in a nested puzzle spend, the error messages or failure trace can be hard to decipher (they’re often low-level CLVM errors referencing operator numbers, etc.). A good tactic is to test each puzzle in isolation first: for example, test the inner puzzle by itself with a dummy solution to see if it produces the expected conditions. Then test the outer puzzle by substituting a very simple inner puzzle (maybe one that just returns a fixed condition) to verify the outer logic. Once both are verified, combine them. Using `brun` and `opc`/`opd` tools step by step can isolate where an error is occurring. Additionally, the Chialisp debugger (in Chia Dev Tools) can step through the execution of nested puzzles, which is invaluable for non-trivial cases.

## Integration with the Chia Coin Model and Conditions

Inner puzzles demonstrate the flexibility of Chia’s **coin set model**. By allowing puzzles to call other puzzles, Chia enables layered smart coins where each layer contributes conditions to the spend. This is complementary to Chia’s condition-based approach: rather than monolithic contracts, you can have small puzzle modules that each focus on one aspect (signatures, time-locks, identity, asset accounting, etc.), and then compose them.

Some points to note about how inner puzzles integrate with Chia’s design:

* **All coins are smart coins:** As noted earlier, every coin runs a puzzle and thus is a “smart coin”, even if that puzzle is just “require signature X”. Inner puzzles simply make coins smarter by combining functionalities. The outer puzzle doesn’t “know” the specifics of the inner puzzle’s code – it just sees the conditions output. This decoupling means you can plug in any inner puzzle, and as long as its conditions satisfy the outer puzzle’s rules, the spend is valid. The blockchain only ever sees the final list of conditions and that they all hold true.

* **Standard conditions still apply:** Inner puzzles produce the same types of conditions (CREATE\_COIN, AGG\_SIG, ASSERT\_HEIGHT\_RELATIVE, etc.) as any puzzle. The outer puzzle can prepend its own conditions or modify the inner ones, but ultimately a coin spend boils down to one combined condition list that gets processed. For example, in our time-locked coin scenario, the final conditions list might include one `AGG_SIG_ME` (from outer) and one `ASSERT_HEIGHT_RELATIVE` and one `CREATE_COIN` (from inner), all of which must be satisfied for the spend to succeed. If any condition in the combined list fails, the spend fails atomically.

* **Announcements and information passing:** Outer and inner puzzles can communicate via the solution or via on-chain announcements. A pattern you’ll see in advanced puzzles (like singleton or NFT layers) is **announcement usage** to ensure that the inner puzzle’s identity or intentions are carried on. For instance, the singleton outer puzzle uses a **puzzle announcement** to commit to the inner puzzle’s hash, ensuring that the newly created singleton child coin indeed has the expected inner puzzle curried in. This way, the outer puzzle enforces that the inner puzzle for the next generation coin remains in the correct form. Similarly, multiple layers may use announcements with different prefixes to avoid conflicts (the CAT puzzle uses announcements with certain prefixes to ensure that only coins of the same CAT type interoperate, labeling inner vs. outer announcements distinctly).

* **Wallet support and discovery:** The official Chia wallet is built to recognize coins with inner puzzles of known types. It does this by uncurrying the puzzle reveal and matching the outer puzzle’s hash or structure to known templates (like CAT v2, DID, NFT, etc.). If you create custom inner/outer puzzles, the wallet might see them as “unknown” type coins (you may need to manage them manually with CLI or custom software). However, the Chia ecosystem also provides libraries (in Python `chia-blockchain`, Rust `chia-rs`, and TypeScript `chia-wallet-lib`) with utilities for puzzle encapsulation. For example, the wallet library might have functions to wrap an inner puzzle into a CAT or singleton outer puzzle and vice versa. When designing new puzzle types, consider providing similar tooling so others can easily use your inner puzzle patterns.

* **Composability and future innovation:** Inner puzzles are a key reason Chia’s smart coin system is so flexible. New features can often be implemented as an outer puzzle that wraps existing coins. For instance, if in the future someone invents a “vault puzzle” for added security, you could take an existing CAT or NFT and curry it inside the vault outer puzzle, and you’d have a vault-protected CAT/NFT without altering the inner logic. This is powerful – it encourages a **LEGO-like** approach to smart contracts. Indeed, Chia’s approach is sometimes compared to **functional programming** composition: each puzzle is like a function that returns conditions, and you can compose functions to get combined behavior.

Finally, inner puzzles illustrate a broader philosophy of Chialisp: *explicit conditions over implicit logic*. Instead of a single complex program that does everything, you can layer simple programs. Each layer’s output (conditions) becomes the input for enforcement by the next layer. This leads to clarity in what each layer is responsible for, and it aligns with how the blockchain processes spending rules. By mastering inner puzzles, you unlock the ability to create highly customizable and secure coins on the Chia network.

**References & Further Reading:**

* Chia Network’s official documentation on inner puzzles (Chia Docs and Chialisp guides) provides the foundational examples expanded here. It’s recommended to read the “Currying” and “Inner Puzzles” guides together for a deeper understanding.
* The CATs, NFTs, DIDs, and singletons sections of the Chialisp documentation offer real-world puzzle code and explanations for those specific inner/outer puzzle architectures. Reviewing those can solidify how inner puzzles are used in practice (and you can find the full source code of those puzzles on Chia’s GitHub).
* For community discussions and help, consider joining the Chia developer channels (Discord or forums). The Chialisp dev community often shares patterns and can help review inner puzzle logic for security. Inner puzzles involve nuances that benefit from peer review, especially for new complex compositions.
* Lastly, as you experiment, use the Chia developer tools (`cdv` command-line, puzzle debugger, etc.) heavily – they can curry, uncurry, tree-hash, and even simulate spends, which are invaluable for getting inner puzzles right.

By following this guide and the references, you should be well-equipped to leverage inner puzzles to build advanced Chialisp smart coins that are both robust and flexible. Happy coding in Chialisp’s puzzle land!
