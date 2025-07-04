"use strict";
/**
 * ChiaLisp Include Index
 *
 * Indexes all available constants, functions, and macros from include files
 * to enable proper code generation with includes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONDITION_CODES = exports.CHIALISP_INCLUDES = void 0;
exports.determineRequiredIncludes = determineRequiredIncludes;
exports.getConditionCodeName = getConditionCodeName;
exports.isIncludeFunction = isIncludeFunction;
exports.isIncludeMacro = isIncludeMacro;
exports.getIncludeForFunction = getIncludeForFunction;
exports.getIncludeForConstant = getIncludeForConstant;
/**
 * Index of all available ChiaLisp includes and their exports
 */
exports.CHIALISP_INCLUDES = {
    'condition_codes.clib': {
        path: 'condition_codes.clib',
        constants: {
            // Signatures
            AGG_SIG_UNSAFE: 49,
            AGG_SIG_ME: 50,
            // Coin operations
            CREATE_COIN: 51,
            RESERVE_FEE: 52,
            // Announcements
            CREATE_COIN_ANNOUNCEMENT: 60,
            ASSERT_COIN_ANNOUNCEMENT: 61,
            CREATE_PUZZLE_ANNOUNCEMENT: 62,
            ASSERT_PUZZLE_ANNOUNCEMENT: 63,
            // Self assertions
            ASSERT_MY_COIN_ID: 70,
            ASSERT_MY_PARENT_ID: 71,
            ASSERT_MY_PUZZLEHASH: 72,
            ASSERT_MY_AMOUNT: 73,
            // Time locks
            ASSERT_SECONDS_RELATIVE: 80,
            ASSERT_SECONDS_ABSOLUTE: 81,
            ASSERT_HEIGHT_RELATIVE: 82,
            ASSERT_HEIGHT_ABSOLUTE: 83,
            // Other
            REMARK: 1
        }
    },
    'sha256tree.clib': {
        path: 'sha256tree.clib',
        functions: ['sha256tree']
    },
    'curry-and-treehash.clinc': {
        path: 'curry-and-treehash.clinc',
        constants: {
            ONE: 1,
            TWO: 2,
            A_KW: 'a',
            Q_KW: 'q',
            C_KW: 'c'
        },
        functions: [
            'update-hash-for-parameter-hash',
            'build-curry-list',
            'tree-hash-of-apply',
            'puzzle-hash-of-curried-function'
        ]
    },
    'utility_macros.clib': {
        path: 'utility_macros.clib',
        macros: ['assert', 'or', 'and']
    },
    'singleton_truths.clib': {
        path: 'singleton_truths.clib',
        functions: [
            // Truth struct functions
            'truth_data_to_truth_struct',
            'my_id_truth',
            'my_full_puzzle_hash_truth',
            'my_inner_puzzle_hash_truth',
            'my_amount_truth',
            'my_lineage_proof_truth',
            'singleton_struct_truth',
            'singleton_mod_hash_truth',
            'singleton_launcher_id_truth',
            'singleton_launcher_puzzle_hash_truth',
            // Lineage proof functions
            'parent_info_for_lineage_proof',
            'puzzle_hash_for_lineage_proof',
            'amount_for_lineage_proof',
            'is_not_eve_proof',
            'parent_info_for_eve_proof',
            'amount_for_eve_proof'
        ]
    },
    'cat_truths.clib': {
        path: 'cat_truths.clib',
        functions: [
            // CAT truth functions
            'cat_truth_data_to_truth_struct',
            'my_inner_puzzle_hash_cat_truth',
            'cat_struct_truth',
            'my_id_cat_truth',
            'my_coin_info_truth',
            'my_amount_cat_truth',
            'my_full_puzzle_hash_cat_truth',
            'my_parent_cat_truth',
            // CAT mod struct functions
            'cat_mod_hash_truth',
            'cat_mod_hash_hash_truth',
            'cat_tail_program_hash_truth'
        ]
    },
    'opcodes.clib': {
        path: 'opcodes.clib',
        constants: {
            // Core operators
            QUOTE: 'q',
            APPLY: 'a',
            IF: 'i',
            CONS: 'c',
            FIRST: 'f',
            REST: 'r',
            LISTP: 'l',
            RAISE: 'x',
            EQ: '=',
            // Math operators
            ADD: '+',
            SUBTRACT: '-',
            MULTIPLY: '*',
            DIVIDE: '/',
            DIVMOD: 'divmod',
            GT: '>',
            GTS: '>s',
            // Bit operations
            ASH: 'ash',
            LSH: 'lsh',
            LOGAND: 'logand',
            LOGIOR: 'logior',
            LOGXOR: 'logxor',
            LOGNOT: 'lognot',
            // Logic operations
            NOT: 'not',
            ANY: 'any',
            ALL: 'all',
            // String/byte operations
            STRLEN: 'strlen',
            SUBSTR: 'substr',
            CONCAT: 'concat',
            // Crypto operations
            SHA256: 'sha256',
            SHA256TREE: 'sha256tree',
            SHA256TREE1: 'sha256tree1',
            KECCAK256: 'keccak256',
            COINID: 'coinid',
            SECP256K1_VERIFY: 'secp256k1_verify',
            SECP256R1_VERIFY: 'secp256r1_verify',
            // BLS operations
            POINT_ADD: 'point_add',
            PUBKEY_FOR_EXP: 'pubkey_for_exp',
            G1_ADD: 'g1_add',
            G1_SUBTRACT: 'g1_subtract',
            G1_MULTIPLY: 'g1_multiply',
            G1_NEGATE: 'g1_negate',
            BLS_VERIFY: 'bls_verify',
            // Other operations
            SOFTFORK: 'softfork',
            ASSERT: 'assert',
            IS_ERROR: 'is_error',
            CONTAINS: 'contains',
            // Common macros and special forms
            MOD: 'mod',
            LAMBDA: 'lambda',
            DEFUN: 'defun',
            DEFMACRO: 'defmacro',
            DEFCONST: 'defconst',
            // Environment references
            ARG: '@',
            ARG1: '1',
            ARG2: '2',
            ARG3: '3',
            ARG4: '4',
            ARG5: '5',
            // Numeric constants
            ZERO: '0',
            ONE: '1',
            MINUS_ONE: '-1',
            // Common constants
            NIL: '()',
            TRUE: '1',
            FALSE: '()'
        }
    }
};
/**
 * Condition code mapping for reverse lookup
 */
