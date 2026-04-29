import { CONTRACT_ADDRESS, TRUTH_CONTRACT_FALLBACK_ADDRESS } from './config';

/**
 * Confession id namespacing.
 *
 * Supabase uses a single BIGINT primary key on `confessions.id`. The on-chain
 * `confessionId` of any deployed Confessions contract restarts at 1, so when
 * the project switched contracts the new ids 1..N collided with the legacy
 * rows already stored under those ids. Naively upserting overwrote the
 * legacy data, kept the row count flat, and pushed new posts to the bottom
 * of profile listings.
 *
 * To avoid that without losing data, every contract we know about gets its
 * own large additive offset before we write to the database. Existing legacy
 * rows from earlier deployments stay where they are (offset 0) and never
 * collide with new posts.
 */
const KNOWN_CONTRACT_OFFSETS: { offset: bigint; address: `0x${string}` }[] = [
  { offset: BigInt(20_000_000_000), address: CONTRACT_ADDRESS },
  { offset: BigInt(10_000_000_000), address: TRUTH_CONTRACT_FALLBACK_ADDRESS },
];

/** Convert an on-chain confession id into the id stored in Supabase. */
export function toDbConfessionId(
  onchainId: bigint,
  contractAddress: `0x${string}`,
): bigint {
  const lower = contractAddress.toLowerCase();
  for (const entry of KNOWN_CONTRACT_OFFSETS) {
    if (entry.address.toLowerCase() === lower) {
      return entry.offset + onchainId;
    }
  }
  return onchainId;
}

/** Convert a Supabase row id back into the matching on-chain confession id. */
export function toOnchainConfessionId(dbId: number | bigint): bigint {
  const id = typeof dbId === 'bigint' ? dbId : BigInt(dbId);
  for (const entry of KNOWN_CONTRACT_OFFSETS) {
    const next = entry.offset + BigInt(1_000_000_000);
    if (id >= entry.offset && id < next) {
      return id - entry.offset;
    }
  }
  return id;
}
