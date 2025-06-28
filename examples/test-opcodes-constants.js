#!/usr/bin/env node

const { puzzle, expr } = require('../dist');

// Create a puzzle that uses CLVM operators
const myPuzzle = puzzle()
  .includeOpcodes()  // Include the opcodes.clib file
  .comment('Demo of using opcode constants')
  .withSolutionParams('a', 'b')
  .addNode(
    // Instead of using raw operators like '+', we can use constants
    expr.list([
      expr.sym('ADD'),     // ADD constant from opcodes.clib
      expr.param('a'),
      expr.param('b')
    ])
  );

console.log('=== Puzzle with Opcode Constants ===');
console.log(myPuzzle.serialize({ indent: true }));

// Example showing various operators using constants
const operatorDemo = puzzle()
  .includeOpcodes()
  .blockComment('Demonstration of various CLVM operators using constants')
  .withSolutionParams('x', 'y', 'data')
  .comment('Arithmetic operations')
  .addNode(
    expr.list([
      expr.sym('MULTIPLY'),
      expr.list([
        expr.sym('ADD'),
        expr.param('x'),
        expr.param('y')
      ]),
      expr.int(2)
    ])
  )
  .comment('Comparison')
  .addNode(
    expr.list([
      expr.sym('IF'),
      expr.list([
        expr.sym('GT'),
        expr.param('x'),
        expr.param('y')
      ]),
      expr.str('x is greater'),
      expr.str('y is greater or equal')
    ])
  )
  .comment('Crypto operation')
  .addNode(
    expr.list([
      expr.sym('SHA256'),
      expr.param('data')
    ])
  );

console.log('\n=== Operator Demo with Constants ===');
console.log(operatorDemo.serialize({ indent: true }));

// Show that condition codes still work alongside opcodes
const combinedExample = puzzle()
  .includeOpcodes()      // Include opcode constants
  .includeConditionCodes()  // Include condition codes
  .withSolutionParams('amount', 'recipient')
  .comment('Use opcode constant for calculation')
  .addNode(
    expr.list([
      expr.sym('CREATE_COIN'),  // Condition code constant
      expr.param('recipient'),
      expr.list([
        expr.sym('DIVIDE'),     // Opcode constant
        expr.param('amount'),
        expr.int(2)
      ])
    ])
  );

console.log('\n=== Combined Example ===');
console.log(combinedExample.serialize({ indent: true }));