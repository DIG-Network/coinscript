"use strict";
/**
 * Condition Opcodes
 *
 * All standard Chia condition opcodes
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONDITION_OPCODE_NAMES = exports.ConditionOpcode = void 0;
var ConditionOpcode;
(function (ConditionOpcode) {
    // Signature conditions
    ConditionOpcode[ConditionOpcode["AGG_SIG_UNSAFE"] = 49] = "AGG_SIG_UNSAFE";
    ConditionOpcode[ConditionOpcode["AGG_SIG_ME"] = 50] = "AGG_SIG_ME";
    // Coin creation
    ConditionOpcode[ConditionOpcode["CREATE_COIN"] = 51] = "CREATE_COIN";
    // Fee reservation
    ConditionOpcode[ConditionOpcode["RESERVE_FEE"] = 52] = "RESERVE_FEE";
    // Announcement conditions
    ConditionOpcode[ConditionOpcode["CREATE_COIN_ANNOUNCEMENT"] = 60] = "CREATE_COIN_ANNOUNCEMENT";
    ConditionOpcode[ConditionOpcode["ASSERT_COIN_ANNOUNCEMENT"] = 61] = "ASSERT_COIN_ANNOUNCEMENT";
    ConditionOpcode[ConditionOpcode["CREATE_PUZZLE_ANNOUNCEMENT"] = 62] = "CREATE_PUZZLE_ANNOUNCEMENT";
    ConditionOpcode[ConditionOpcode["ASSERT_PUZZLE_ANNOUNCEMENT"] = 63] = "ASSERT_PUZZLE_ANNOUNCEMENT";
    // Concurrent spend/puzzle assertions
    ConditionOpcode[ConditionOpcode["ASSERT_CONCURRENT_SPEND"] = 64] = "ASSERT_CONCURRENT_SPEND";
    ConditionOpcode[ConditionOpcode["ASSERT_CONCURRENT_PUZZLE"] = 65] = "ASSERT_CONCURRENT_PUZZLE";
    // Message passing
    ConditionOpcode[ConditionOpcode["SEND_MESSAGE"] = 66] = "SEND_MESSAGE";
    ConditionOpcode[ConditionOpcode["RECEIVE_MESSAGE"] = 67] = "RECEIVE_MESSAGE";
    // Coin assertions
    ConditionOpcode[ConditionOpcode["ASSERT_MY_COIN_ID"] = 70] = "ASSERT_MY_COIN_ID";
    ConditionOpcode[ConditionOpcode["ASSERT_MY_PARENT_ID"] = 71] = "ASSERT_MY_PARENT_ID";
    ConditionOpcode[ConditionOpcode["ASSERT_MY_PUZZLEHASH"] = 72] = "ASSERT_MY_PUZZLEHASH";
    ConditionOpcode[ConditionOpcode["ASSERT_MY_AMOUNT"] = 73] = "ASSERT_MY_AMOUNT";
    // Time lock conditions - relative
    ConditionOpcode[ConditionOpcode["ASSERT_SECONDS_RELATIVE"] = 80] = "ASSERT_SECONDS_RELATIVE";
    ConditionOpcode[ConditionOpcode["ASSERT_HEIGHT_RELATIVE"] = 82] = "ASSERT_HEIGHT_RELATIVE";
    ConditionOpcode[ConditionOpcode["ASSERT_BEFORE_SECONDS_RELATIVE"] = 84] = "ASSERT_BEFORE_SECONDS_RELATIVE";
    ConditionOpcode[ConditionOpcode["ASSERT_BEFORE_HEIGHT_RELATIVE"] = 86] = "ASSERT_BEFORE_HEIGHT_RELATIVE";
    // Time lock conditions - absolute
    ConditionOpcode[ConditionOpcode["ASSERT_SECONDS_ABSOLUTE"] = 81] = "ASSERT_SECONDS_ABSOLUTE";
    ConditionOpcode[ConditionOpcode["ASSERT_HEIGHT_ABSOLUTE"] = 83] = "ASSERT_HEIGHT_ABSOLUTE";
    ConditionOpcode[ConditionOpcode["ASSERT_BEFORE_SECONDS_ABSOLUTE"] = 85] = "ASSERT_BEFORE_SECONDS_ABSOLUTE";
    ConditionOpcode[ConditionOpcode["ASSERT_BEFORE_HEIGHT_ABSOLUTE"] = 87] = "ASSERT_BEFORE_HEIGHT_ABSOLUTE";
    // Softfork
    ConditionOpcode[ConditionOpcode["SOFTFORK"] = 90] = "SOFTFORK";
})(ConditionOpcode || (exports.ConditionOpcode = ConditionOpcode = {}));
/**
 * Reverse mapping for debugging
 */
exports.CONDITION_OPCODE_NAMES = Object.entries(ConditionOpcode)
    .filter(([_key, value]) => typeof value === 'number')
    .reduce((acc, [key, value]) => {
    acc[value] = key;
    return acc;
}, {});
