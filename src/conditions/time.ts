/**
 * Time conditions
 * 
 * Conditions related to time locks and height restrictions
 */

import { TreeNode } from '../core/types';
import { list, int } from '../core/builders';
import { ConditionOpcode } from './opcodes';

/**
 * ASSERT_SECONDS_RELATIVE - Require seconds since coin creation
 * (80 seconds)
 */
export function assertSecondsRelative(seconds: number): TreeNode {
  return list([int(ConditionOpcode.ASSERT_SECONDS_RELATIVE), int(seconds)]);
}

/**
 * ASSERT_SECONDS_ABSOLUTE - Require absolute timestamp
 * (81 timestamp)
 */
export function assertSecondsAbsolute(timestamp: number): TreeNode {
  return list([int(ConditionOpcode.ASSERT_SECONDS_ABSOLUTE), int(timestamp)]);
}

/**
 * ASSERT_HEIGHT_RELATIVE - Require blocks since coin creation
 * (82 blocks)
 */
export function assertHeightRelative(blocks: number): TreeNode {
  return list([int(ConditionOpcode.ASSERT_HEIGHT_RELATIVE), int(blocks)]);
}

/**
 * ASSERT_HEIGHT_ABSOLUTE - Require absolute block height
 * (83 height)
 */
export function assertHeightAbsolute(height: number): TreeNode {
  return list([int(ConditionOpcode.ASSERT_HEIGHT_ABSOLUTE), int(height)]);
}

/**
 * ASSERT_BEFORE_SECONDS_RELATIVE - Must be spent before seconds elapsed
 * (84 seconds)
 */
export function assertBeforeSecondsRelative(seconds: number): TreeNode {
  return list([int(ConditionOpcode.ASSERT_BEFORE_SECONDS_RELATIVE), int(seconds)]);
}

/**
 * ASSERT_BEFORE_SECONDS_ABSOLUTE - Must be spent before timestamp
 * (85 timestamp)
 */
export function assertBeforeSecondsAbsolute(timestamp: number): TreeNode {
  return list([int(ConditionOpcode.ASSERT_BEFORE_SECONDS_ABSOLUTE), int(timestamp)]);
}

/**
 * ASSERT_BEFORE_HEIGHT_RELATIVE - Must be spent before blocks elapsed
 * (86 blocks)
 */
export function assertBeforeHeightRelative(blocks: number): TreeNode {
  return list([int(ConditionOpcode.ASSERT_BEFORE_HEIGHT_RELATIVE), int(blocks)]);
}

/**
 * ASSERT_BEFORE_HEIGHT_ABSOLUTE - Must be spent before block height
 * (87 height)
 */
export function assertBeforeHeightAbsolute(height: number): TreeNode {
  return list([int(ConditionOpcode.ASSERT_BEFORE_HEIGHT_ABSOLUTE), int(height)]);
}

/**
 * Helper to create a time window (must be spent between start and end)
 */
export function timeWindow(startTimestamp: number, endTimestamp: number): TreeNode[] {
  return [
    assertSecondsAbsolute(startTimestamp),
    assertBeforeSecondsAbsolute(endTimestamp)
  ];
}

/**
 * Helper to create a height window
 */
export function heightWindow(startHeight: number, endHeight: number): TreeNode[] {
  return [
    assertHeightAbsolute(startHeight),
    assertBeforeHeightAbsolute(endHeight)
  ];
}

/**
 * Helper for vesting/cliff - unlock after time
 */
export function vestingUnlock(unlockTimestamp: number): TreeNode {
  return assertSecondsAbsolute(unlockTimestamp);
}

/**
 * Helper for expiring offer - must claim before time
 */
export function expiringOffer(expiryTimestamp: number): TreeNode {
  return assertBeforeSecondsAbsolute(expiryTimestamp);
}

/**
 * Helper for relative time lock (e.g., 24 hours after creation)
 */
export function relativeLock(seconds: number): TreeNode {
  return assertSecondsRelative(seconds);
}

/**
 * Common time periods in seconds
 */
export const TimePeriods = {
  MINUTE: 60,
  HOUR: 3600,
  DAY: 86400,
  WEEK: 604800,
  MONTH_30: 2592000,
  YEAR: 31536000
} as const;

/**
 * Helper to convert days to seconds
 */
export function daysToSeconds(days: number): number {
  return days * TimePeriods.DAY;
}

/**
 * Helper to convert hours to seconds
 */
export function hoursToSeconds(hours: number): number {
  return hours * TimePeriods.HOUR;
} 