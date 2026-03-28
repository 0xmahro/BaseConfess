// ============================================================
// CONTRACT CONFIGURATION
// ============================================================
// After deploying Confessions.sol to Base network:
//   1. Replace CONTRACT_ADDRESS with your deployed address
//   2. The ABI below is pre-generated from Confessions.sol —
//      no changes needed unless you modify the contract.
// ============================================================

export const CONTRACT_ADDRESS =
  '0xD11cB9c3F69650293370Ea38eb688010E0DDCe8d' as `0x${string}`;

export const CONFESSION_FEE = '0.000025'; // ETH — must match confessionFee in contract

// ============================================================
// PROFILE SYSTEM CONFIGURATION
// ============================================================
// Deploy ProfileSystem.sol and set this address.
// ============================================================
export const PROFILE_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_PROFILE_SYSTEM_ADDRESS ??
    '0x0000000000000000000000000000000000000000') as `0x${string}`;

export const PROFILE_CREATION_FEE = '0.00005'; // ETH — must match profileCreationFee in contract
export const USERNAME_CHANGE_FEE = '0.00005'; // ETH — must match usernameChangeFee in contract

export const PROFILE_CONTRACT_ABI = [
  {
    name: 'usernameOwner',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'bytes32', internalType: 'bytes32' }],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
  },
  {
    name: 'profileCreationFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
  },
  {
    name: 'usernameChangeFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
  },
  {
    name: 'getProfile',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address', internalType: 'address' }],
    outputs: [
      { name: 'exists', type: 'bool', internalType: 'bool' },
      { name: 'owner', type: 'address', internalType: 'address' },
      { name: 'username', type: 'string', internalType: 'string' },
      { name: 'tags', type: 'string[]', internalType: 'string[]' },
      { name: 'activityScore', type: 'uint256', internalType: 'uint256' },
      { name: 'totalTipsReceived', type: 'uint256', internalType: 'uint256' },
      { name: 'totalSpent', type: 'uint256', internalType: 'uint256' },
      { name: 'confessionCount', type: 'uint256', internalType: 'uint256' },
    ],
  },
  {
    name: 'createProfile',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'username', type: 'string', internalType: 'string' },
      { name: 'tags', type: 'string[]', internalType: 'string[]' },
    ],
    outputs: [],
  },
  {
    name: 'updateUsername',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'newUsername', type: 'string', internalType: 'string' }],
    outputs: [],
  },
  {
    name: 'updateTags',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tags', type: 'string[]', internalType: 'string[]' }],
    outputs: [],
  },
  {
    name: 'sendTip',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'to', type: 'address', internalType: 'address' }],
    outputs: [],
  },
] as const;

// ============================================================
// WISH BOX
// ============================================================
// Deploy WishBox.sol and set NEXT_PUBLIC_WISH_BOX_ADDRESS.
// ============================================================
export const WISH_BOX_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_WISH_BOX_ADDRESS ??
    '0x0000000000000000000000000000000000000000') as `0x${string}`;

/** Must match `fee` in WishBox.sol (used as fallback before RPC reads). */
export const WISH_BOX_FEE = '0.00003';

export const WISH_BOX_ABI = [
  {
    name: 'createWish',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'category', type: 'string', internalType: 'string' }],
    outputs: [],
  },
  {
    name: 'totalWishes',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
  },
  {
    name: 'getWishes',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        components: [
          { name: 'creator', type: 'address', internalType: 'address' },
          { name: 'category', type: 'string', internalType: 'string' },
          { name: 'timestamp', type: 'uint256', internalType: 'uint256' },
        ],
      },
    ],
  },
  {
    name: 'categoryCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'string', internalType: 'string' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
  },
  {
    name: 'fee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
  },
] as const;

export const CONTRACT_ABI = [
  {
    inputs: [],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    name: 'ConfessionPosted',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'confessionId',   type: 'uint256', indexed: true,  internalType: 'uint256' },
      { name: 'user',           type: 'address', indexed: true,  internalType: 'address' },
      { name: 'confessionHash', type: 'bytes32', indexed: false, internalType: 'bytes32' },
      { name: 'timestamp',      type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
  },
  {
    name: 'ConfessionVoted',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'confessionId', type: 'uint256', indexed: true,  internalType: 'uint256' },
      { name: 'voter',        type: 'address', indexed: true,  internalType: 'address' },
      { name: 'vote',         type: 'int8',    indexed: false, internalType: 'int8'    },
    ],
  },
  {
    name: 'ConfessionTipped',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'confessionId', type: 'uint256', indexed: true,  internalType: 'uint256' },
      { name: 'from',         type: 'address', indexed: true,  internalType: 'address' },
      { name: 'to',           type: 'address', indexed: true,  internalType: 'address' },
      { name: 'amount',       type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
  },
  {
    name: 'FeeUpdated',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'newFee', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
  },
  {
    name: 'confessionCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
  },
  {
    name: 'confessionFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
  },
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
  },
  {
    name: 'confessionOwner',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'address', internalType: 'address' }],
  },
  {
    name: 'votes',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
      { name: '', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: '', type: 'int8', internalType: 'int8' }],
  },
  {
    name: 'setConfessionFee',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'newFee', type: 'uint256', internalType: 'uint256' }],
    outputs: [],
  },
  {
    name: 'postConfession',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'confessionHash', type: 'bytes32', internalType: 'bytes32' }],
    outputs: [],
  },
  {
    name: 'vote',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'confessionId', type: 'uint256', internalType: 'uint256' },
      { name: 'voteType',     type: 'int8',    internalType: 'int8'    },
    ],
    outputs: [],
  },
  {
    name: 'tip',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{ name: 'confessionId', type: 'uint256', internalType: 'uint256' }],
    outputs: [],
  },
] as const;
