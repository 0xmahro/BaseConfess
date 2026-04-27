'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';

type Timeframe = 'daily' | 'weekly' | 'all';

type Entry = {
  rank: number;
  user: string;
  score: number;
  confessionCount: number;
  likes: number;
  tipsWei: string;
  badge: 'Elite Soul' | 'Active Soul' | null;
};

function shortWallet(w: string) {
  return `${w.slice(0, 6)}...${w.slice(-4)}`;
}

function topGlow(rank: number) {
  if (rank === 1) return 'shadow-[0_0_0_1px_rgba(253,164,175,0.9),0_18px_60px_rgba(236,72,153,0.25)]';
  if (rank === 2) return 'shadow-[0_0_0_1px_rgba(216,180,254,0.9),0_18px_60px_rgba(168,85,247,0.18)]';
  if (rank === 3) return 'shadow-[0_0_0_1px_rgba(147,197,253,0.9),0_18px_60px_rgba(59,130,246,0.16)]';
  return 'shadow-card hover:shadow-card-hover';
}

const TABS: { key: Timeframe; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'all', label: 'All-time' },
];

export function TopSoulsLeaderboard() {
  const { address } = useAccount();
  const [timeframe, setTimeframe] = useState<Timeframe>('weekly');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const res = await fetch(`/api/leaderboard?timeframe=${encodeURIComponent(timeframe)}&limit=100`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? 'Failed to load.');
        if (cancelled) return;
        setEntries((json.entries ?? []) as Entry[]);
        setUpdatedAt(json.updatedAt ?? null);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load.');
        setEntries([]);
        setUpdatedAt(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [timeframe]);

  const myRank = useMemo(() => {
    if (!address) return null;
    const a = address.toLowerCase();
    const hit = entries.find((e) => e.user.toLowerCase() === a);
    return hit?.rank ?? null;
  }, [address, entries]);

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2 pt-1">
        <div className="text-5xl animate-float">🏆</div>
        <h1 className="text-2xl font-extrabold text-ink tracking-tight">Top Souls</h1>
        <p className="text-sm text-mauve font-semibold max-w-xs mx-auto leading-relaxed">
          Ranked by activity and engagement.
        </p>
      </div>

      <div className="flex p-1 rounded-2xl bg-white/90 border border-pink-200 shadow-card gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTimeframe(t.key)}
            className={`
              flex-1 py-3 px-3 rounded-xl text-sm font-extrabold
              transition-all duration-200 active:scale-[0.98]
              ${timeframe === t.key
                ? 'bg-gradient-to-r from-pink-500 to-pink-400 text-white shadow-pink'
                : 'text-mauve hover:text-pink-500 hover:bg-pink-50/80'
              }
            `}
          >
            {t.label}
          </button>
        ))}
      </div>

      {myRank != null && (
        <div className="bg-white rounded-3xl border border-pink-200 shadow-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-extrabold text-pink-400 uppercase tracking-widest">You</p>
            <p className="text-sm font-extrabold text-ink">You are #{myRank}</p>
          </div>
          <span className="text-[11px] font-bold text-mauve">
            {updatedAt ? `updated ${new Date(updatedAt).toLocaleString()}` : ''}
          </span>
        </div>
      )}

      {loading && (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 rounded-3xl bg-pink-100 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="bg-white rounded-3xl border border-pink-200 shadow-card p-6 text-center space-y-2">
          <p className="text-3xl">😕</p>
          <p className="text-sm font-semibold text-mauve">{error}</p>
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="bg-white/70 rounded-3xl border border-dashed border-pink-300 p-10 text-center space-y-2">
          <p className="text-5xl">✨</p>
          <p className="text-base font-bold text-ink">No leaderboard data yet</p>
          <p className="text-sm text-mauve">Run the rebuild job to populate snapshots.</p>
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((e) => {
            const isMe = address && e.user.toLowerCase() === address.toLowerCase();
            return (
              <div
                key={`${e.user}-${e.rank}`}
                className={`
                  bg-white rounded-3xl border p-4 flex items-center justify-between gap-3
                  transition-all duration-200
                  ${e.rank <= 3 ? 'border-transparent' : 'border-pink-200'}
                  ${topGlow(e.rank)}
                  ${isMe ? 'ring-2 ring-pink-300' : ''}
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`
                      w-10 h-10 rounded-2xl flex items-center justify-center font-black shrink-0
                      ${e.rank === 1 ? 'bg-gradient-to-br from-pink-500 to-rose-400 text-white' : ''}
                      ${e.rank === 2 ? 'bg-gradient-to-br from-fuchsia-500 to-violet-500 text-white' : ''}
                      ${e.rank === 3 ? 'bg-gradient-to-br from-indigo-500 to-sky-500 text-white' : ''}
                      ${e.rank > 3 ? 'bg-pink-50 border border-pink-200 text-pink-500' : ''}
                    `}
                  >
                    #{e.rank}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[12px] font-bold text-ink truncate">
                        {shortWallet(e.user)}
                      </span>
                      {e.badge && (
                        <span className="text-[10px] font-extrabold px-2 py-1 rounded-full border border-pink-200 bg-pink-50 text-pink-500 shrink-0">
                          {e.badge}
                        </span>
                      )}
                      {isMe && (
                        <span className="text-[10px] font-extrabold px-2 py-1 rounded-full border border-green-200 bg-green-50 text-green-600 shrink-0">
                          You
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-mauve font-semibold">
                      {e.confessionCount} confessions · {e.likes} likes
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-extrabold text-pink-400 uppercase tracking-widest">Score</p>
                  <p className="text-xl font-black text-ink tabular-nums">{e.score}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

