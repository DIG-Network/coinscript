/**
 * Chialisp Puzzle Library
 * 
 * Manages loading and caching of standard Chialisp puzzles from .clsp files
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PuzzleBuilder, puzzle } from '../builder/PuzzleBuilder';
import { TreeNode, Atom } from '../core/types';
import { parseChialisp } from './parser';
import { calculateModHash } from '../core/utils';

/**
 * Standard puzzle types and their file locations
 */
export const PUZZLE_TYPES = {
  // Singleton puzzles
  SINGLETON_TOP_LAYER_V1_1: 'singleton/singleton_top_layer_v1_1.clsp',
  SINGLETON_TOP_LAYER: 'singleton/singleton_top_layer.clsp',
  SINGLETON_LAUNCHER: 'singleton/singleton_launcher.clsp',
  P2_SINGLETON_OR_DELAYED: 'singleton/p2_singleton_or_delayed_puzhash.clsp',
  
  // CAT puzzles
  CAT_V1: 'cat/cat1.clsp',
  CAT_V2: 'cat/cat_v2.clsp',
  DELEGATED_TAIL: 'cat/delegated_tail.clsp',
  EVERYTHING_WITH_SIGNATURE: 'cat/everything_with_signature.clsp',
  GENESIS_BY_COIN_ID: 'cat/genesis_by_coin_id.clsp',
  MELTABLE_GENESIS_BY_COIN_ID: 'cat/meltable_genesis_by_coin_id.clsp',
  
  // NFT puzzles
  NFT_INTERMEDIATE_LAUNCHER: 'nft/nft_intermediate_launcher.clsp',
  NFT_METADATA_UPDATER: 'nft/nft_metadata_updater_default.clsp',
  NFT_OWNERSHIP_LAYER: 'nft/nft_ownership_layer.clsp',
  NFT_STATE_LAYER: 'nft/nft_state_layer.clsp',
  NFT_OWNERSHIP_TRANSFER: 'nft/nft_ownership_transfer_program_one_way_claim_with_royalties.clsp',
  
  // DID puzzles
  DID_INNER_PUZZLE: 'did/did_innerpuz.clsp',
  
  // Standard puzzles
  P2_CONDITIONS: 'standard/p2_conditions.clsp',
  P2_DELEGATED_OR_HIDDEN: 'standard/p2_delegated_puzzle_or_hidden_puzzle.clsp',
  DEFAULT_HIDDEN_PUZZLE: 'standard/default_hidden_puzzle.clsp',
  CALCULATE_SYNTHETIC_PUBLIC_KEY: 'standard/calculate_synthetic_public_key.clsp',
  
  // Offer puzzles
  SETTLEMENT_PAYMENTS: 'offer/settlement_payments.clsp',
  SETTLEMENT_PAYMENTS_OLD: 'offer/settlement_payments_old.clsp',
  
  // Pool NFT puzzles
  POOL_MEMBER_INNER: 'plot_nft/pool_member_innerpuz.clsp',
  POOL_WAITING_ROOM: 'plot_nft/pool_waitingroom_innerpuz.clsp',
  
  // Notification puzzles
  NOTIFICATION: 'notification/notification.clsp',
  
  // Exchange puzzles
  P2_DELAYED_OR_PREIMAGE: 'exchange/p2_delayed_or_preimage.clsp'
} as const;

export type PuzzleType = keyof typeof PUZZLE_TYPES;

/**
 * Cache for loaded puzzles
 */
const puzzleCache = new Map<string, ChialispPuzzle>();
const modHashCache = new Map<string, string>();

/**
 * Represents a loaded Chialisp puzzle
 */
export interface ChialispPuzzle {
  name: string;
  source: string;
  ast: TreeNode;
  modHash: string;
  parameters: string[];
}

/**
 * Get the library path for Chialisp puzzles
 */
function getLibPath(): string {
  // Try different possible locations
  const possiblePaths = [
    join(__dirname),  // src/chialisp
    join(process.cwd(), 'src/chialisp'),
    join(__dirname, '../chialisp')
  ];
  
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }
  
  throw new Error('Could not find Chialisp puzzle library. Expected at src/chialisp/');
}

/**
 * Load a Chialisp puzzle from file
 */
