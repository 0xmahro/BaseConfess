import { supabase } from '../lib/supabase.js';
import { toDbConfessionId } from '../lib/confessionId.js';

interface ConfessionPostedArgs {
  confessionId: bigint;
  user: `0x${string}`;
  confessionHash: `0x${string}`;
  timestamp: bigint;
}

/**
 * Handles ConfessionPosted events.
 *
 * Upserts the confession record into Supabase.
 * The `text` field is intentionally omitted here — it is stored by the
 * frontend after the transaction is confirmed. If the frontend upsert
 * runs first, this handler will not overwrite the text.
 */
export async function handleConfessionPosted(args: ConfessionPostedArgs) {
  const { confessionId, user, confessionHash, timestamp } = args;

  console.log(`[ConfessionPosted] id=${confessionId} wallet=${user}`);

  const dbId = Number(toDbConfessionId(confessionId));
  const { error } = await supabase.from('confessions').upsert(
    {
      id:        dbId,
      wallet:    user.toLowerCase(),
      hash:      confessionHash,
      timestamp: new Date(Number(timestamp) * 1000).toISOString(),
    },
    {
      onConflict:      'id',
      ignoreDuplicates: false,
    }
  );

  if (error) {
    console.error('[ConfessionPosted] Supabase error:', error.message);
  } else {
    console.log(`[ConfessionPosted] Stored confession id=${confessionId}`);
  }
}
