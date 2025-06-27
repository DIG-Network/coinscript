/**
 * Test the CLSP Formatter V3 with pattern-based formatting
 */

const { CLSPFormatterV3 } = require('./clsp-formatter-v3');

console.log('=== CLSP Formatter V3 - Pattern-Based Formatting ===\n');

// Test cases based on actual CLSP patterns
const testCases = [
  {
    name: 'Module with complex parameters',
    input: `(mod (
    SINGLETON_MOD_HASH
    MANAGER_SINGLETON_STRUCT_HASH ; (sha256 SINGLETON_STRUCT) for manager singleton
    ENTRY_SLOT_1ST_CURRY_HASH ; after 1st curry
    MAX_SECONDS_OFFSET ; at most this amount of seconds can pass since last update
    (
        Ephemeral_State . ; not used
        (@
            Current_State
            (
                total_reserves
                active_shares
                (@ Reward_Info (cumulative_payout . remaining_rewards))
                (@ Round_Time_Info (last_update . epoch_end))
            )
        )
    ) ; Truth
    (
        manager_singleton_inner_puzzle_hash
        entry_payout_puzzle_hash .
        entry_shares
    )
)
    (include condition_codes.clib)
    (include curry.clib)
    (include slots.clib)

    (c
        (list
            Ephemeral_State
            total_reserves
            (+ active_shares entry_shares)
            Reward_Info
            Round_Time_Info
        ) ; new state  
        (list
            ; manager actually wants us to add this entry
            (list RECEIVE_MESSAGE
                18 ; puzzle hash - puzzle hash
                (concat 'a' (sha256 2
                    (sha256 1 entry_payout_puzzle_hash)
                    (sha256 1 entry_shares)
                )) ; message = 'a' + (sha265tree (entry_payout_puzzle_hash . entry_shares))
                (curry_hashes_inline SINGLETON_MOD_HASH
                    MANAGER_SINGLETON_STRUCT_HASH
                    manager_singleton_inner_puzzle_hash
                )
            )

            (create_slot_with_hint_inline ENTRY_SLOT_1ST_CURRY_HASH
                (sha256 2
                    (sha256 1 entry_payout_puzzle_hash)
                    (sha256 2
                        (sha256 1 cumulative_payout)
                        (sha256 1 entry_shares)
                    )
                ) ; slot value = (payout_puzzle_hash initial_cumulative_payout . shares)
                entry_payout_puzzle_hash
            )

            ; make sure the reward info is up to date
            (list ASSERT_BEFORE_SECONDS_ABSOLUTE (+ last_update MAX_SECONDS_OFFSET))
        ) ; conditions
    )
        
)`,
    description: 'Complex module with nested parameters and comments'
  },
  {
    name: 'Function with destructuring',
    input: `(defun run_actions (
        puzzles
        current_conditions
        (ephemeral_and_actual_state . new_conditions)
        (@ pending_selectors (selector . remaining_selectors))
        (@ pending_solutions (solution . remaining_solutions))
    )
        (if pending_selectors
            (run_actions
                puzzles
                (c new_conditions current_conditions)
                (a (a selector puzzles) (list ephemeral_and_actual_state solution))
                remaining_selectors
                remaining_solutions
            )
            ; else
            (c
                ephemeral_and_actual_state
                (c new_conditions current_conditions)
            )
        )
    )`,
    description: 'Function with @ destructuring and if/else pattern'
  },
  {
    name: 'If statement with else comment',
    input: `(if (all
        (not (> epoch_end epoch_start)) ; we're adding incentives to a future epoch
        (> rewards_to_add 0)
    )
        (c
            (list
                Ephemeral_State ; new ephemeral state
                (+ total_reserves rewards_to_add)
                active_shares
                Reward_Info
                Round_Time_Info
            ) ; new state
            (create_precommitment_slot_and_announce
                COMMITMENT_SLOT_1ST_CURRY_HASH
                (sha256 2
                    (sha256 1 epoch_start)
                    (sha256 2 
                        (sha256 1 clawback_ph)
                        (sha256 1 rewards_to_add)
                    )
                )
                clawback_ph
                base_conditions
            )
        )
        ; else
        (x)
    )`,
    description: 'If statement with complex condition and ; else comment'
  },
  {
    name: 'List with comments',
    input: `(list
    (list CREATE_COIN
        (curry_hashes ACTION_LAYER_MOD_HASH
            (curry_hashes FINALIZER_SELF_HASH
                (sha256 1 FINALIZER_SELF_HASH)) ; finalizer puzzle hash
            (sha256 1 Merkle_Root)
            (sha256tree New_State)) ; new inner ph
        1
        (list HINT))
    (flatten_list Conditions))`,
    description: 'List with inline comments'
  }
];

// Test without indentation (normalize only)
console.log('=== Testing without indentation (normalize whitespace only) ===\n');
const normalizeFormatter = new CLSPFormatterV3({ indent: false });

testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.name}`);
  console.log(`Description: ${test.description}`);
  console.log('\nNORMALIZED (all on one line):');
  const normalized = normalizeFormatter.format(test.input);
  console.log(normalized.substring(0, 150) + (normalized.length > 150 ? '...' : ''));
  console.log(`Total length: ${normalized.length} characters`);
  console.log('-'.repeat(80) + '\n');
});

// Test with indentation
console.log('\n=== Testing with indentation (pattern-based formatting) ===\n');
const indentFormatter = new CLSPFormatterV3({ indent: true, indentSize: 4 });

testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.name}`);
  console.log(`Description: ${test.description}`);
  console.log('\nFORMATTED:');
  try {
    const formatted = indentFormatter.format(test.input);
    console.log(formatted);
  } catch (e) {
    console.log('Error:', e.message);
    console.log('Normalized version:');
    console.log(normalizeFormatter.format(test.input));
  }
  console.log('-'.repeat(80) + '\n');
});

// Test specific patterns
console.log('\n=== Common CLSP Patterns ===\n');

const patterns = [
  {
    pattern: 'Simple expression',
    input: '(sha256 1 value)',
    expected: 'Single line'
  },
  {
    pattern: 'Include statement',
    input: '(include condition_codes.clib)',
    expected: 'Always single line'
  },
  {
    pattern: 'Nested list',
    input: '(list (list CREATE_COIN ph amount) (list ASSERT_MY_AMOUNT amount))',
    expected: 'Each nested list on new line'
  },
  {
    pattern: 'Long atom list',
    input: '(curry_hashes_inline SINGLETON_MOD_HASH MANAGER_SINGLETON_STRUCT_HASH manager_singleton_inner_puzzle_hash)',
    expected: 'Single line if under max length'
  }
];

patterns.forEach((p) => {
  console.log(`Pattern: ${p.pattern}`);
  console.log(`Input: ${p.input}`);
  console.log(`Expected: ${p.expected}`);
  console.log('Formatted:', indentFormatter.format(p.input));
  console.log();
}); 