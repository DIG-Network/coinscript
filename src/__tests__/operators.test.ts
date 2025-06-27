/**
 * Operator Tests
 * 
 * Tests for all operator modules
 */

import {
  operators,
  arithmetic,
  comparison,
  lists,
  control,
  crypto,
  bls,
  logic,
  expr,
  isAtom,
  isList,
  list,
  sym,
  nil,
  int
} from '../index';

describe('Operators', () => {
  describe('Namespace', () => {
    test('should export operators namespace', () => {
      expect(operators).toBeDefined();
      expect(operators.arithmetic).toBe(arithmetic);
      expect(operators.comparison).toBe(comparison);
      expect(operators.lists).toBe(lists);
      expect(operators.control).toBe(control);
      expect(operators.crypto).toBe(crypto);
      expect(operators.bls).toBe(bls);
      expect(operators.logic).toBe(logic);
    });
  });

  describe('Arithmetic Operators', () => {
    test('should perform arithmetic operations', () => {
      const a = expr(10).tree;
      const b = expr(5).tree;
      
      const sum = arithmetic.add(a, b);
      expect(isList(sum)).toBe(true);
      if (isList(sum) && sum.items.length > 0 && isAtom(sum.items[0])) {
        expect(sum.items[0].value).toBe('+');
      }
      
      const diff = arithmetic.subtract(a, b);
      expect(isList(diff)).toBe(true);
      
      const prod = arithmetic.multiply(a, b);
      expect(isList(prod)).toBe(true);
      
      const quot = arithmetic.divide(a, b);
      expect(isList(quot)).toBe(true);
      
      const rem = arithmetic.mod(a, b);
      expect(isList(rem)).toBe(true);
    });

    test('should handle divmod', () => {
      const a = expr(10).tree;
      const b = expr(3).tree;
      const result = arithmetic.divmod(a, b);
      expect(isList(result)).toBe(true);
    });
  });

  describe('Comparison Operators', () => {
    test('should perform comparisons', () => {
      const a = expr(10).tree;
      const b = expr(5).tree;
      
      const gt = comparison.greater(a, b);
      expect(isList(gt)).toBe(true);
      
      const eq = comparison.equal(a, b);
      expect(isList(eq)).toBe(true);
      
      const lt = comparison.less(a, b);
      expect(isList(lt)).toBe(true);
      
      const gte = comparison.greaterOrEqual(a, b);
      expect(isList(gte)).toBe(true);
      
      const lte = comparison.lessOrEqual(a, b);
      expect(isList(lte)).toBe(true);
      
      const ne = comparison.notEqual(a, b);
      expect(isList(ne)).toBe(true);
    });
  });

  describe('List Operators', () => {
    test('should handle list operations', () => {
      const lst = list([int(1), int(2), int(3)]);
      
      const first = lists.first(lst);
      expect(isList(first)).toBe(true);
      
      const rest = lists.rest(lst);
      expect(isList(rest)).toBe(true);
      
      const cons = lists.cons(expr(0).tree, lst);
      expect(isList(cons)).toBe(true);
      
      const nth = lists.nth(lst, expr(1).tree);
      expect(isList(nth)).toBe(true);
      
      const len = lists.length(lst);
      expect(isList(len)).toBe(true);
      
      const concat = lists.append(lst, list([int(4), int(5)]));
      expect(isList(concat)).toBe(true);
    });

    test('should check list properties', () => {
      const lst = list([int(1), int(2), int(3)]);
      const atom = expr(42).tree;
      
      const isLst = lists.isList(lst);
      expect(isList(isLst)).toBe(true);
      
      const isAtm = list([sym('l'), list([sym('not'), atom])]);
      expect(isList(isAtm)).toBe(true);
      
      const isNil = list([sym('not'), list([sym('l'), nil])]);
      expect(isList(isNil)).toBe(true);
    });
  });

  describe('Control Flow Operators', () => {
    test('should handle if/else', () => {
      const cond = expr(1).tree;
      const then = expr('true').tree;
      const else_ = expr('false').tree;
      
      const result = control.if_(cond, then, else_);
      expect(isList(result)).toBe(true);
    });

    test('should handle assert', () => {
      const cond = expr(1).tree;
      const msg = expr('assertion failed').tree;
      
      const result = control.assert(cond, msg);
      expect(isList(result)).toBe(true);
    });

    test('should handle apply', () => {
      const func = expr('+').tree;
      const args = list([int(1), int(2)]);
      
      const result = control.apply(func, args);
      expect(isList(result)).toBe(true);
    });
  });

  describe('Crypto Operators', () => {
    test('should handle sha256', () => {
      const data = expr('hello').tree;
      const result = crypto.sha256(data);
      expect(isList(result)).toBe(true);
    });

    test('should handle sha256tree', () => {
      const tree = list([int(1), int(2), int(3)]);
      const result = crypto.sha256tree(tree);
      expect(isList(result)).toBe(true);
    });

    test('should handle coinid', () => {
      const parent = expr('0x' + 'a'.repeat(64)).tree;
      const puzzleHash = expr('0x' + 'b'.repeat(64)).tree;
      const amount = expr(1000).tree;
      
      const result = crypto.coinid(parent, puzzleHash, amount);
      expect(isList(result)).toBe(true);
    });
  });

  describe('BLS Operators', () => {
    test('should handle pubkey_for_exp', () => {
      const sk = expr('0x' + '1'.repeat(64)).tree;
      const result = bls.pubkeyForExp(sk);
      expect(isList(result)).toBe(true);
    });

    test('should handle point_add', () => {
      const p1 = expr('0x' + 'a'.repeat(96)).tree;
      const p2 = expr('0x' + 'b'.repeat(96)).tree;
      const result = bls.g1Add(p1, p2);
      expect(isList(result)).toBe(true);
    });
  });

  describe('Logic Operators', () => {
    test('should handle not', () => {
      const val = expr(0).tree;
      const result = logic.not(val);
      expect(isList(result)).toBe(true);
    });

    test('should handle all', () => {
      const vals = [expr(1).tree, expr(2).tree, expr(3).tree];
      const result = logic.all(...vals);
      expect(isList(result)).toBe(true);
    });

    test('should handle any', () => {
      const vals = [expr(0).tree, expr(1).tree, expr(0).tree];
      const result = logic.any(...vals);
      expect(isList(result)).toBe(true);
    });

    test('should handle boolean operations', () => {
      const a = expr(1).tree;
      const b = expr(0).tree;
      
      const and = logic.all(a, b);
      expect(isList(and)).toBe(true);
      
      const or = logic.any(a, b);
      expect(isList(or)).toBe(true);
    });
  });
}); 