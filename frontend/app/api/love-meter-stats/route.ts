import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = supabaseServer();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [totalRes, dayRes] = await Promise.all([
    sb.from('love_meter_tests').select('id', { head: true, count: 'exact' }),
    sb
      .from('love_meter_tests')
      .select('id', { head: true, count: 'exact' })
      .gte('created_at', cutoff),
  ]);

  // If table is missing yet, keep UI stable with 0 instead of failing.
  if (totalRes.error || dayRes.error) {
    const missingTable =
      totalRes.error?.code === 'PGRST205' || dayRes.error?.code === 'PGRST205';
    if (missingTable) {
      return NextResponse.json({ ok: true, total: 0, last24h: 0, source: 'supabase' });
    }
    return NextResponse.json(
      {
        ok: false,
        error: 'Failed to load Love Meter stats.',
        details: totalRes.error?.message ?? dayRes.error?.message ?? null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    total: totalRes.count ?? 0,
    last24h: dayRes.count ?? 0,
    source: 'supabase',
  });
}

