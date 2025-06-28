Great, I’ll put together a comprehensive tutorial-style guide on CAT2 tokens in Chialisp. This will cover everything from a developer’s perspective, including how CATs are stored, transferred, and controlled using Chialisp puzzles, with breakdowns of TALKS (TAILs), outer puzzle logic, and example code. I’ll let you know once it’s ready.


# Understanding Chia Asset Tokens (CATs) in Chialisp

## Overview of CATs in Chia

Chia Asset Tokens (CATs) are Chia's on-chain **fungible tokens** that behave similarly to XCH (Chia's native coin) but are defined by smart coin puzzles. Each CAT coin is an ordinary Chia coin at the blockchain level (with a certain mojo amount) that runs a special **CAT puzzle** program. This CAT puzzle **ensures that the supply of that token cannot change** (no tokens are created or destroyed) unless specific issuance rules are followed via an attached TAIL program. In essence, the CAT puzzle performs for the token what Chia's consensus does for XCH – it prevents unauthorized minting or melting of tokens.

**CAT2 Standard:** The current CAT standard (CAT2) was introduced in mid-2022 after a vulnerability was discovered in the original CAT1 design. CAT2 improved the security of CATs by requiring stricter coordination between coins and fixing the vulnerability. All CAT1 tokens were deprecated and replaced by CAT2 tokens of equal value in a one-time snapshot and airdrop process. Today, when we discuss CATs, we refer to the CAT2 behavior and puzzle design.