export function loadChialispPuzzle(puzzleType: PuzzleType): ChialispPuzzle {
  const filePath = PUZZLE_TYPES[puzzleType];
  
  // Check cache first
  if (puzzleCache.has(filePath)) {
    return puzzleCache.get(filePath)!;
  }
  
  const libPath = getLibPath();
  const fullPath = join(libPath, filePath);
  
  if (!existsSync(fullPath)) {
    throw new Error(`Chialisp puzzle not found: ${fullPath}`);
  }
  
  const source = readFileSync(fullPath, 'utf-8');
  
  // Parse the Chialisp code
  const ast = parseChialisp(source);
  
  // Extract parameters from the mod definition
  const parameters = extractParameters(ast);
  
  // Calculate mod hash
  const modHash = calculateModHash(ast);
  
  const puzzle: ChialispPuzzle = {
    name: puzzleType,
    source,
    ast,
    modHash,
    parameters
  };
  
  // Cache it
  puzzleCache.set(filePath, puzzle);
  modHashCache.set(puzzleType, modHash);
  
  return puzzle;
}

/**
 * Get the mod hash for a puzzle type
 */
export function getModHash(puzzleType: PuzzleType): string {
  if (modHashCache.has(puzzleType)) {
    return modHashCache.get(puzzleType)!;
  }
  
  const puzzle = loadChialispPuzzle(puzzleType);
  return puzzle.modHash;
}

/**
 * Create a PuzzleBuilder that references a Chialisp puzzle
 */
export function createChialispPuzzle(puzzleType: PuzzleType): PuzzleBuilder {
  const chialisppuzzle = loadChialispPuzzle(puzzleType);
  
  const builder = puzzle();
  builder.comment(`Standard puzzle: ${puzzleType}`);
  
  // Set the mod to reference the loaded puzzle
  builder.withMod(chialisppuzzle.ast);
  
  // Add parameters if any
  if (chialisppuzzle.parameters.length > 0) {
    // Extract curried vs solution parameters
    const curriedParams: string[] = [];
    const solutionParams: string[] = [];
    
    for (const param of chialisppuzzle.parameters) {
      if (param.toUpperCase() === param) {
        // Uppercase params are typically curried
        curriedParams.push(param);
      } else {
        // Lowercase params are typically solution parameters
        solutionParams.push(param);
      }
    }
    
    if (curriedParams.length > 0) {
      const paramObj: Record<string, string> = {};
      curriedParams.forEach(p => paramObj[p] = p);
      builder.withCurriedParams(paramObj);
    }
    
    if (solutionParams.length > 0) {
      builder.withSolutionParams(...solutionParams);
    }
  }
  
  return builder;
}

/**
 * Extract parameters from a Chialisp AST
 */
function extractParameters(ast: TreeNode): string[] {
  // In Chialisp, parameters are in the mod definition
  // (mod (param1 param2 ...) body)
  
  if (ast.type === 'list' && ast.items.length >= 2) {
    const firstItem = ast.items[0];
    if (firstItem.type === 'atom' && firstItem.value === 'mod') {
      const paramList = ast.items[1];
      if (paramList.type === 'list') {
        return paramList.items
          .filter((item): item is Atom => item.type === 'atom' && typeof item.value === 'string')
          .map(item => item.value as string);
      }
    }
  }
  
  return [];
}

/**
 * Known mod hashes for standard puzzles
 * These are the actual hashes from the Chia blockchain
 */
export const STANDARD_MOD_HASHES = {
  SINGLETON_TOP_LAYER_V1_1: '0x7faa3253bfddd1e0decb0906b2dc6247bbc4cf608f58345d173adb63e8b47c9f',
  SINGLETON_LAUNCHER: '0xeff07522495060c066f66f32acc2a77e3a3e737aca8baea4d1a64ea4cdc13da9',
  CAT_V2: '0x37bef360ee858133b69d595a906dc45d01af729379630c8d9f567c5b4b6a9d75',
  NFT_STATE_LAYER: '0x053c9e48e5a1d2fa15d09c7616f3e0aa71812c1dd925ec090ecf6c6829bab3ad',
  NFT_OWNERSHIP_LAYER: '0xc5abea79afaa001b5427dfa0c8cf42ca6f38f5841b78f9b3c252733eb2de2726',
  DID_INNER_PUZZLE: '0xd82107e88b1cf52bf3a782497697fa60af221a152e38b8cf7a09b9ae3e7dccd6',
  P2_CONDITIONS: '0x13e29a62b42cd2333a1700e4e7a1fce9f9fd58586c043990b0bc2b51c8dbf0dc',
  SETTLEMENT_PAYMENTS: '0xbae24162efbd568f89bc7a340798a6118df0189eb9e3f8697bcea27af99f8f79'
} as const;

/**
 * Get the actual mod hash for known puzzles
 */
export function getStandardModHash(puzzleType: PuzzleType): string {
  // Return known hash if available
  if (puzzleType in STANDARD_MOD_HASHES) {
    return STANDARD_MOD_HASHES[puzzleType as keyof typeof STANDARD_MOD_HASHES];
  }
  
  // Otherwise load and calculate
  return getModHash(puzzleType);
} 