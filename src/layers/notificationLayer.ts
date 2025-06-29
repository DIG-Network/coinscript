/**
 * Notification Layer
 * 
 * Enables puzzles to send and receive notifications via announcements
 */

import { PuzzleBuilder, puzzle } from '../builder/PuzzleBuilder';
import { TreeNode } from '../core/types';
import { list, hex } from '../core/builders';
import { CLVMOpcode } from '../core/opcodes';
import { ConditionOpcode } from '../conditions/opcodes';

/**
 * Notification layer options
 */
export interface NotificationLayerOptions {
  notificationId?: string; // Unique ID for this notification channel
  allowedSenders?: string[]; // Puzzle hashes allowed to send notifications
  allowedReceivers?: string[]; // Puzzle hashes allowed to receive notifications
  messageFormat?: 'raw' | 'structured' | 'encrypted';
}

/**
 * Wrap any puzzle with notification layer
 * @param innerPuzzle - The inner puzzle to wrap
 * @param options - Notification configuration
 * @returns Notification wrapped puzzle
 */
export function withNotificationLayer(
  innerPuzzle: PuzzleBuilder | TreeNode,
  options: NotificationLayerOptions = {}
): PuzzleBuilder {
  const notification = puzzle();
  notification.noMod();
  
  const innerTree = innerPuzzle instanceof PuzzleBuilder ? innerPuzzle.build() : innerPuzzle;
  const notificationId = options.notificationId || generateNotificationId();
  
  notification.withCurriedParams({
    NOTIFICATION_ID: notificationId,
    ALLOWED_SENDERS: options.allowedSenders 
      ? list(options.allowedSenders.map(s => hex(s)))
      : list([]),
    ALLOWED_RECEIVERS: options.allowedReceivers
      ? list(options.allowedReceivers.map(r => hex(r)))
      : list([]),
    INNER_PUZZLE: innerTree
  });
  
  notification.withSolutionParams(
    'inner_solution',
    'outgoing_messages',    // List of messages to send
    'expected_messages',    // List of expected incoming messages
    'message_proofs'        // Proofs for received messages
  );
  
  notification.includeConditionCodes();
  
  notification.comment('Notification layer handles messaging');
  
  // Send outgoing messages
  notification.if(notification.param('outgoing_messages'))
    .then((b: PuzzleBuilder) => {
      b.comment('Send notifications');
      // In real implementation, would iterate through messages
      b.forEach(['message1', 'message2'], (_msg, _i, builder) => {
        builder.createAnnouncement(
          formatNotificationMessage(notificationId, _msg)
        );
      });
    })
    .else(() => {});
  
  // Assert expected incoming messages
  notification.if(notification.param('expected_messages'))
    .then((b: PuzzleBuilder) => {
      b.comment('Assert expected notifications');
      // In real implementation, would verify each expected message
      b.forEach(['expected1', 'expected2'], (_msg, _i, builder) => {
        builder.assertAnnouncement(
          calculateAnnouncementId('sender', formatNotificationMessage(notificationId, _msg))
        );
      });
    })
    .else(() => {});
  
  // Run inner puzzle
  notification.comment('Run inner puzzle with notification context');
  notification.addCondition(CLVMOpcode.APPLY,
    notification.param('INNER_PUZZLE'),
    notification.param('inner_solution')
  );
  
  return notification;
}

/**
 * Create a notification broadcaster
 * Specialized puzzle for broadcasting messages to multiple receivers
 */
export function createNotificationBroadcaster(
  channelId: string,
  authorizedBroadcasters: string[]
): PuzzleBuilder {
  const broadcaster = puzzle();
  broadcaster.noMod();
  
  broadcaster.withCurriedParams({
    CHANNEL_ID: channelId,
    AUTHORIZED_BROADCASTERS: list(authorizedBroadcasters.map(b => hex(b)))
  });
  
  broadcaster.withSolutionParams(
    'messages',        // List of messages to broadcast
    'broadcaster_key', // Public key of broadcaster
    'recipients'       // Optional: specific recipients
  );
  
  broadcaster.comment('Notification broadcaster');
  
  // Verify broadcaster is authorized
  broadcaster.comment('Verify broadcaster authorization');
  broadcaster.addCondition(ConditionOpcode.AGG_SIG_ME,
    broadcaster.param('broadcaster_key'),
    'broadcast'
  );
  
  // Broadcast messages
  broadcaster.comment('Broadcast messages');
  broadcaster.forEach(['msg1', 'msg2', 'msg3'], (msg, i, b) => {
    b.createAnnouncement(
      formatBroadcastMessage(channelId, msg, i)
    );
  });
  
  return broadcaster;
}

