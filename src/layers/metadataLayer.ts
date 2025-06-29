/**
 * Metadata Layer
 * 
 * Manages metadata for any puzzle
 */

import { PuzzleBuilder, puzzle } from '../builder/PuzzleBuilder';
import { TreeNode } from '../core/types';
import { list, hex } from '../core/builders';
import { CLVMOpcode } from '../core/opcodes';

export interface MetadataLayerOptions {
  metadata: Record<string, unknown>;
  updaterPuzzleHash?: string;
  mutable?: boolean;
}

export function withMetadataLayer(
  innerPuzzle: PuzzleBuilder | TreeNode,
  options: MetadataLayerOptions
): PuzzleBuilder {
  const metadata = puzzle();
  metadata.noMod();
  
  const innerTree = innerPuzzle instanceof PuzzleBuilder ? innerPuzzle.build() : innerPuzzle;
  
  metadata.withCurriedParams({
    METADATA: encodeMetadata(options.metadata),
    METADATA_UPDATER_PUZZLE_HASH: options.updaterPuzzleHash || hex('00'.repeat(32)),
    INNER_PUZZLE: innerTree
  });
  
  metadata.withSolutionParams(
    'inner_solution',
    'new_metadata',
    'updater_solution'
  );
  
  metadata.comment('Metadata layer stores structured data');
  
  // Check if metadata update is requested
  if (options.mutable) {
    metadata.if(metadata.param('new_metadata'))
      .then((b: PuzzleBuilder) => {
        b.comment('Update metadata via updater');
        b.addCondition(CLVMOpcode.APPLY, b.param('METADATA_UPDATER_PUZZLE_HASH'), b.param('updater_solution'));
      })
      .else(() => {});
  }
  
  // Run inner puzzle
  metadata.comment('Run inner puzzle with metadata context');
  metadata.addCondition(CLVMOpcode.APPLY,
    metadata.param('INNER_PUZZLE'),
    metadata.param('inner_solution')
  );
  
  return metadata;
}

function encodeMetadata(metadata: Record<string, unknown>): TreeNode {
  const pairs: TreeNode[] = [];
  
  for (const [key, value] of Object.entries(metadata)) {
    pairs.push(list([
      hex(Buffer.from(key).toString('hex')),
      encodeValue(value)
    ]));
  }
  
  return list(pairs);
}

function encodeValue(value: unknown): TreeNode {
  if (typeof value === 'string') {
    return hex(Buffer.from(value).toString('hex'));
  } else if (typeof value === 'number' || typeof value === 'bigint') {
    return hex(value.toString(16).padStart(2, '0'));
  } else if (value instanceof Uint8Array) {
    return hex(Buffer.from(value).toString('hex'));
  } else if (Array.isArray(value)) {
    return list(value.map(v => encodeValue(v)));
  } else if (value && typeof value === 'object') {
    return encodeMetadata(value as Record<string, unknown>);
  } else {
    return hex('');
  }
}

/**
 * Create structured metadata
 * @param data - Metadata object
 * @returns Structured metadata tree
 */
export function createMetadata(data: Record<string, unknown>): TreeNode {
  return list(
    Object.entries(data).map(([key, value]) => 
      list([hex(key), hex(String(value))])
    )
  );
}

/**
 * Parse metadata from tree
 * @param _metadataTree - Metadata tree node
 * @returns Parsed metadata object
 */
export function parseMetadata(_metadataTree: TreeNode): Record<string, unknown> {
  // In real implementation would parse the tree structure
  return {};
} 