const { compileCoinScript } = require('../dist/coinscript');
const { createSolution } = require('../dist');

// Note: These would be imported from the runtime module in a complete implementation
// For now, we'll create mock versions to demonstrate the concept
const StateHelpers = {
  encodeState: (state, structure) => {
    console.log('Encoding state for ChiaLisp...');
    return '(0 () false 0x0001)'; // Mock encoded state
  }
};

const StatefulCoinManager = class {
  constructor(stateStructure, actions) {
    this.stateStructure = stateStructure;
    this.actions = actions;
  }
  
  prepareSolution(actionName, currentState, params) {
    return {
      action_name: actionName,
      current_state: '(encoded state)',
      action_params: params,
      merkle_proof: ['0x' + '11'.repeat(32), '0x' + '22'.repeat(32)]
    };
  }
};

// Compile the stateful token
const tokenSource = `
coin StatefulToken {
    storage address admin = 0x0000000000000000000000000000000000000000000000000000000000000001;
    storage uint256 maxSupply = 1000000;
    
    state {
        uint256 totalSupply;
        mapping(address => uint256) balances;
        bool paused;
        address owner;
    }
    
    @stateful
    action mint(address to, uint256 amount) {
        require(msg.sender == state.owner, "Only owner");
        require(!state.paused, "Paused");
        require(state.totalSupply + amount <= maxSupply, "Max supply");
        
        state.totalSupply += amount;
        state.balances[to] += amount;
    }
    
    @stateful
    action transfer(address to, uint256 amount) {
        require(!state.paused, "Paused");
        require(state.balances[msg.sender] >= amount, "Insufficient");
        
        state.balances[msg.sender] -= amount;
        state.balances[to] += amount;
    }
}
`;

console.log('=== Stateful Token Interaction Example ===\n');

// 1. Compile the token
console.log('1. COMPILING TOKEN...');
const result = compileCoinScript(tokenSource);
console.log('Compiled successfully!');
// Note: In a real implementation, metadata would be available
console.log('Actions defined: mint, transfer');
console.log();

// 2. Create initial state
console.log('2. CREATING INITIAL STATE...');
const stateStructure = [
  { name: 'totalSupply', type: 'uint256' },
  { name: 'balances', type: 'mapping' },
  { name: 'paused', type: 'bool' },
  { name: 'owner', type: 'address' }
];

const initialState = {
  totalSupply: 0,
  balances: new Map(),
  paused: false,
  owner: '0x0000000000000000000000000000000000000000000000000000000000000001'
};

// Encode state for ChiaLisp
const encodedState = StateHelpers.encodeState(initialState, stateStructure);
console.log('Initial state encoded');
console.log();

// 3. Create stateful coin manager
console.log('3. SETTING UP COIN MANAGER...');
const coinManager = new StatefulCoinManager(
  stateStructure,
  [
    { name: 'mint', puzzleHash: '0x' + '11'.repeat(32) }, // Placeholder hashes
    { name: 'transfer', puzzleHash: '0x' + '22'.repeat(32) }
  ]
);
console.log('Coin manager created');
console.log();

// 4. Prepare mint transaction
console.log('4. PREPARING MINT TRANSACTION...');
const mintSolution = coinManager.prepareSolution(
  'mint',
  initialState,
  [
    '0x0000000000000000000000000000000000000000000000000000000000000002', // to
    100000 // amount
  ]
);

console.log('Mint solution prepared:');
console.log(`- Action: ${mintSolution.action_name}`);
console.log(`- Current state: ${mintSolution.current_state}`);
console.log(`- Parameters: ${JSON.stringify(mintSolution.action_params)}`);
console.log();

// 5. Create solution object
console.log('5. CREATING SOLUTION OBJECT...');
const solution = createSolution()
  .addAction('mint', [
    '0x0000000000000000000000000000000000000000000000000000000000000002',
    100000
  ])
  .addState(initialState)
  .addMerkleProof(mintSolution.merkle_proof);

console.log('Solution created:');
console.log(solution.serialize());
console.log();

// 6. Simulate state after mint
console.log('6. SIMULATING STATE AFTER MINT...');
const stateAfterMint = {
  ...initialState,
  totalSupply: 100000,
  balances: new Map([
    ['0x0000000000000000000000000000000000000000000000000000000000000002', 100000]
  ])
};

// Prepare transfer
const transferSolution = coinManager.prepareSolution(
  'transfer',
  stateAfterMint,
  [
    '0x0000000000000000000000000000000000000000000000000000000000000003', // to
    50000 // amount
  ]
);

console.log('Transfer solution prepared');
console.log();

// 7. Key concepts
console.log('=== KEY CONCEPTS ===');
console.log('1. State is curried into the puzzle (hidden until spend)');
console.log('2. Actions are separate puzzles validated via merkle proofs');
console.log('3. Solutions contain: action name, current state, parameters, proof');
console.log('4. Coin is recreated with new state after each spend');
console.log('5. State transitions are atomic and verifiable');
console.log();

console.log('=== BENEFITS ===');
console.log('- Privacy: State hidden until spent');
console.log('- Upgradeable: Change actions by updating merkle root');
console.log('- Efficient: Only pay for actual state changes');
console.log('- Composable: Works with CATs, offers, etc.');
console.log('- Auditable: Full state history on-chain'); 