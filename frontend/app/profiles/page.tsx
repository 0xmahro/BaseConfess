'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { Header } from '@/components/Header';

type ProfileRow = {
  wallet: string;
  username: string;
  tags: string[];
  confessionCount: number;
  activityScore: number;
};

function shortWallet(w: string) {
  return `${w.slice(0, 6)}...${w.slice(-4)}`;
}

export default function ProfilesPage() {
  const { address } = useAccount();
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    (async () => {
      try {
        const res = await fetch('/api/profiles', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok || !json?.ok) throw new Error(json?.error ?? 'Failed to load profiles.');
        if (cancelled) return;
        setRows((json.profiles ?? []) as ProfileRow[]);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load profiles.');
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const viewer = address?.toLowerCase();
  const myRow = useMemo(() => {
    if (!viewer) return null;
    return rows.find((r) => r.wallet.toLowerCase() === viewer) ?? null;
  }, [rows, viewer]);

  return (
    <div className="min-h-screen bg-pink-50">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-8 space-y-5">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xs font-extrabold text-pink-500 hover:text-pink-600">
            ← Back
          </Link>
          <Link
            href="/top"
            className="inline-flex items-center gap-1.5 rounded-full border border-pink-200 px-3 py-1.5 text-xs font-extrabold text-pink-500 hover:bg-pink-50"
          >
            🏆 Top Souls
          </Link>
        </div>

        <div className="text-center space-y-2">
          <div className="text-5xl animate-float">👥</div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">Profiles</h1>
          <p className="text-sm text-mauve font-semibold">Users who created a meme profile on Base.</p>
        </div>

        {myRow && (
          <div className="rounded-3xl border border-pink-200 bg-white p-4 shadow-card">
            <p className="text-xs font-extrabold uppercase tracking-widest text-pink-400">You</p>
            <p className="mt-1 text-sm font-extrabold text-ink">@{myRow.username}</p>
            <p className="text-xs text-mauve font-semibold">
              {shortWallet(myRow.wallet)} · {myRow.confessionCount} confessions
            </p>
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
          <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm text-red-500 font-semibold">
            {error}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="rounded-3xl border border-dashed border-pink-300 bg-white/60 p-10 text-center space-y-2">
            <p className="text-5xl">🫥</p>
            <p className="text-base font-bold text-ink">No profiles yet</p>
          </div>
        )}

        {!loading && !error && rows.length > 0 && (
          <div className="space-y-3">
            {rows.map((r, idx) => (
              <Link
                key={r.wallet}
                href={`/p/${encodeURIComponent(r.username)}`}
                className="block rounded-3xl border border-pink-200 bg-white p-4 shadow-card hover:shadow-card-hover transition-shadow"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-extrabold text-ink truncate">
                      #{idx + 1} · @{r.username}
                    </p>
                    <p className="text-xs text-mauve font-semibold">
                      {shortWallet(r.wallet)} · {r.confessionCount} confessions
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-extrabold text-pink-500">
                    score {r.activityScore}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

