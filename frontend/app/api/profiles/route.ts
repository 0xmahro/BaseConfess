import { NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { PROFILE_CONTRACT_ABI, PROFILE_CONTRACT_ADDRESS } from '@/lib/config';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

type ProfileRow = {
  wallet: string;
  username: string;
  tags: string[];
  confessionCount: number;
  activityScore: number;
};

function rpcUrl() {
  return process.env.BASE_RPC_URL ?? 'https://mainnet.base.org';
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function GET() {
  if (PROFILE_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return NextResponse.json({ ok: true, profiles: [] as ProfileRow[] });
  }

  try {
    const sb = supabaseServer();
    const { data: confessionRows, error } = await sb
      .from('confessions')
      .select('id,wallet')
      .order('timestamp', { ascending: false })
      .limit(3000);

    if (error) {
      return NextResponse.json({ ok: false, error: 'Failed to read wallets.' }, { status: 500 });
    }

    const confRows = (confessionRows as { id: number; wallet: string }[] | null) ?? [];
    const uniqueWallets = Array.from(
      new Set(confRows.map((r) => r.wallet?.toLowerCase()).filter(Boolean))
    ) as string[];

    const confessionCountByWallet = new Map<string, number>();
    const ownerByConfessionId = new Map<number, string>();
    for (const row of confRows) {
      const w = row.wallet?.toLowerCase();
      if (!w) continue;
      ownerByConfessionId.set(Number(row.id), w);
      confessionCountByWallet.set(w, (confessionCountByWallet.get(w) ?? 0) + 1);
    }

    // Score model mirrors leaderboard:
    // confession +1, like received +3, tip tx received +5.
    const likesByWallet = new Map<string, number>();
    const tipTxCountByWallet = new Map<string, number>();

    const { data: votesRows } = await sb
      .from('votes')
      .select('confession_id,vote')
      .eq('vote', 1);
    for (const row of (votesRows as { confession_id: number; vote: number }[] | null) ?? []) {
      const owner = ownerByConfessionId.get(Number(row.confession_id));
      if (!owner) continue;
      likesByWallet.set(owner, (likesByWallet.get(owner) ?? 0) + 1);
    }

    const { data: tipRows } = await sb
      .from('tips')
      .select('to_wallet');
    for (const row of (tipRows as { to_wallet: string }[] | null) ?? []) {
      const w = row.to_wallet?.toLowerCase();
      if (!w) continue;
      tipTxCountByWallet.set(w, (tipTxCountByWallet.get(w) ?? 0) + 1);
    }

    if (uniqueWallets.length === 0) {
      return NextResponse.json({ ok: true, profiles: [] as ProfileRow[] });
    }

    const client = createPublicClient({
      chain: base,
      transport: http(rpcUrl()),
    });

    const profiles: ProfileRow[] = [];
    const walletChunks = chunk(uniqueWallets, 100);

    for (const wallets of walletChunks) {
      const results = await client.multicall({
        allowFailure: true,
        contracts: wallets.map((w) => ({
          address: PROFILE_CONTRACT_ADDRESS,
          abi: PROFILE_CONTRACT_ABI,
          functionName: 'getProfile',
          args: [w as `0x${string}`],
        })),
      });

      results.forEach((r, idx) => {
        if (r.status !== 'success') return;
        const wallet = wallets[idx];
        if (!wallet) return;
        const val = r.result as unknown as [
          boolean,
          `0x${string}`,
          string,
          string[],
          bigint,
          bigint,
          bigint,
          bigint,
        ];
        const exists = Boolean(val?.[0]);
        if (!exists) return;
        const username = (val?.[2] ?? '').trim();
        if (!username) return;
        const confessionCount =
          confessionCountByWallet.get(wallet) ?? Number(val?.[7] ?? BigInt(0));
        const likesReceived = likesByWallet.get(wallet) ?? 0;
        const tipTxCount = tipTxCountByWallet.get(wallet) ?? 0;
        const activityScore = confessionCount + likesReceived * 3 + tipTxCount * 5;
        profiles.push({
          wallet,
          username,
          tags: (val?.[3] ?? []).filter(Boolean),
          activityScore,
          confessionCount,
        });
      });
    }

    profiles.sort((a, b) => b.activityScore - a.activityScore || b.confessionCount - a.confessionCount);

    return NextResponse.json({ ok: true, profiles });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