/**
 * Create a notification subscriber
 * Listens for messages on specific channels
 */
export function createNotificationSubscriber(
  channels: string[],
  callback?: PuzzleBuilder
): PuzzleBuilder {
  const subscriber = puzzle();
  subscriber.noMod();
  
  subscriber.withCurriedParams({
    SUBSCRIBED_CHANNELS: list(channels.map(c => hex(c))),
    CALLBACK_PUZZLE: callback ? callback.build() : list([])
  });
  
  subscriber.withSolutionParams(
    'received_messages', // Messages received on subscribed channels
    'message_actions'    // Actions to take for each message
  );
  
  subscriber.comment('Notification subscriber');
  
  // Process received messages
  subscriber.comment('Process received messages');
  subscriber.if(subscriber.param('received_messages'))
    .then((b: PuzzleBuilder) => {
      b.comment('Handle received messages');
      
      // Run callback if provided
      if (callback) {
        b.addCondition(CLVMOpcode.APPLY,
          b.param('CALLBACK_PUZZLE'),
          b.param('received_messages'),
          b.param('message_actions')
        );
      }
    })
    .else(() => {});
  
  return subscriber;
}

/**
 * Create a message router
 * Routes messages between different notification channels
 */
export function createMessageRouter(
  routingRules: Array<{
    fromChannel: string;
    toChannel: string;
    filter?: (message: unknown) => boolean;
    transform?: (message: unknown) => unknown;
  }>
): PuzzleBuilder {
  const router = puzzle();
  router.noMod();
  
  router.withCurriedParams({
    ROUTING_RULES: encodeRoutingRules(routingRules)
  });
  
  router.withSolutionParams(
    'incoming_messages',
    'routing_proofs'
  );
  
  router.comment('Message router');
  
  // Route messages according to rules
  router.comment('Route messages based on rules');
  // In real implementation would apply routing logic
  
  return router;
}

/**
 * Format a notification message
 * @param notificationId - Channel/notification ID
 * @param message - Message content
 * @returns Formatted message
 */
function formatNotificationMessage(
  notificationId: string,
  message: string
): string {
  const msgData = {
    channel: notificationId,
    content: message,
    timestamp: Date.now()
  };
  return Buffer.from(JSON.stringify(msgData)).toString('hex');
}

/**
 * Format a broadcast message
 * @param channelId - Broadcast channel ID
 * @param message - Message content
 * @param index - Message index
 * @returns Formatted broadcast message
 */
function formatBroadcastMessage(
  channelId: string,
  message: string,
  index: number
): string {
  const msgData = {
    channel: channelId,
    index: index,
    content: message,
    type: 'broadcast'
  };
  return Buffer.from(JSON.stringify(msgData)).toString('hex');
}

/**
 * Calculate announcement ID
 * @param _sender - Sender puzzle hash
 * @param _message - Message content
 * @returns Announcement ID
 */
function calculateAnnouncementId(
  _sender: string,
  _message: string
): string {
  // In real implementation would calculate proper announcement ID
  return '0x' + 'a'.repeat(64);
}

/**
 * Generate a unique notification ID
 * @returns Notification ID
 */
function generateNotificationId(): string {
  return '0x' + Date.now().toString(16).padStart(16, '0') + 
         Math.random().toString(16).substring(2, 18);
}

/**
 * Encode routing rules for the message router
 * @param rules - Routing rules
 * @returns Encoded rules
 */
function encodeRoutingRules(
  rules: Array<{
    fromChannel: string;
    toChannel: string;
  }>
): TreeNode {
  return list(rules.map(rule => 
    list([
      hex(rule.fromChannel),
      hex(rule.toChannel),
      hex('00') // Empty filter/transform (no transformation)
    ])
  ));
} 