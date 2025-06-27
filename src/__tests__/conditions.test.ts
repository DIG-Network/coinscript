/**
 * Condition Tests
 * 
 * Tests for all condition modules
 */

import {
  conditions,
  spend,
  time,
  signatures,
  messages,
  ConditionOpcode,
  CONDITION_OPCODE_NAMES,
  isAtom,
  isList
} from '../index';

describe('Conditions', () => {
  describe('Namespace', () => {
    test('should export conditions namespace', () => {
      expect(conditions).toBeDefined();
      expect(conditions.spend).toBe(spend);
      expect(conditions.time).toBe(time);
      expect(conditions.signatures).toBe(signatures);
      expect(conditions.messages).toBe(messages);
    });
  });

  describe('Condition Opcodes', () => {
    test('should export correct opcodes', () => {
      expect(ConditionOpcode.CREATE_COIN).toBe(51);
      expect(ConditionOpcode.RESERVE_FEE).toBe(52);
      expect(ConditionOpcode.ASSERT_COIN_ANNOUNCEMENT).toBe(61);
      expect(ConditionOpcode.CREATE_COIN_ANNOUNCEMENT).toBe(60);
      expect(ConditionOpcode.ASSERT_PUZZLE_ANNOUNCEMENT).toBe(63);
      expect(ConditionOpcode.CREATE_PUZZLE_ANNOUNCEMENT).toBe(62);
      expect(ConditionOpcode.AGG_SIG_ME).toBe(50);
      expect(ConditionOpcode.AGG_SIG_UNSAFE).toBe(49);
      expect(ConditionOpcode.ASSERT_SECONDS_RELATIVE).toBe(83);
      expect(ConditionOpcode.ASSERT_SECONDS_ABSOLUTE).toBe(82);
      expect(ConditionOpcode.ASSERT_HEIGHT_RELATIVE).toBe(85);
      expect(ConditionOpcode.ASSERT_HEIGHT_ABSOLUTE).toBe(84);
      expect(ConditionOpcode.ASSERT_MY_COIN_ID).toBe(70);
      expect(ConditionOpcode.ASSERT_MY_PARENT_ID).toBe(71);
      expect(ConditionOpcode.ASSERT_MY_PUZZLEHASH).toBe(72);
      expect(ConditionOpcode.ASSERT_MY_AMOUNT).toBe(73);
    });

    test('should have correct opcode names', () => {
      expect(CONDITION_OPCODE_NAMES[51]).toBe('CREATE_COIN');
      expect(CONDITION_OPCODE_NAMES[52]).toBe('RESERVE_FEE');
      expect(CONDITION_OPCODE_NAMES[50]).toBe('AGG_SIG_ME');
      expect(CONDITION_OPCODE_NAMES[83]).toBe('ASSERT_SECONDS_RELATIVE');
    });
  });

  describe('Spend Conditions', () => {
    test('should create CREATE_COIN condition', () => {
      const puzzleHash = '0x' + 'a'.repeat(64);
      const amount = 1000;
      const hint = '0x' + 'b'.repeat(64);
      
      const cond = spend.createCoin(puzzleHash, amount, hint);
      expect(isList(cond)).toBe(true);
      if (isList(cond) && cond.items.length > 0 && isAtom(cond.items[0])) {
        expect(cond.items[0].value).toBe('51');
      }
    });

    test('should create RESERVE_FEE condition', () => {
      const fee = 100;
      const cond = spend.reserveFee(fee);
      expect(isList(cond)).toBe(true);
      if (isList(cond) && cond.items.length > 0 && isAtom(cond.items[0])) {
        expect(cond.items[0].value).toBe('52');
      }
    });

    test('should create assert conditions', () => {
      const coinId = '0x' + 'c'.repeat(64);
      const parentId = '0x' + 'd'.repeat(64);
      const puzzleHash = '0x' + 'e'.repeat(64);
      const amount = 2000;
      
      const assertCoinId = spend.assertMyCoinId(coinId);
      expect(isList(assertCoinId)).toBe(true);
      
      const assertParent = spend.assertMyParentId(parentId);
      expect(isList(assertParent)).toBe(true);
      
      const assertPuzzle = spend.assertMyPuzzleHash(puzzleHash);
      expect(isList(assertPuzzle)).toBe(true);
      
      const assertAmount = spend.assertMyAmount(amount);
      expect(isList(assertAmount)).toBe(true);
    });

    test('should create multiple coins', () => {
      const outputs = [
        { puzzleHash: '0x' + '1'.repeat(64), amount: 100 },
        { puzzleHash: '0x' + '2'.repeat(64), amount: 200, hint: '0x' + '3'.repeat(64) }
      ];
      
      const conds = spend.createCoins(outputs);
      expect(Array.isArray(conds)).toBe(true);
      expect(conds.length).toBe(2);
    });
  });

  describe('Time Conditions', () => {
    test('should create time lock conditions', () => {
      const seconds = 3600;
      const height = 1000000;
      
      const afterSeconds = time.assertSecondsAbsolute(seconds);
      expect(isList(afterSeconds)).toBe(true);
      
      const beforeSeconds = time.assertBeforeSecondsAbsolute(seconds);
      expect(isList(beforeSeconds)).toBe(true);
      
      const afterHeight = time.assertHeightAbsolute(height);
      expect(isList(afterHeight)).toBe(true);
      
      const beforeHeight = time.assertBeforeHeightAbsolute(height);
      expect(isList(beforeHeight)).toBe(true);
    });

    test('should create relative time locks', () => {
      const relativeSeconds = 600;
      const relativeHeight = 10;
      
      const afterRelSeconds = time.assertSecondsRelative(relativeSeconds);
      expect(isList(afterRelSeconds)).toBe(true);
      
      const beforeRelSeconds = time.assertBeforeSecondsRelative(relativeSeconds);
      expect(isList(beforeRelSeconds)).toBe(true);
      
      const afterRelHeight = time.assertHeightRelative(relativeHeight);
      expect(isList(afterRelHeight)).toBe(true);
      
      const beforeRelHeight = time.assertBeforeHeightRelative(relativeHeight);
      expect(isList(beforeRelHeight)).toBe(true);
    });
  });

  describe('Signature Conditions', () => {
    test('should create signature conditions', () => {
      const pubkey = '0x' + 'a'.repeat(96);
      const message = 'hello world';
      
      const aggSigMe = signatures.aggSigMe(pubkey, message);
      expect(isList(aggSigMe)).toBe(true);
      if (isList(aggSigMe) && aggSigMe.items.length > 0 && isAtom(aggSigMe.items[0])) {
        expect(aggSigMe.items[0].value).toBe(50);
      }
      
      const aggSigUnsafe = signatures.aggSigUnsafe(pubkey, message);
      expect(isList(aggSigUnsafe)).toBe(true);
      if (isList(aggSigUnsafe) && aggSigUnsafe.items.length > 0 && isAtom(aggSigUnsafe.items[0])) {
        expect(aggSigUnsafe.items[0].value).toBe(49);
      }
    });

    test('should create multiple signature conditions', () => {
      const sigs = [
        { publicKey: '0x' + '1'.repeat(96), message: 'msg1' },
        { publicKey: '0x' + '2'.repeat(96), message: 'msg2' }
      ];
      
      const conds = signatures.multiSig(sigs);
      expect(Array.isArray(conds)).toBe(true);
      expect(conds.length).toBe(2);
    });
  });

  describe('Message Conditions', () => {
    test('should create announcement conditions', () => {
      const message = 'announcement';
      const announcementId = '0x' + 'f'.repeat(64);
      
      const createCoinAnn = messages.createCoinAnnouncement(message);
      expect(isList(createCoinAnn)).toBe(true);
      if (isList(createCoinAnn) && createCoinAnn.items.length > 0 && isAtom(createCoinAnn.items[0])) {
        expect(createCoinAnn.items[0].value).toBe(60);
      }
      
      const createPuzzleAnn = messages.createPuzzleAnnouncement(message);
      expect(isList(createPuzzleAnn)).toBe(true);
      if (isList(createPuzzleAnn) && createPuzzleAnn.items.length > 0 && isAtom(createPuzzleAnn.items[0])) {
        expect(createPuzzleAnn.items[0].value).toBe(62);
      }
      
      const assertCoinAnn = messages.assertCoinAnnouncement(announcementId);
      expect(isList(assertCoinAnn)).toBe(true);
      
      const assertPuzzleAnn = messages.assertPuzzleAnnouncement(announcementId);
      expect(isList(assertPuzzleAnn)).toBe(true);
    });

    test('should create send message condition', () => {
      const mode = 1;
      const msg = 'hello';
      const puzzleHashes = ['0x' + '1'.repeat(64), '0x' + '2'.repeat(64)];
      
      const sendMsg = messages.sendMessage(mode, msg, puzzleHashes);
      expect(isList(sendMsg)).toBe(true);
      if (isList(sendMsg) && sendMsg.items.length > 0 && isAtom(sendMsg.items[0])) {
        expect(sendMsg.items[0].value).toBe(66);
      }
    });

    test('should create receive message condition', () => {
      const mode = 2;
      const msg = 'expected';
      const senderPuzzleHashes = ['0x' + '3'.repeat(64), '0x' + '4'.repeat(64)];
      
      const receiveMsg = messages.receiveMessage(mode, msg, senderPuzzleHashes);
      expect(isList(receiveMsg)).toBe(true);
      if (isList(receiveMsg) && receiveMsg.items.length > 0 && isAtom(receiveMsg.items[0])) {
        expect(receiveMsg.items[0].value).toBe(67);
      }
    });
  });
}); 