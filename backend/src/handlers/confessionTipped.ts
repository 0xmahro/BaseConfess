import { formatEther } from 'viem';
import { supabase } from '../lib/supabase.js';

interface ConfessionTippedArgs {
  confessionId: bigint;
  from: `0x${string}`;
  to: `0x${string}`;
  amount: bigint;
}

/**
 * Handles ConfessionTipped events.
 *
 * 1. Inserts a tip record into the tips table.
 * 2. Increments tips_received on the confession row.
 */
export async function handleConfessionTipped(args: ConfessionTippedArgs) {
  const { confessionId, from, to, amount } = args;
  const confessionIdNum = Number(confessionId);

  console.log(`[ConfessionTipped] id=${confessionId} from=${from} amount=${formatEther(amount)} ETH`);

  // ── 1. Insert tip record ─────────────────────────────────────────────────
  const { error: tipError } = await supabase.from('tips').insert({
    confession_id: confessionIdNum,
    from_wallet:   from.toLowerCase(),
    to_wallet:     to.toLowerCase(),
    amount:        formatEther(amount),
    timestamp:     new Date().toISOString(),
  });

  if (tipError) {
    console.error('[ConfessionTipped] Tip insert error:', tipError.message);
    return;
  }

  // ── 2. Increment tips_received on the confession ─────────────────────────
  const { data: confession, error: fetchError } = await supabase
    .from('confessions')
    .select('tips_received')
    .eq('id', confessionIdNum)
    .maybeSingle();

  if (fetchError || !confession) {
    console.warn(`[ConfessionTipped] Confession ${confessionId} not found in DB – skipping tips_received update`);
    return;
  }

  const { error: updateError } = await supabase
    .from('confessions')
    .update({ tips_received: confession.tips_received + 1 })
    .eq('id', confessionIdNum);

  if (updateError) {
    console.error('[ConfessionTipped] tips_received update error:', updateError.message);
  } else {
    console.log(`[ConfessionTipped] Confession ${confessionId} tips_received=${confession.tips_received + 1}`);
  }
}
