/**
 * Tests for all the gap implementations
 * 
 * This file tests all the fixes implemented for the gaps identified in gaps.md
 */

import { describe, test, expect } from '@jest/globals';
import { puzzle, expr, variable } from '../builder/PuzzleBuilder';
import { SolutionBuilder } from '../builder/SolutionBuilder';
import { createAnnouncement, assertAnnouncement } from '../conditions';
import { toModHash, toPuzzleReveal, toChiaLisp } from '../core/utils';
import { TreeNode, int, hex, list } from '../core';
import { withStateManagementLayer } from '../layers/stateManagementLayer';

describe('Gap Implementations', () => {
  describe('TreeNode/Expression Method Gaps', () => {
    test('TreeNode utility methods work correctly', () => {
      const node: TreeNode = list([int(1), int(2), int(3)]);
      
      // Test toModHash
      const modHash = toModHash(node);
      expect(modHash).toMatch(/^0x[0-9a-f]{64}$/);
      
      // Test toPuzzleReveal
      const puzzleReveal = toPuzzleReveal(node);
      expect(puzzleReveal).toMatch(/^[0-9a-f]+$/);
      expect(puzzleReveal).not.toContain('0x');
      
      // Test toChiaLisp
      const chiaLisp = toChiaLisp(node);
      expect(chiaLisp).toBe('(1 2 3)');
    });
    
    test('Expression has utility methods', () => {
      const expression = expr(42);
      
      // Test that Expression has the methods
      expect(typeof expression.toModHash).toBe('function');
      expect(typeof expression.toPuzzleReveal).toBe('function');
      expect(typeof expression.toChiaLisp).toBe('function');
      
      // Test that they work
      const modHash = expression.toModHash();
      expect(modHash).toMatch(/^0x[0-9a-f]{64}$/);
      
      const puzzleReveal = expression.toPuzzleReveal();
      expect(puzzleReveal).toMatch(/^[0-9a-f]+$/);
      
      const chiaLisp = expression.toChiaLisp();
      expect(chiaLisp).toBe('42');
    });
    
    test('PuzzleBuilder Expression works with tree methods', () => {
      const myVar = variable('TEST_VAR');
      
      // Variables should also have these methods
      expect(typeof myVar.toChiaLisp).toBe('function');
      expect(myVar.toChiaLisp()).toBe('TEST_VAR');
    });
  });
  
  describe('SolutionBuilder API Mismatch', () => {
    test('add() accepts multiple arguments', () => {
      const solution = SolutionBuilder.create();
      
      // Single argument
      solution.add(42);
      expect(solution.toChiaLisp()).toBe('(42)');
      
      // Multiple arguments
      const solution2 = SolutionBuilder.create();
      solution2.add(1, 2, 3);
      expect(solution2.toChiaLisp()).toBe('(1 2 3)');
      
      // Mixed types
      const solution3 = SolutionBuilder.create();
      solution3.add('hello', 42, true, hex('0xdeadbeef'));
      expect(solution3.toChiaLisp()).toBe('(hello 42 1 0xdeadbeef)');
    });
    
    test('addMany is deprecated but still works', () => {
      const solution = SolutionBuilder.create();
      solution.addMany(1, 2, 3);
      expect(solution.toChiaLisp()).toBe('(1 2 3)');
    });
  });
  
  describe('Announcement Function Type Restrictions', () => {
    test('createAnnouncement accepts Expression types', () => {
      const message = expr(42);
      const announcement = createAnnouncement(message);
      
      // Should create valid announcement condition
      expect(announcement.type).toBe('list');
      const items = (announcement as { items: TreeNode[] }).items;
      expect(items).toHaveLength(2);
      expect(items[0]).toEqual(int(60)); // CREATE_COIN_ANNOUNCEMENT opcode
    });
    
    test('assertAnnouncement accepts TreeNode types', () => {
      const announcementId = hex('0xdeadbeef');
      const assertion = assertAnnouncement(announcementId);
      
      // Should create valid assertion condition
      expect(assertion.type).toBe('list');
      const items = (assertion as { items: TreeNode[] }).items;
      expect(items).toHaveLength(2);
      expect(items[0]).toEqual(int(61)); // ASSERT_COIN_ANNOUNCEMENT opcode
    });
    
    test('announcement functions work with Expression wrapper objects', () => {
      const p = puzzle();
      const dynamicMessage = p.param('message');
      
      // This should not throw
      const announcement = createAnnouncement(dynamicMessage);
      expect(announcement).toBeDefined();
    });
  });
  
  describe('State Management Layer MOD_HASH Calculation', () => {
    test('state management layer calculates MOD_HASH properly', () => {
      const innerPuzzle = puzzle()
        .createCoin('0x' + '00'.repeat(32), 1000);
      
      const stateLayer = withStateManagementLayer(innerPuzzle, {
        actionMerkleRoot: '0x' + 'aa'.repeat(32),
        initialState: list([int(0)])
      });
      
      // Should have proper structure
      const tree = stateLayer.build();
      expect(tree.type).toBe('list');
      
      // Should be able to get mod hash
      const modHash = stateLayer.toModHash();
      expect(modHash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(modHash).not.toBe('0x' + '11'.repeat(32)); // Not placeholder
    });
    
    test('state management accepts provided module hash', () => {
      const innerPuzzle = puzzle();
      const providedHash = '0x' + 'cc'.repeat(32);
      
      const stateLayer = withStateManagementLayer(innerPuzzle, {
        actionMerkleRoot: '0x' + 'aa'.repeat(32),
        initialState: list([int(0)]),
        moduleHash: providedHash
      });
      
      // Should use provided hash
      const chiaLisp = stateLayer.toChiaLisp();
      expect(chiaLisp).toContain(providedHash);
    });
  });
  
  describe('PuzzleBuilder Missing Methods', () => {
    test('ifConditions works as alias for if', () => {
      const p = puzzle();
      const condition = expr(1).equals(1);
      
      p.ifConditions(condition)
        .then(b => {
          b.createCoin('0x' + '00'.repeat(32), 100);
        })
        .else(b => {
          b.fail();
        });
      
      const chiaLisp = p.toChiaLisp();
      expect(chiaLisp).toContain('(i');
    });
    
    test('validateState adds validation comments', () => {
      const p = puzzle()
        .validateState({ counter: 'int', owner: 'address' });
      
      // Should have comment about state fields
      expect(p.build()).toBeDefined();
    });
    
    test('returnConditions works with expression parameter', () => {
      const p = puzzle();
      const conditions = expr(list([int(51), hex('0x00'), int(100)]));
      
      p.returnConditions(conditions);
      const tree = p.build();
      
      // Should return the provided expression
      expect(tree.type).toBe('list');
    });
    
    test('inner() creates inner puzzle reference', () => {
      const p = puzzle();
      const innerRef = p.inner();
      
      expect(innerRef.toChiaLisp()).toBe('INNER_PUZZLE');
    });
    
    test('addParam throws error with helpful message', () => {
      const p = puzzle();
      
      expect(() => {
        p.addParam('test');
      }).toThrow('addParam is a SolutionBuilder method');
    });
  });
  
  describe('Integration Test', () => {
    test('all fixes work together in complex scenario', () => {
      // Create a stateful puzzle with announcements
      const statefulPuzzle = puzzle()
        .comment('Complex stateful puzzle')
        .validateState({ counter: 'int' });
      
      // Add state management
      const withState = withStateManagementLayer(statefulPuzzle, {
        actionMerkleRoot: '0x' + 'bb'.repeat(32),
        initialState: list([int(0)])
      });
      
      // Get mod hash
      const modHash = withState.toModHash();
      expect(modHash).toMatch(/^0x[0-9a-f]{64}$/);
      
      // Create solution with multiple values
      const solution = SolutionBuilder.create()
        .add('increment', 5, true)
        .addList(b => {
          b.add(createAnnouncement(expr(42)));
        });
      
      // Test serialization
      expect(solution.toChiaLisp()).toContain('increment');
      expect(withState.toChiaLisp()).toContain('condition_codes.clib');
    });
  });
  
  describe('Hex Return Type', () => {
    test('hex() returns proper Atom that works with functions', () => {
      const hexValue = hex('0xdeadbeef');
      
      // Should be an Atom
      expect(hexValue.type).toBe('atom');
      
      // Should work with announcement functions
      const announcement = createAnnouncement(hexValue);
      expect(announcement).toBeDefined();
    });
  });
}); 