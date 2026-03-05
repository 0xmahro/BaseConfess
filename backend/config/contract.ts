// ============================================================
// CONTRACT CONFIGURATION
// ============================================================
// After deploying Confessions.sol to Base network:
//   1. Replace CONTRACT_ADDRESS with your deployed address
//   2. The ABI below is pre-generated from Confessions.sol
// ============================================================

export const CONTRACT_ADDRESS =
  '0xD11cB9c3F69650293370Ea38eb688010E0DDCe8d' as `0x${string}`;

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
      { name: 'confessionId', type: 'uint256', indexed: true,  internalType: 'uint256' },
      { name: 'user',         type: 'address', indexed: true,  internalType: 'address' },
      { name: 'confessionHash', type: 'bytes32', indexed: false, internalType: 'bytes32' },
      { name: 'timestamp',    type: 'uint256', indexed: false, internalType: 'uint256' },
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
