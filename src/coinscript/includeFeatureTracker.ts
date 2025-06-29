/**
 * Feature tracker for CoinScript compilation
 * Tracks which functions and features are used to determine required includes
 */

export class IncludeFeatureTracker {
  private features: Set<string> = new Set();
  
  /**
   * Track usage of a function from includes
   */
  trackFunction(functionName: string): void {
    // Map function names to their features
    const functionFeatureMap: Record<string, string> = {
      // sha256tree.clib functions
      'sha256tree': 'sha256tree',
      
      // curry-and-treehash.clinc functions
      'puzzle_hash_of_curried_function': 'curry',
      'tree_hash_of_apply': 'curry',
      'update_hash_for_parameter_hash': 'curry',
      'build_curry_list': 'curry',
      
      // utility_macros.clib
      'assert': 'assert',
      'or': 'or', 
      'and': 'and',
      
      // singleton_truths.clib functions
      'my_id_truth': 'singleton_truths',
      'my_full_puzzle_hash_truth': 'singleton_truths',
      'my_inner_puzzle_hash_truth': 'singleton_truths',
      'my_amount_truth': 'singleton_truths',
      'my_lineage_proof_truth': 'singleton_truths',
      'singleton_struct_truth': 'singleton_truths',
      'singleton_mod_hash_truth': 'singleton_truths',
      'singleton_launcher_id_truth': 'singleton_truths',
      'singleton_launcher_puzzle_hash_truth': 'singleton_truths',
      'truth_data_to_truth_struct': 'singleton_truths',
      'parent_info_for_lineage_proof': 'singleton_truths',
      'puzzle_hash_for_lineage_proof': 'singleton_truths',
      'amount_for_lineage_proof': 'singleton_truths',
      'is_not_eve_proof': 'singleton_truths',
      'parent_info_for_eve_proof': 'singleton_truths',
      'amount_for_eve_proof': 'singleton_truths',
      
      // cat_truths.clib functions
      'cat_truth_data_to_truth_struct': 'cat_truths',
      'my_inner_puzzle_hash_cat_truth': 'cat_truths',
      'cat_struct_truth': 'cat_truths',
      'my_id_cat_truth': 'cat_truths',
      'my_coin_info_truth': 'cat_truths',
      'my_amount_cat_truth': 'cat_truths',
      'my_full_puzzle_hash_cat_truth': 'cat_truths',
      'my_parent_cat_truth': 'cat_truths',
      'cat_mod_hash_truth': 'cat_truths',
      'cat_mod_hash_hash_truth': 'cat_truths',
      'cat_tail_program_hash_truth': 'cat_truths'
    };
    
    const feature = functionFeatureMap[functionName];
    if (feature) {
      this.features.add(feature);
    }
  }
  
  /**
   * Track usage of a condition opcode
   */
  trackCondition(conditionName: string): void {
    this.features.add(conditionName);
  }
  
  /**
   * Get all tracked features
   */
  getFeatures(): Set<string> {
    return new Set(this.features);
  }
  
  /**
   * Clear all tracked features
   */
  clear(): void {
    this.features.clear();
  }
} 