import { NextResponse } from 'next/server';
import { parseEther } from 'viem';
import { supabaseServer } from '@/lib/supabaseServer';

type Timeframe = 'daily' | 'weekly' | 'all';

function parseTimeframe(v: string | null): Timeframe {
  if (v === 'daily' || v === 'weekly' || v === 'all') return v;
  return 'weekly';
}

function requireSecret(req: Request) {
  const hdr =
    req.headers.get('x-leaderboard-secret') ??
    req.headers.get('x-leaderboard-token') ??
    '';

  const auth = req.headers.get('authorization') ?? '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : '';

  const url = new URL(req.url);
  const qp = url.searchParams.get('secret') ?? '';

  const got = (hdr || bearer || qp).trim();
  const want = (process.env.LEADERBOARD_REBUILD_SECRET ?? '').trim();
  if (!want || !got || got !== want) throw new Error('Unauthorized');
}

type Acc = {
  user: string;
  confessionCount: number;
  likes: number;
  tipsWei: string;
  score: number;
};

function touch(map: Map<string, Acc>, addr: string): Acc {
  const key = addr.toLowerCase();
  const cur = map.get(key);
  if (!cur) {
    const next: Acc = {
      user: key,
      confessionCount: 0,
      likes: 0,
      tipsWei: '0',
      score: 0,
    };
    map.set(key, next);
    return next;
  }
  return cur;
}

function cutoffIso(timeframe: Timeframe): string | null {
  const now = Date.now();
  if (timeframe === 'daily') return new Date(now - 24 * 60 * 60 * 1000).toISOString();
  if (timeframe === 'weekly') return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  return null;
}

export async function POST(req: Request) {
  try {
    requireSecret(req);
  } catch {
    const hdr =
      req.headers.get('x-leaderboard-secret') ??
      req.headers.get('x-leaderboard-token') ??
      '';
    const auth = req.headers.get('authorization') ?? '';
    const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : '';
    const url = new URL(req.url);
    const qp = url.searchParams.get('secret') ?? '';

    const got = (hdr || bearer || qp).trim();
    const want = (process.env.LEADERBOARD_REBUILD_SECRET ?? '').trim();

    return NextResponse.json(
      {
        error: 'Unauthorized',
        debug: {
          secretConfigured: Boolean(want),
          configuredLength: want.length,
          providedLength: got.length,
        },
      },
      { status: 401 }
    );
  }

  try {
    const url = new URL(req.url);
    const timeframe = parseTimeframe(url.searchParams.get('timeframe'));
    const cutoff = cutoffIso(timeframe);
    const sb = supabaseServer();

    // 1) Confession owner map (needed to attribute votes to confession owners)
    const { data: ownersData, error: ownersError } = await sb
      .from('confessions')
      .select('id,wallet');
    if (ownersError) {
      return NextResponse.json(
        { error: 'Failed to read confessions owners.', supabase: ownersError.message },
        { status: 500 }
      );
    }
    const ownerByConfessionId = new Map<number, string>();
    for (const row of (ownersData ?? []) as { id: number; wallet: string }[]) {
      ownerByConfessionId.set(Number(row.id), row.wallet.toLowerCase());
    }

    const acc = new Map<string, Acc>();

    // 2) Confession posts (+1)
    let confessionQ = sb.from('confessions').select('wallet,timestamp');
    if (cutoff) confessionQ = confessionQ.gte('timestamp', cutoff);
    const { data: confRows, error: confErr } = await confessionQ;
    if (confErr) {
      return NextResponse.json(
        { error: 'Failed to read confessions.', supabase: confErr.message },
        { status: 500 }
      );
    }
    for (const row of (confRows ?? []) as { wallet: string; timestamp: string }[]) {
      const u = touch(acc, row.wallet);
      u.confessionCount += 1;
      u.score += 1;
    }

    // 3) Likes (+3) — votes table stores latest vote per (confession, wallet)
    let votesQ = sb.from('votes').select('confession_id,vote,timestamp').eq('vote', 1);
    if (cutoff) votesQ = votesQ.gte('timestamp', cutoff);
    const { data: voteRows, error: voteErr } = await votesQ;
    if (voteErr) {
      return NextResponse.json(
        { error: 'Failed to read votes.', supabase: voteErr.message },
        { status: 500 }
      );
    }
    for (const row of (voteRows ?? []) as { confession_id: number; vote: number }[]) {
      const owner = ownerByConfessionId.get(Number(row.confession_id));
      if (!owner) continue;
      const u = touch(acc, owner);
      u.likes += 1;
      u.score += 3;
    }

    // 4) Tips (+5 each tip tx, totalTips in wei)
    let tipsQ = sb.from('tips').select('to_wallet,amount,timestamp');
    if (cutoff) tipsQ = tipsQ.gte('timestamp', cutoff);
    const { data: tipRows, error: tipErr } = await tipsQ;
    if (tipErr) {
      return NextResponse.json(
        { error: 'Failed to read tips.', supabase: tipErr.message },
        { status: 500 }
      );
    }
    for (const row of (tipRows ?? []) as { to_wallet: string; amount: string }[]) {
      const u = touch(acc, row.to_wallet);
      u.score += 5;
      try {
        u.tipsWei = (BigInt(u.tipsWei) + parseEther(row.amount || '0')).toString();
      } catch {
        // If amount is malformed in some old row, just skip wei sum for that row.
      }
    }

    const entries = Array.from(acc.values())
      .sort((a, b) => b.score - a.score || b.confessionCount - a.confessionCount || a.user.localeCompare(b.user))
      .map((e, idx) => ({
        rank: idx + 1,
        user: e.user,
        score: e.score,
        confessionCount: e.confessionCount,
        likes: e.likes,
        tipsWei: e.tipsWei,
        badge: idx + 1 <= 10 ? 'Elite Soul' : idx + 1 <= 100 ? 'Active Soul' : null,
      }));

    const { error } = await sb
      .from('leaderboard_cache')
      .upsert(
        {
          timeframe,
          updated_at: new Date().toISOString(),
          entries,
          from_block: cutoff ?? 'all',
          to_block: 'supabase',
        } as any,
        { onConflict: 'timeframe' }
      );

    if (error) {
      return NextResponse.json(
        {
          error: 'Failed to write cache.',
          supabase: {
            message: error.message,
            details: (error as any).details ?? null,
            hint: (error as any).hint ?? null,
            code: (error as any).code ?? null,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      timeframe,
      source: 'supabase',
      cutoff: cutoff ?? null,
      count: entries.length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: 'Rebuild failed.', message: msg }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const debug = url.searchParams.get('debug') === '1';
  const want = (process.env.LEADERBOARD_REBUILD_SECRET ?? '').trim();
  const configured = Boolean(want);
  if (!debug) {
    return NextResponse.json({ ok: true, configured }, { status: 200 });
  }
  return NextResponse.json(
    {
      ok: true,
      configured,
      configuredLength: want.length,
      hasServiceRoleKey: Boolean((process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()),
      hasSupabaseUrl: Boolean((process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()),
      mode: 'supabase',
    },
    { status: 200 }
  );
}

