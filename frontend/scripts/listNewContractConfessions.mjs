// One-off helper: enumerate confessions stored in the redeployed contract so
// we can backfill Supabase rows whose ids were trampled by earlier writes.
//
// Usage:  node scripts/listNewContractConfessions.mjs
// Outputs JSON with [{ onchainId, wallet, hash, timestamp }] for every
// confession currently stored in the new contract. Reads only.

import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const CONTRACT_ADDRESS = '0x6c22d5F4b3Ff90ddCe263a795AD22f2A3d033140';
const RPC = process.env.BASE_RPC_URL ?? 'https://mainnet.base.org';

const ABI = [
  {
    name: 'totalConfessions',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'confessionOwner',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'ConfessionPosted',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'confessionId', type: 'uint256', indexed: true },
      { name: 'user', type: 'address', indexed: true },
      { name: 'confessionHash', type: 'bytes32', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
];

const client = createPublicClient({ chain: base, transport: http(RPC) });

const total = await client.readContract({
  address: CONTRACT_ADDRESS,
  abi: ABI,
  functionName: 'totalConfessions',
});

const totalNum = Number(total);
process.stderr.write(`new contract totalConfessions = ${totalNum}\n`);

const ownerCalls = [];
for (let i = 1; i <= totalNum; i += 1) {
  ownerCalls.push({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: 'confessionOwner',
    args: [BigInt(i)],
  });
}

const ownerResults = await client.multicall({
  contracts: ownerCalls,
  allowFailure: true,
});

const rows = ownerResults
  .map((r, idx) => {
    if (r.status !== 'success') return null;
    const wallet = String(r.result ?? '').toLowerCase();
    if (!wallet || wallet === '0x0000000000000000000000000000000000000000') return null;
    return { onchainId: idx + 1, wallet };
  })
  .filter(Boolean);

process.stdout.write(JSON.stringify({ totalConfessions: totalNum, rows }, null, 2));
process.stdout.write('\n');
