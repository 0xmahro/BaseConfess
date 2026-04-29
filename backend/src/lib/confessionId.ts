import { CONTRACT_ADDRESS } from '../../config/contract.js';

/**
 * Mirrors `frontend/lib/confessionId.ts` so the listener-driven writes use the
 * same id namespace as the frontend writes. The redeployed contract restarts
 * confession ids from 1, which collides with rows already stored in Supabase
 * from earlier deployments. We add this offset to disambiguate.
 */
export const NEW_CONTRACT_DB_OFFSET = BigInt(10_000_000_000);

export function toDbConfessionId(
  onchainId: bigint,
  contractAddress: `0x${string}` = CONTRACT_ADDRESS,
): bigint {
  if (contractAddress.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
    return NEW_CONTRACT_DB_OFFSET + onchainId;
  }
  return onchainId;
}
