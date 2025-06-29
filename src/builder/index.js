"use strict";
/**
 * Builder Module - Main external interface
 *
 * The PuzzleBuilder is the primary way to interact with the framework
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConditions = exports.createSolution = exports.ConditionListBuilder = exports.SolutionBuilder = exports.arg3 = exports.arg2 = exports.arg1 = exports.amount = exports.variable = exports.expr = exports.puzzle = exports.Expr = exports.Expression = exports.PuzzleBuilder = void 0;
// Export everything except conflicting 'solution' constant
var PuzzleBuilder_1 = require("./PuzzleBuilder");
Object.defineProperty(exports, "PuzzleBuilder", { enumerable: true, get: function () { return PuzzleBuilder_1.PuzzleBuilder; } });
Object.defineProperty(exports, "Expression", { enumerable: true, get: function () { return PuzzleBuilder_1.Expression; } });
Object.defineProperty(exports, "Expr", { enumerable: true, get: function () { return PuzzleBuilder_1.Expr; } });
Object.defineProperty(exports, "puzzle", { enumerable: true, get: function () { return PuzzleBuilder_1.puzzle; } });
Object.defineProperty(exports, "expr", { enumerable: true, get: function () { return PuzzleBuilder_1.expr; } });
Object.defineProperty(exports, "variable", { enumerable: true, get: function () { return PuzzleBuilder_1.variable; } });
// Skip 'solution' constant to avoid conflict
Object.defineProperty(exports, "amount", { enumerable: true, get: function () { return PuzzleBuilder_1.amount; } });
Object.defineProperty(exports, "arg1", { enumerable: true, get: function () { return PuzzleBuilder_1.arg1; } });
Object.defineProperty(exports, "arg2", { enumerable: true, get: function () { return PuzzleBuilder_1.arg2; } });
Object.defineProperty(exports, "arg3", { enumerable: true, get: function () { return PuzzleBuilder_1.arg3; } });
// Export SolutionBuilder and factories
var SolutionBuilder_1 = require("./SolutionBuilder");
Object.defineProperty(exports, "SolutionBuilder", { enumerable: true, get: function () { return SolutionBuilder_1.SolutionBuilder; } });
Object.defineProperty(exports, "ConditionListBuilder", { enumerable: true, get: function () { return SolutionBuilder_1.ConditionListBuilder; } });
Object.defineProperty(exports, "createSolution", { enumerable: true, get: function () { return SolutionBuilder_1.createSolution; } });
Object.defineProperty(exports, "createConditions", { enumerable: true, get: function () { return SolutionBuilder_1.createConditions; } });
