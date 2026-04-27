import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

type Timeframe = 'daily' | 'weekly' | 'all';

function parseTimeframe(v: string | null): Timeframe {
  if (v === 'daily' || v === 'weekly' || v === 'all') return v;
  return 'weekly';
}

function parseLimit(v: string | null): number {
  const n = Number(v ?? '');
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(n), MAX_LIMIT);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const timeframe = parseTimeframe(url.searchParams.get('timeframe'));
  const limit = parseLimit(url.searchParams.get('limit'));

  const sb = supabaseServer();
  const { data, error } = await sb
    .from('leaderboard_cache')
    .select('timeframe, updated_at, entries')
    .eq('timeframe', timeframe)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Could not load leaderboard.' }, { status: 500 });
  }

  const entries = (data?.entries as unknown as any[]) ?? [];
  return NextResponse.json({
    timeframe,
    updatedAt: data?.updated_at ?? null,
    entries: entries.slice(0, limit),
  });
}

