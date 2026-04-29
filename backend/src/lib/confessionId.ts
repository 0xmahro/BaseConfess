import { CONTRACT_ADDRESS } from '../../config/contract.js';

/**
 * Mirrors `frontend/lib/confessionId.ts`. Both the active contract and the
 * previously redeployed contract get their own offset so listener-driven
 * writes never collide with rows from other deployments.
 */
const REDEPLOYED_CONTRACT_FALLBACK = '0x6c22d5F4b3Ff90ddCe263a795AD22f2A3d033140';

const KNOWN_CONTRACT_OFFSETS: { offset: bigint; address: `0x${string}` }[] = [
  { offset: BigInt(20_000_000_000), address: CONTRACT_ADDRESS },
  { offset: BigInt(10_000_000_000), address: REDEPLOYED_CONTRACT_FALLBACK as `0x${string}` },
];

export function toDbConfessionId(
  onchainId: bigint,
  contractAddress: `0x${string}` = CONTRACT_ADDRESS,
): bigint {
  const lower = contractAddress.toLowerCase();
  for (const entry of KNOWN_CONTRACT_OFFSETS) {
    if (entry.address.toLowerCase() === lower) {
      return entry.offset + onchainId;
    }
  }
  return onchainId;
}
