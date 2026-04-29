import { CONTRACT_ADDRESS } from './config';

/**
 * Synthetic offset used to namespace confession ids that originate from the
 * currently active contract. Existing rows in Supabase carry on-chain ids
 * 1..N from older deployments; new posts on the redeployed contract restart
 * from 1, so we add this offset before writing to avoid id collisions.
 *
 * Existing rows (offset=0) keep their original ids and stay untouched.
 */
export const NEW_CONTRACT_DB_OFFSET = BigInt(10_000_000_000);

/**
 * Convert an on-chain confessionId into the id we store in Supabase.
 * Calls coming from the currently active contract are namespaced; calls
 * referencing legacy contracts keep the raw on-chain id (matching the
 * pre-existing rows already present in the database).
 */
export function toDbConfessionId(
  onchainId: bigint,
  contractAddress: `0x${string}`,
): bigint {
  if (contractAddress.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
    return NEW_CONTRACT_DB_OFFSET + onchainId;
  }
  return onchainId;
}

/**
 * Recover the on-chain confessionId from a database id. Used whenever the
 * frontend needs to talk to a smart contract about a row that may have been
 * stored with the offset above.
 */
export function toOnchainConfessionId(dbId: number | bigint): bigint {
  const id = typeof dbId === 'bigint' ? dbId : BigInt(dbId);
  if (id >= NEW_CONTRACT_DB_OFFSET) return id - NEW_CONTRACT_DB_OFFSET;
  return id;
}
