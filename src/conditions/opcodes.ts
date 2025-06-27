/**
 * Condition Opcodes
 * 
 * All standard Chia condition opcodes
 */

export enum ConditionOpcode {
  // Signature conditions
  AGG_SIG_UNSAFE = 49,
  AGG_SIG_ME = 50,
  
  // Coin creation
  CREATE_COIN = 51,
  
  // Fee reservation
  RESERVE_FEE = 52,
  
  // Announcement conditions
  CREATE_COIN_ANNOUNCEMENT = 60,
  ASSERT_COIN_ANNOUNCEMENT = 61,
  CREATE_PUZZLE_ANNOUNCEMENT = 62,
  ASSERT_PUZZLE_ANNOUNCEMENT = 63,
  
  // Concurrent spend/puzzle assertions
  ASSERT_CONCURRENT_SPEND = 64,
  ASSERT_CONCURRENT_PUZZLE = 65,
  
  // Message passing
  SEND_MESSAGE = 66,
  RECEIVE_MESSAGE = 67,
  
  // Coin assertions
  ASSERT_MY_COIN_ID = 70,
  ASSERT_MY_PARENT_ID = 71,
  ASSERT_MY_PUZZLEHASH = 72,
  ASSERT_MY_AMOUNT = 73,
  
  // Time lock conditions - relative
  ASSERT_SECONDS_RELATIVE = 80,
  ASSERT_HEIGHT_RELATIVE = 82,
  ASSERT_BEFORE_SECONDS_RELATIVE = 84,
  ASSERT_BEFORE_HEIGHT_RELATIVE = 86,
  
  // Time lock conditions - absolute
  ASSERT_SECONDS_ABSOLUTE = 81,
  ASSERT_HEIGHT_ABSOLUTE = 83,
  ASSERT_BEFORE_SECONDS_ABSOLUTE = 85,
  ASSERT_BEFORE_HEIGHT_ABSOLUTE = 87,
  
  // Softfork
  SOFTFORK = 90
}

/**
 * Reverse mapping for debugging
 */
export const CONDITION_OPCODE_NAMES: Record<number, string> = Object.entries(ConditionOpcode)
  .filter(([_key, value]) => typeof value === 'number')
  .reduce((acc, [key, value]) => {
    acc[value as number] = key;
    return acc;
  }, {} as Record<number, string>); 