**Value Representation:** Like XCH, CAT amounts are measured in mojos (the smallest unit of XCH). By convention, **1 CAT is defined as 1000 mojos** on-chain. This fixed ratio is used by the Chia wallet for all CATs. (While it's technically possible to choose a different ratio, doing so is strongly discouraged and not supported by standard wallets.)

## CAT Puzzle Architecture (Outer vs. Inner Puzzle)

Every CAT coin’s puzzle is composed of two layers:

* **Outer CAT Puzzle:** the CAT smart contract (written in Chialisp/CLVM) that enforces the token rules (supply conservation, correct asset type). This outer puzzle is parameterized by the specific token’s identifier.
* **Inner Puzzle:** an arbitrary puzzle (often a standard Chia "pay to public key" puzzle or any custom logic) that controls **ownership or spending conditions** for the coin, just like a normal XCH coin's puzzle would. This is sometimes called the *custody puzzle* or inner puzzle.

When a CAT coin is created, its puzzle hash is actually a **combination of the CAT outer puzzle (with the token’s ID) and the chosen inner puzzle’s hash**. The CAT puzzle is *curried* (parameterized) with:

* The CAT puzzle’s own code hash (for integrity),
* The unique **token ID** (which is typically the hash of the TAIL program that defines the token’s issuance rules), and
* The inner puzzle program or its hash.

This means the **token ID (TAIL hash) is baked into the coin’s puzzle**, distinguishing it from other CATs. The result is that the coin’s puzzle hash uniquely identifies it as a coin of that specific CAT type and also encodes the inner puzzle’s identity.

**How the layers work:** In a spend, the **outer CAT puzzle will call the inner puzzle** to get the list of requested spending conditions, then enforce additional rules on those conditions before allowing the spend. The inner puzzle is unaware that it’s inside a CAT – it might simply be asserting “require a signature and then create these output coins.” The outer puzzle **wraps those outputs and adds enforcement** so that the outputs remain the same CAT and no supply rules are broken. In effect, the inner puzzle handles “who can spend this coin and how to distribute it,” while the outer puzzle handles “make sure this spend obeys the token’s global rules.”

## Key Rules Enforced by the CAT2 Puzzle

The CAT2 puzzle has several critical design rules to maintain token integrity and prevent unauthorized creation or destruction of tokens. From a developer’s perspective, these rules are baked into the outer puzzle logic:

* **Child Outputs Remain the Same CAT:** If the inner puzzle tries to create new coins, the CAT outer layer will intercept each `CREATE_COIN` condition and **replace the puzzle hash** of the new coin with a CAT puzzle hash carrying the **same TAIL (asset ID)** as the current coin. This ensures that a CAT coin cannot "escape" its token type – it can only create new coins of the **same CAT**. In other words, you cannot implicitly melt a CAT into XCH or another asset by creating a coin with a non-CAT puzzle; the CAT wrapper will always wrap the output in the same CAT puzzle.

* **No Net New Tokens (Unless TAIL Invoked):** In a normal spend (where no special issuance logic is triggered), the **total CAT amount output must equal the total amount spent**. The CAT outer puzzle sums up all the amounts in `CREATE_COIN` conditions and compares it to the input coin(s) amount. It enforces that **the outputs sum to the inputs** (no more, no less) whenever the TAIL is not revealed. This rule means you cannot accidentally or maliciously create new CAT tokens or destroy tokens; everything you spend must be accounted for in the outputs (aside from transaction fees paid in XCH). The CAT puzzle essentially acts as a conservation law for the token.

* **Lineage Validation (Same-Type Parent or Authorized Issuance):** Every CAT coin, when spent, **validates its lineage** to ensure it came from a parent coin of the same CAT type. In CAT2, the puzzle uses an `ASSERT_MY_ID` or similar mechanism with the parent info to check that the parent coin was also a CAT of the same TAIL (asset ID). This prevents someone from forging a CAT coin out of a normal XCH coin without permission. If a coin’s parent was not a CAT of the same type, the only way that coin can be valid is if a **TAIL issuance program was explicitly invoked** to allow it (more on TAILs below). In practice, this means new CAT coins can only be born from existing ones, unless the defined issuance process is followed.

* **Announcements with Unique Prefix (Coordination Mechanism):** The CAT puzzle uses **coin announcements** to coordinate between multiple CAT coins being spent at once. It prepends a special prefix byte (0xCB) to any coin announcements made at the CAT layer. This ensures that CAT-level announcements exist in a separate namespace and **cannot be mimicked or interfered with by inner puzzles’ announcements**. (Inner puzzles can also create announcements for their own logic, but those will use a different prefix 0xCA or no prefix, so they won't satisfy the CAT puzzle’s assertions.) This design prevents an inner puzzle from tricking the CAT mechanism by faking the signals used for token accounting.

* **Precomputed "Truths" for TAIL:** If an issuance (mint or burn) is happening, the CAT puzzle provides the TAIL program with a structured set of precomputed values called **Truths**. These include things like the coin’s identity, parent info, asset ID, and the conditions from the inner puzzle, all bundled and passed into the TAIL when it executes. This spares the TAIL program from re-deriving those values and ensures it operates on verified data. (As a developer, you typically don’t need to compute these manually – the CAT puzzle does it for you and passes it into your TAIL.)

All of the above rules work together to ensure that **a CAT’s specified token protocol is followed in every transaction**. Next, we’ll see how these rules play out during a spend.

## The CAT2 Spending Process: Ensuring No Tokens Are Lost or Gained

When you spend CAT coins, the CAT2 puzzle employs a clever mechanism to enforce the “no net creation or destruction” rule across potentially multiple coins. In Chia’s coin-set model, you could be spending one or several coins of the same CAT in one transaction (for example, combining two 5-CAT coins to send 8 CAT somewhere and get 2 CAT in change). CAT2 uses a **ring of coin announcements** to link all CAT coins of the same type that are spent in the transaction, making sure their inputs and outputs balance out to zero net change.

Here's how it works in simple terms:

1. **Delta Calculation:** Each CAT coin being spent computes its own **Δ (delta)**, defined as the total value of its output coins minus its input amount. If a coin creates less value than it had, its delta is negative; if it creates more, its delta is positive. For a normal token transfer, some coins might send out less than they received (delta < 0) while others send out more (delta > 0), but across all coins of the same type in the transaction, these deltas must sum to zero.
2. **Announcing Partial Sums:** The spent CAT coins are conceptually arranged in a circle (ring). Each coin makes a **coin announcement** containing two pieces of information: the ID of the previous coin in the ring and the sum of all deltas *before* this coin (the running total up to this point). For the first coin in the ring, “sum of deltas before me” is 0; for subsequent coins, it’s the sum of deltas of all earlier coins in the ring. This announcement is basically the coin shouting out, “The total delta up to me (not including mine) is X, and I heard it from my predecessor coin Y.”
3. **Asserting the Next Coin’s Announcement:** Each coin also adds a condition to **assert an announcement from the next coin**. Specifically, coin *K* will `ASSERT_COIN_ANNOUNCEMENT` that ensures coin *K+1* (the next in the ring) has published an announcement matching what *K* expects: it checks that the next coin’s announcement hash equals `sha256(next_coin_id || my_coin_id || sum_of_deltas_up_to_including_me)`. In simpler terms, coin *K* demands proof that coin *K+1* saw *K*’s ID and included *K*’s delta in the running sum. This links their calculations.
4. **Closing the Ring:** The last coin in the ring will assert the announcement of the first coin, thereby closing the loop. Because of the way these announcements are constructed, the only way the loop can close consistently is if the **total sum of all deltas is zero**. If there was any net creation (positive sum) or destruction (negative sum) of tokens among the group of coins, the hashes in the announcements would not match up and one of the `ASSERT_COIN_ANNOUNCEMENT` conditions would fail, invalidating the spend. As long as the ring is unbroken and all coins agree on the sums, we have a proof that no extra tokens were minted or destroyed in the transaction.

This ring mechanism is the heart of CAT2’s security. It ensures that *even if multiple CAT coins are spent*, the system enforces conservation of the token amount. Developers typically do not have to manually create these announcements – the CAT puzzle handles it automatically when you construct a spend bundle for CATs (for example, the Chia wallet will do this under the hood). However, it’s important to understand that this is happening, as it’s how CAT maintains integrity: **all CAT inputs “talk” to each other and verify the math.**

## Example: Sending CAT Tokens (Splitting a Coin)

To solidify the concept, let's walk through a simple example. Suppose Alice has a single CAT2 coin worth 10 CAT, and she wants to send 3 CAT to Bob while keeping 7 CAT as change to herself. Here’s what happens in the spend:

1. **Initial State:** Alice has a CAT coin (let’s call it Coin A) of amount 10 CAT. This coin’s puzzle is the CAT outer puzzle (with the specific token’s TAIL hash) wrapping Alice’s inner puzzle (e.g. a puzzle that requires Alice’s signature). Bob has provided Alice with a puzzle hash for receiving the CAT (for example, Bob’s own CAT address or puzzle hash).
2. **Alice Creates a Spend:** Using her wallet, Alice creates a spend bundle for Coin A. She provides the **solution to the inner puzzle** (likely this includes a signature from her private key, satisfying the inner puzzle’s condition). The inner puzzle, once unlocked, can specify new coins to create. Alice’s inner puzzle will list two `CREATE_COIN` conditions:

   * One for Bob: `CREATE_COIN BobPuzzleHash 3000` (3000 mojos, which is 3 CAT since 1 CAT = 1000 mojos).
   * One for herself (change): `CREATE_COIN AliceChangePuzzleHash 7000` (7000 mojos = 7 CAT).
     These amounts sum to 10000 mojos, which equals the input coin’s 10000 mojos (10 CAT), not counting any transaction fees. At this point, these conditions are just what the **inner puzzle** wants to do.
3. **CAT Outer Puzzle Processing:** Now the CAT outer puzzle on Coin A takes over. It examines the inner puzzle’s conditions:

   * It sees the two `CREATE_COIN` conditions. For each, the CAT puzzle **morphs** the condition by wrapping the new coin’s puzzle hash with the CAT logic for the same asset. In other words, the puzzle hashes `BobPuzzleHash` and `AliceChangePuzzleHash` are each transformed into a **CAT puzzle hash** that includes the same TAIL (token ID) and, respectively, Bob’s inner puzzle and Alice’s change inner puzzle. This means the outputs will themselves be CAT coins of the same type. Bob’s coin will be a CAT (with 3 CAT), and Alice’s change will also be a CAT coin (7 CAT) controlled by her change puzzle. The inner puzzle’s requests are thereby “wrapped” in the CAT layer.
   * The CAT puzzle also notes the sum of the output amounts: 3000 + 7000 = 10000 mojos. It compares this to the input (10000) and sees that **no TAIL was invoked** (Alice didn’t try to mint or burn tokens, just transfer), so it expects net 0 change. 10000 out = 10000 in, so this passes the no net creation check.
   * The puzzle then prepares the **announcement ring**. In this case, only one CAT coin (Coin A) is being spent in this transaction. A single coin can form a trivial ring by considering itself as both “previous” and “next.” Coin A will create a coin announcement with the previous coin ID (itself, in this one-coin scenario) and the sum of deltas before it (0, since it’s first). It will also assert its own announcement as the "next" coin’s announcement, expecting to see hash that includes its ID and the sum including itself (which is also 0 net, since its delta is 0 – it created exactly the amount it had). This self-referential ring essentially ensures that the delta (0) is consistent. If Alice had been spending multiple CAT coins, each would participate in the ring as described earlier; with one coin, the ring check reduces to a sanity check on a single coin’s delta.
4. **Spend Execution:** All conditions (both from the inner puzzle and added by the CAT outer puzzle) are now assembled. Alice signs the spend (if not already done via the inner puzzle signature). The spend bundle is submitted to the network.
5. **Result:** The blockchain validates the spend. The CAT outer puzzle’s conditions guarantee that 10 CAT in turned into 10 CAT out. Bob receives a new coin worth 3 CAT (with a CAT puzzle/outer layer corresponding to this token and inner puzzle hash matching Bob’s provided address), and Alice gets a new coin worth 7 CAT back under her control. **No new CAT were created or destroyed** in the process – the supply remains consistent, and the token has simply changed hands.

From a development perspective, notice that Alice did not have to manually enforce any of the CAT rules; she simply created outputs summing to the input. The **CAT module took care of wrapping the outputs and adding the necessary announcements** to enforce the rules. If she had tried to output a total different from 10 CAT (say, accidentally 10.5 CAT or only 9.5 CAT), the spend would fail because the ring conditions would not balance to zero.

## Token Issuance and TAIL Programs (Minting or Melting CATs)

Thus far, we’ve discussed normal CAT transfers where the total token amount remains constant. Now we’ll cover how new CAT tokens can be **issued (minted)** or destroyed (**burned**, a.k.a “melted”) according to rules defined by the token’s issuer. This is where the TAIL comes into play.

**What is a TAIL?** TAIL stands for **Token and Asset Issuance Limitation** program. It is a separate Chialisp puzzle that defines the **minting and burning policy** for the CAT. The TAIL is basically the “rules of issuance” that are specific to that token. For example, a token issuer might want a limited one-time supply, or the ability to mint new tokens under certain conditions, or allow users to redeem tokens for XCH. The logic for these rules lives in the TAIL program. The **hash of the TAIL program is used as the CAT’s identifier (Asset ID)** and is curried into the CAT outer puzzle, so every coin of that CAT knows which issuance rules it is bound by.

**How to invoke the TAIL (the magic spend):** Under normal operation, the TAIL code does not run at all – the CAT puzzle just enforces that nothing changes. To change the supply, the spender must *explicitly invoke the TAIL* in the transaction. This is done by creating a **magic `CREATE_COIN` condition** with a special amount of `-113` mojos. This is a sentinel value that would never appear in a normal spend (coins can’t have negative amounts), so the CAT puzzle recognizes it as a signal. The magic `CREATE_COIN` condition provides two extra fields: the TAIL puzzle (revealed on-chain as part of the spend) and an argument list (solution) for the TAIL. In CLVM assembly form, it looks like:

```clojure
;(code in an inner puzzle's conditions list)
CREATE_COIN 0 -113 <TAIL_PUZZLE_PROGRAM> <TAIL_SOLUTION>
```

Here `51` is the opcode for `CREATE_COIN`, the puzzle hash is given as `0` (which is ignored in this context), and `-113` is the magic amount that triggers the CAT outer puzzle to run the TAIL. When the CAT puzzle sees this, it does *not* literally try to create a coin of -113 mojos (that would be invalid); instead, it interprets this as “we are requesting to run the TAIL code now.”

**TAIL execution and extra delta:** When the TAIL is triggered, the CAT outer puzzle hands over control to the TAIL program (as a subroutine) and passes in a bunch of information (the “Truths” and other parameters) including:

* A flag indicating whether the parent was a CAT of the same type (`parent_is_cat`),
* A lineage proof if needed (details about the parent coin, used if this is a genesis issuance from XCH),
* The **requested extra delta** value, which is how much the outputs differ from the inputs (i.e. how many tokens are being minted if positive, or burned if negative),
* The list of inner puzzle conditions,
* Any additional data provided in the TAIL solution.

The TAIL program then decides whether this issuance or burn is allowed under its rules. **If the TAIL program returns without error (i.e., it approves), the CAT outer puzzle will allow an “extra delta” to be added to the token supply**. In practice, this means the usual ring sum of deltas no longer needs to be zero; it can equal the allowed extra delta (and that extra delta will be accounted for). One of the coins in the ring (the one that invoked the TAIL) will effectively report a delta that is off by the approved amount. The CAT puzzle includes that extra delta into the announcement calculations, so when the ring checks sum to zero, it’s zero *after including the extra delta*. This way, the token supply can increase or decrease in a controlled, intentional manner.

**Safety checks:**

* If an **extra delta is non-zero, the TAIL must be revealed and run**. The CAT puzzle enforces that you cannot have a delta ≠ 0 without providing a valid TAIL program; otherwise the spend fails. This prevents anyone from sneaking in an unnoticed mint or burn.
* If the TAIL runs but determines the conditions are not met (for example, an unauthorized party tried to mint tokens), the TAIL can terminate with an `(x)` (failure), which aborts the spend. In that case, no token creation/destruction happens.
* Only if the TAIL explicitly allows the operation will the spend succeed. When it does, the **CAT supply changes by exactly the extra delta amount** (positive delta = new tokens issued, negative delta = tokens destroyed). Every other normal rule still holds for the rest of the outputs.

**What can a TAIL program do?** A TAIL is a Chialisp program, so it can implement arbitrary logic as long as it follows security best practices. Common patterns for TAILs include:

* *One-time issuance (Fixed Supply):* The TAIL only allows a single initial minting and nothing else. For example, the TAIL might be coded to check that the coin’s **parent is a specific genesis coin ID**, and if so, allow creating a certain amount of CAT, then never allow any future mint. This was implemented in the reference as `genesis_by_coin_id` – it curries in a predetermined coin ID, and the TAIL will approve the spend only if the parent coin’s ID matches that (and perhaps that this is the first issuance). No further minting or melting is possible with that token after the genesis event.
* *Issuance by Authorized Party:* The TAIL allows ongoing minting (and possibly burning) as long as some authority approves each event. A typical approach is requiring a signature from a particular public key on every spend that changes supply. The reference `delegated_tail` or `everything_with_signature` TAIL works like this – it’s curried with an issuer’s public key, and every time someone tries to mint/burn, they must provide a valid signature (usually on the coin ID or some part of the spend) proving the issuer authorizes this specific spend. If the signature is valid, the TAIL permits the issuance; otherwise it fails.
* *Attestation or External Condition:* A TAIL could be written to allow new tokens only under certain on-chain conditions or with certain proofs. For instance, a **stablecoin TAIL** might require proof that an equivalent amount of some reserve asset was locked or that a certain oracle condition is met before minting new tokens.
* *Burn (Melt) Rules:* A TAIL can also allow tokens to be destroyed (melted) under set conditions. For example, an “asset redemption” TAIL might let anyone holding the token redeem it for XCH by melting the token, but perhaps only if they provide a specific claim code or send the coin to a designated address. In such a case, the TAIL would approve a **negative delta** (burn) and might enforce that an XCH coin of a corresponding mojo value is created to a certain address as part of the spend. (The details of implementing a redeemable token are a bit complex, but the TAIL has the flexibility to enforce that the right outputs exist when burning.)

In summary, the TAIL defines the **token’s monetary policy**. Some tokens will have a very restrictive TAIL (or even a “blank” TAIL that never allows any new issuance after the initial creation), effectively behaving like a fixed-supply asset. Others will have a TAIL that gives the issuer ongoing control or other dynamic behaviors. The Chia documentation gives examples of use cases: **stablecoins** (issuer can mint tokens backed by off-chain funds), **limited supply tokens** (one-time creation, no more ever), and **redeemable tokens** (holders can destroy tokens for some right or asset).

> **Security Note:** Writing a TAIL is akin to writing any high-stakes smart coin – if there is a bug or oversight, attackers might exploit it to counterfeit tokens. Chia’s docs warn that if a TAIL is programmed incorrectly, attackers could potentially issue unlimited tokens, destroying the token’s value. Always follow best practices and test issuance logic thoroughly.

## Developer Perspective and Usage

For Chialisp developers, working with CATs typically involves using the standard CAT puzzle and possibly writing or using a TAIL program:

* **Using the Standard CAT Puzzle:** The CAT2 puzzle (often provided in compiled form as `cat.clsp` or similar) is standardized. You generally **do not modify the CAT outer puzzle logic** – you simply curry in the asset’s ID (TAIL hash) and your inner puzzle. For example, if you want to create a CAT coin that anyone can spend with a certain key, you might use the standard `p2_delegated_puzzle_or_hidden_puzzle.clsp` as the inner puzzle, curry in your public key, and then curry that into the CAT puzzle along with the token’s TAIL hash. This gives you a puzzle hash that your wallet or others can send the CAT to. The heavy lifting of ensuring the token rules is all handled by the CAT puzzle.

* **Issuing a New CAT:** To launch a new CAT token, you would:

  1. Write or choose a TAIL puzzle that suits your issuance needs (or use a standard template like “one-time issuance” or “signature-required issuance”). Compile it to get the puzzle hash (Asset ID).
  2. Use the Chia wallet or CLVM tools to perform the **genesis issuance**. This involves spending some XCH coin and creating the first CAT coin(s). In the spend, you provide the TAIL puzzle reveal and solution using the magic `-113` trigger. For example, Chia’s CLI has a `cats` (CAT administration) command where you specify the TAIL and the amount, and it will handle constructing the special spend. During this spend, your TAIL might check that the parent coin ID is the expected genesis coin or verify your signature, then approve the creation of (say) 1,000,000 CAT tokens. The result is an “Eve” CAT coin – the first coin of your new token, now living on-chain.
  3. After issuance, distribute the CAT coins as needed. From here on, normal transfers of the CAT can occur between users using the CAT puzzle as described.

* **Spending and Wallet Support:** The Chia reference wallet supports CAT2 natively. It will automatically recognize coins with the CAT puzzle and track balances per Asset ID. When you create a transaction sending CATs, the wallet software assembles the necessary coin spends, including the announcement ring. As a developer, if you are crafting custom spend bundles, you can use the provided libraries/functions (e.g., in Chia’s `Wallet` or the `chia_rs` library) to construct CAT spends. For instance, there are helper methods to **wrap puzzle hashes** for CATs and to prepare the solutions for spends. It’s advisable to leverage these tools rather than attempting to manually form the ring announcements unless you are deeply familiar with the mechanism.

In summary, **CATs in Chialisp allow developers to create and manage new tokens with custom rules**. The CAT2 puzzle ensures token movements mimic the security of XCH (no inflation or deflation without authorization), and TAIL programs provide a controlled way to introduce supply changes. By wrapping an inner puzzle, CATs integrate seamlessly with Chia’s coin model – a CAT coin can be thought of as “XCH locked inside a token rules envelope.” The inner puzzle can be anything, enabling complex smart coin behavior while the outer CAT layer guarantees the integrity of the token itself. With this architecture, Chia achieves a powerful form of fungible tokens that are highly secure and flexible for developers.

**Sources:**

* Chia Developers Guide – *CATs and CAT2 Standard*
* Chia Reference – *CAT Design Decisions and Announcement Ring*
* Chia Documentation – *CAT Creation and Issuance (TAIL usage)*
* Chia Documentation – *Use Cases for TAIL Programs*
* Chia Documentation – *CAT Tutorial and Mojo Ratios*