exports.CONDITION_CODES = {
    1: 'REMARK',
    49: 'AGG_SIG_UNSAFE',
    50: 'AGG_SIG_ME',
    51: 'CREATE_COIN',
    52: 'RESERVE_FEE',
    60: 'CREATE_COIN_ANNOUNCEMENT',
    61: 'ASSERT_COIN_ANNOUNCEMENT',
    62: 'CREATE_PUZZLE_ANNOUNCEMENT',
    63: 'ASSERT_PUZZLE_ANNOUNCEMENT',
    70: 'ASSERT_MY_COIN_ID',
    71: 'ASSERT_MY_PARENT_ID',
    72: 'ASSERT_MY_PUZZLEHASH',
    73: 'ASSERT_MY_AMOUNT',
    80: 'ASSERT_SECONDS_RELATIVE',
    81: 'ASSERT_SECONDS_ABSOLUTE',
    82: 'ASSERT_HEIGHT_RELATIVE',
    83: 'ASSERT_HEIGHT_ABSOLUTE'
};
/**
 * Determine which includes are needed based on features used
 */
function determineRequiredIncludes(features) {
    const includes = [];
    // Include curry-and-treehash.clinc only when sha256tree or curry functions are needed
    if (features.has('sha256tree') || features.has('curry') || features.has('treehash') ||
        features.has('AGG_SIG_ME') || features.has('AGG_SIG_UNSAFE')) {
        includes.push('curry-and-treehash.clinc');
    }
    // Auto-include condition_codes.clib if any condition features are used
    const conditionFeatures = Array.from(features).filter(f => exports.CONDITION_CODES[parseInt(f)] || // Numeric condition code
        Object.values(exports.CONDITION_CODES).includes(f) || // Condition name
        f.includes('CREATE_COIN') ||
        f.includes('AGG_SIG') ||
        f.includes('ASSERT_') ||
        f.includes('RESERVE_FEE') ||
        f.includes('ANNOUNCEMENT'));
    if (conditionFeatures.length > 0) {
        includes.push('condition_codes.clib');
    }
    // Include utility macros if assert, or, and are used
    if (features.has('assert') || features.has('or') || features.has('and')) {
        includes.push('utility_macros.clib');
    }
    // Include singleton truths for singleton operations
    if (Array.from(features).some(f => f.includes('singleton') || f.includes('_truth'))) {
        includes.push('singleton_truths.clib');
    }
    // Include CAT truths for CAT operations
    if (Array.from(features).some(f => f.includes('cat_'))) {
        includes.push('cat_truths.clib');
    }
    // Auto-include opcodes.clib for string operations and other built-in functions
    const opcodeFeatures = [
        'strlen', 'substr', 'concat', 'sha256', 'keccak256', 'coinid',
        'point_add', 'pubkey_for_exp', 'g1_add', 'bls_verify',
        'quote', 'apply', 'all', 'any', 'not'
    ];
    if (opcodeFeatures.some(f => features.has(f))) {
        includes.push('opcodes.clib');
    }
    return includes;
}
/**
 * Get the constant name for a condition code
 */
function getConditionCodeName(code) {
    return exports.CONDITION_CODES[code];
}
/**
 * Check if a function is available in includes
 */
function isIncludeFunction(name) {
    for (const include of Object.values(exports.CHIALISP_INCLUDES)) {
        if (include.functions?.includes(name)) {
            return true;
        }
    }
    return false;
}
/**
 * Check if a macro is available in includes
 */
function isIncludeMacro(name) {
    for (const include of Object.values(exports.CHIALISP_INCLUDES)) {
        if (include.macros?.includes(name)) {
            return true;
        }
    }
    return false;
}
/**
 * Get the include file that provides a specific function
 */
function getIncludeForFunction(functionName) {
    for (const [includeName, include] of Object.entries(exports.CHIALISP_INCLUDES)) {
        if (include.functions?.includes(functionName)) {
            return includeName;
        }
    }
    return undefined;
}
/**
 * Get the include file that provides a specific constant
 */
function getIncludeForConstant(constantName) {
    for (const [includeName, include] of Object.entries(exports.CHIALISP_INCLUDES)) {
        if (include.constants && constantName in include.constants) {
            return includeName;
        }
    }
    return undefined;
}
