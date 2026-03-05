import { supabase } from '../lib/supabase.js';

interface ConfessionVotedArgs {
  confessionId: bigint;
  voter: `0x${string}`;
  vote: number;
}

/**
 * Handles ConfessionVoted events.
 *
 * 1. Checks for an existing vote from this wallet on this confession.
 * 2. Upserts the vote record (handles vote changes).
 * 3. Adjusts the likes / dislikes counts on the confession row.
 */
export async function handleConfessionVoted(args: ConfessionVotedArgs) {
  const { confessionId, voter, vote: voteType } = args;
  const confessionIdNum = Number(confessionId);
  const walletLower     = voter.toLowerCase();

  console.log(`[ConfessionVoted] id=${confessionId} voter=${voter} vote=${voteType}`);

  // ── 1. Look up any existing vote from this wallet ────────────────────────
  const { data: existingVote } = await supabase
    .from('votes')
    .select('vote')
    .eq('confession_id', confessionIdNum)
    .eq('wallet', walletLower)
    .maybeSingle();

  // ── 2. Upsert the vote record ────────────────────────────────────────────
  const { error: voteError } = await supabase.from('votes').upsert(
    {
      confession_id: confessionIdNum,
      wallet:        walletLower,
      vote:          voteType,
      timestamp:     new Date().toISOString(),
    },
    { onConflict: 'confession_id,wallet' }
  );

  if (voteError) {
    console.error('[ConfessionVoted] Vote upsert error:', voteError.message);
    return;
  }

  // ── 3. Update like / dislike counters on the confession ──────────────────
  const { data: confession, error: fetchError } = await supabase
    .from('confessions')
    .select('likes, dislikes')
    .eq('id', confessionIdNum)
    .maybeSingle();

  if (fetchError || !confession) {
    console.warn(`[ConfessionVoted] Confession ${confessionId} not found in DB yet – skipping counter update`);
    return;
  }

  let { likes, dislikes } = confession;

  // Undo the previous vote's effect
  if (existingVote?.vote === 1)  likes    = Math.max(0, likes - 1);
  if (existingVote?.vote === -1) dislikes = Math.max(0, dislikes - 1);

  // Apply the new vote
  if (voteType === 1)  likes    += 1;
  if (voteType === -1) dislikes += 1;

  const { error: updateError } = await supabase
    .from('confessions')
    .update({ likes, dislikes })
    .eq('id', confessionIdNum);

  if (updateError) {
    console.error('[ConfessionVoted] Counter update error:', updateError.message);
  } else {
    console.log(`[ConfessionVoted] Updated confession ${confessionId}: likes=${likes} dislikes=${dislikes}`);
  }
}
