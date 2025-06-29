/**
 * Message and announcement conditions
 * 
 * Conditions for message passing and announcements
 */

import { TreeNode } from '../core/types';
import { list, int, hex, sym } from '../core/builders';
import { ConditionOpcode } from './opcodes';
import { sha256 } from '../operators/crypto';

/**
 * Type aliases
 */
export type AnnouncementMessage = Uint8Array | string | TreeNode | { tree: TreeNode };
export type AnnouncementId = Uint8Array | string | TreeNode | { tree: TreeNode };

/**
 * Convert announcement message to tree node
 */
function toAnnouncementNode(value: AnnouncementMessage): TreeNode {
  // If it's an Expression-like object with a tree property
  if (typeof value === 'object' && value !== null && 'tree' in value) {
    return value.tree;
  }
  // If it's already a TreeNode
  if (typeof value === 'object' && value !== null && 'type' in value) {
    return value;
  }
  if (typeof value === 'string') {
    // If it looks like hex, treat as hex
    if (value.startsWith('0x') || /^[0-9a-fA-F]+$/.test(value)) {
      return hex(value);
    }
    // Otherwise use as symbol
    return sym(value);
  }
  return hex(Array.from(value as Uint8Array).map(b => b.toString(16).padStart(2, '0')).join(''));
}

/**
 * CREATE_COIN_ANNOUNCEMENT - Create announcement from this coin
 * (60 message)
 */
export function createCoinAnnouncement(message: AnnouncementMessage): TreeNode {
  return list([
    int(ConditionOpcode.CREATE_COIN_ANNOUNCEMENT),
    toAnnouncementNode(message)
  ]);
}

/**
 * ASSERT_COIN_ANNOUNCEMENT - Assert coin announcement exists
 * (61 announcement_id)
 */
export function assertCoinAnnouncement(announcementId: AnnouncementId): TreeNode {
  return list([
    int(ConditionOpcode.ASSERT_COIN_ANNOUNCEMENT),
    toAnnouncementNode(announcementId)
  ]);
}

/**
 * CREATE_PUZZLE_ANNOUNCEMENT - Create announcement from this puzzle
 * (62 message)
 */
export function createPuzzleAnnouncement(message: AnnouncementMessage): TreeNode {
  return list([
    int(ConditionOpcode.CREATE_PUZZLE_ANNOUNCEMENT),
    toAnnouncementNode(message)
  ]);
}

/**
 * ASSERT_PUZZLE_ANNOUNCEMENT - Assert puzzle announcement exists
 * (63 announcement_id)
 */
export function assertPuzzleAnnouncement(announcementId: AnnouncementId): TreeNode {
  return list([
    int(ConditionOpcode.ASSERT_PUZZLE_ANNOUNCEMENT),
    toAnnouncementNode(announcementId)
  ]);
}

/**
 * SEND_MESSAGE - Send message to specific puzzle hashes
 * (66 mode message puzzle_hashes...)
 */
export function sendMessage(mode: number, message: AnnouncementMessage, puzzleHashes: string[]): TreeNode {
  return list([
    int(ConditionOpcode.SEND_MESSAGE),
    int(mode),
    toAnnouncementNode(message),
    ...puzzleHashes.map(ph => hex(ph))
  ]);
}

/**
 * RECEIVE_MESSAGE - Receive message with specific mode
 * (67 mode message sender_puzzle_hashes...)
 */
export function receiveMessage(mode: number, message: AnnouncementMessage, senderPuzzleHashes: string[]): TreeNode {
  return list([
    int(ConditionOpcode.RECEIVE_MESSAGE),
    int(mode),
    toAnnouncementNode(message),
    ...senderPuzzleHashes.map(ph => hex(ph))
  ]);
}

/**
 * Helper to calculate coin announcement ID
 */
export function coinAnnouncementId(coinId: string, message: AnnouncementMessage): TreeNode {
  return sha256(hex(coinId), toAnnouncementNode(message));
}

/**
 * Helper to calculate puzzle announcement ID
 */
export function puzzleAnnouncementId(puzzleHash: string, message: AnnouncementMessage): TreeNode {
  return sha256(hex(puzzleHash), toAnnouncementNode(message));
}

/**
 * Helper for coordinated spend using announcements
 * Note: The announcement ID calculation would need to be done with actual hash values
 */
export function coordinatedSpend(coinId: string, message: string = 'spend'): {
  create: TreeNode;
  assertId: string;
} {
  return {
    create: createCoinAnnouncement(message),
    // In practice, you'd calculate: sha256(coinId + message)
    assertId: `${coinId}${message}`
  };
}

/**
 * Helper for offer coordination using puzzle announcements
 * Note: The announcement ID calculation would need to be done with actual hash values
 */
export function offerCoordination(puzzleHash: string, offerId: string): {
  create: TreeNode;
  assertId: string;
} {
  return {
    create: createPuzzleAnnouncement(offerId),
    // In practice, you'd calculate: sha256(puzzleHash + offerId)
    assertId: `${puzzleHash}${offerId}`
  };
}

/**
 * Message modes for SEND/RECEIVE_MESSAGE
 */
export const MessageMode = {
  // Sender: puzzle hash, Receiver: coin id
  PUZZLE_TO_COIN: 0x10,
  // Sender: coin id, Receiver: puzzle hash
  COIN_TO_PUZZLE: 0x11,
  // Sender: puzzle hash, Receiver: puzzle hash
  PUZZLE_TO_PUZZLE: 0x12,
  // Sender: coin id, Receiver: coin id
  COIN_TO_COIN: 0x13,
  // Sender: parent coin id, Receiver: coin id
  PARENT_TO_COIN: 0x14,
  // Sender: coin id, Receiver: parent coin id
  COIN_TO_PARENT: 0x15,
  // Sender: puzzle hash, Receiver: parent coin id
  PUZZLE_TO_PARENT: 0x16,
  // Sender: parent coin id, Receiver: puzzle hash
  PARENT_TO_PUZZLE: 0x17
} as const; 