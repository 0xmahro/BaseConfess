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
      .select('wallet')
      .order('timestamp', { ascending: false })
      .limit(3000);

    if (error) {
      return NextResponse.json({ ok: false, error: 'Failed to read wallets.' }, { status: 500 });
    }

    const uniqueWallets = Array.from(
      new Set(((confessionRows as { wallet: string }[] | null) ?? []).map((r) => r.wallet?.toLowerCase()).filter(Boolean))
    ) as string[];

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
        profiles.push({
          wallet,
          username,
          tags: (val?.[3] ?? []).filter(Boolean),
          activityScore: Number(val?.[4] ?? BigInt(0)),
          confessionCount: Number(val?.[7] ?? BigInt(0)),
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

