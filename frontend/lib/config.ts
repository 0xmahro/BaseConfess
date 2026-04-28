// ============================================================
// CONTRACT CONFIGURATION
// ============================================================
// After deploying Confessions.sol to Base network:
//   1. Replace CONTRACT_ADDRESS with your deployed address
//   2. The ABI below is pre-generated from Confessions.sol —
//      no changes needed unless you modify the contract.
// ============================================================

export const CONTRACT_ADDRESS =
  '0x23BeF661be8c8C251613ac4fC486bc2915403E21' as `0x${string}`;
export const LEGACY_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_LEGACY_CONFESSIONS_ADDRESS ??
    '0xeaa890e6c93264B498773425b6f8f02726c143F4') as `0x${string}`;

export const CONFESSION_FEE = '0.000025'; // ETH — must match confessionFee in contract

// ============================================================
// LOVE METER
// ============================================================
export const LOVE_METER_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_LOVE_METER_ADDRESS ??
    '0x8765bd20c3cC2bCa9e9E42f40447FC0D09e54FA3') as `0x${string}`;

/** Contract creation block on Base (optional). Used to count `LoveTested` logs if `totalTests` is missing on-chain. */
export function getLoveMeterDeployBlock(): bigint | null {
  const raw = process.env.NEXT_PUBLIC_LOVE_METER_DEPLOY_BLOCK;
  if (raw && /^\d+$/.test(raw)) return BigInt(raw);

  // Default deploy block for built-in Love Meter contract address.
  if (
    LOVE_METER_CONTRACT_ADDRESS.toLowerCase() ===
    '0x8765bd20c3cc2bca9e9e42f40447fc0d09e54fa3'
  ) {
    return BigInt(44177702);
  }
  return null;
}

export const LOVE_METER_ABI = [
  {
    name: 'fee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
  },
  {
    name: 'totalTests',
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
    name: 'test',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'name1', type: 'string', internalType: 'string' },
      { name: 'name2', type: 'string', internalType: 'string' },
    ],
    outputs: [{ name: 'percent', type: 'uint8', internalType: 'uint8' }],
  },
  {
    name: 'LoveTested',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', type: 'address', indexed: true, internalType: 'address' },
      { name: 'name1Hash', type: 'bytes32', indexed: true, internalType: 'bytes32' },
      { name: 'name2Hash', type: 'bytes32', indexed: true, internalType: 'bytes32' },
      { name: 'percent', type: 'uint8', indexed: false, internalType: 'uint8' },
      { name: 'paid', type: 'uint256', indexed: false, internalType: 'uint256' },
    ],
  },
] as const;

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
// Deploy WishBox.sol; set WISH_BOX_ADDRESS or NEXT_PUBLIC_WISH_BOX_ADDRESS (see /api/wish-box-config).
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
    name: 'TruthVoted',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'confessionId', type: 'uint256', indexed: true, internalType: 'uint256' },
      { name: 'voter', type: 'address', indexed: true, internalType: 'address' },
      { name: 'isReal', type: 'bool', indexed: false, internalType: 'bool' },
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
    inputs: [{ name: '', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
  },
  {
    name: 'totalConfessions',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
  },
  {
    name: 'MIN_CONFESSION_CHARS',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint16', internalType: 'uint16' }],
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
    inputs: [
      { name: 'confessionHash', type: 'bytes32', internalType: 'bytes32' },
      { name: 'confessionCharCount', type: 'uint16', internalType: 'uint16' },
    ],
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
  {
    name: 'realVotes',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
  },
  {
    name: 'fakeVotes',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
  },
  {
    name: 'hasVoted',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '', type: 'uint256', internalType: 'uint256' },
      { name: '', type: 'address', internalType: 'address' },
    ],
    outputs: [{ name: '', type: 'bool', internalType: 'bool' }],
  },
  {
    name: 'voteTruth',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'confessionId', type: 'uint256', internalType: 'uint256' },
      { name: 'isReal', type: 'bool', internalType: 'bool' },
    ],
    outputs: [],
  },
  {
    name: 'getTruthStats',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'confessionId', type: 'uint256', internalType: 'uint256' }],
    outputs: [
      { name: 'real', type: 'uint256', internalType: 'uint256' },
      { name: 'fake', type: 'uint256', internalType: 'uint256' },
    ],
  },
  {
    name: 'totalLikes',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
  },
  {
    name: 'totalTips',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
  },
  {
    name: 'score',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address', internalType: 'address' }],
    outputs: [{ name: '', type: 'uint256', internalType: 'uint256' }],
  },
  {
    name: 'getUserStats',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address', internalType: 'address' }],
    outputs: [
      { name: '_confessionCount', type: 'uint256', internalType: 'uint256' },
      { name: '_totalLikes', type: 'uint256', internalType: 'uint256' },
      { name: '_totalTips', type: 'uint256', internalType: 'uint256' },
      { name: '_score', type: 'uint256', internalType: 'uint256' },
    ],
  },
] as const;
