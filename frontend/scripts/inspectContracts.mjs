import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const RPC = process.env.BASE_RPC_URL ?? 'https://mainnet.base.org';
const client = createPublicClient({ chain: base, transport: http(RPC) });

const ABI = [
  {
    name: 'totalConfessions',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'confessionFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
];

const ADDRESSES = [
  ['CONTRACT_ADDRESS (current)',   '0x23BeF661be8c8C251613ac4fC486bc2915403E21'],
  ['TRUTH_CONTRACT_FALLBACK',      '0x6c22d5F4b3Ff90ddCe263a795AD22f2A3d033140'],
  ['LEGACY_CONTRACT_ADDRESS',      '0xeaa890e6c93264B498773425b6f8f02726c143F4'],
  ['LEGACY_CONTRACT_ADDRESS_2',    '0xD11cB9c3F69650293370Ea38eb688010E0DDCe8d'],
];

for (const [label, address] of ADDRESSES) {
  try {
    const [total, fee] = await Promise.all([
      client.readContract({ address, abi: ABI, functionName: 'totalConfessions' }).catch(() => null),
      client.readContract({ address, abi: ABI, functionName: 'confessionFee' }).catch(() => null),
    ]);
    console.log(`${label}\n  address: ${address}\n  totalConfessions: ${total}\n  confessionFee:    ${fee}\n`);
  } catch (err) {
    console.log(`${label}\n  address: ${address}\n  error: ${err?.shortMessage ?? err?.message}\n`);
  }
}
