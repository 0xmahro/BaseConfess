'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { supabase }   from '@/lib/supabase';
import { ConfessionCard } from './ConfessionCard';
import type { Confession, UserVoteMap, VoteType } from '@/types';

type SortKey = 'trending' | 'most_liked' | 'most_disliked' | 'most_tipped';

const SORT_TABS: { key: SortKey; label: string; emoji: string }[] = [
  { key: 'trending',      label: 'Trending',      emoji: '🔥' },
  { key: 'most_liked',    label: 'Most Liked',    emoji: '💚' },
  { key: 'most_disliked', label: 'Most Disliked', emoji: '💔' },
  { key: 'most_tipped',   label: 'Most Tipped',   emoji: '💸' },
];

const PAGE_SIZE = 30;

function sortConfessions(list: Confession[], key: SortKey): Confession[] {
  const copy = [...list];
  switch (key) {
    case 'trending':
      return copy.sort((a, b) =>
        (b.likes - b.dislikes + b.tips_received) - (a.likes - a.dislikes + a.tips_received)
      );
    case 'most_liked':    return copy.sort((a, b) => b.likes - a.likes);
    case 'most_disliked': return copy.sort((a, b) => b.dislikes - a.dislikes);
    case 'most_tipped':   return copy.sort((a, b) => b.tips_received - a.tips_received);
  }
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-3xl border border-pink-200 p-5 space-y-4 animate-pulse">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-pink-100" />
        <div className="h-3 w-28 rounded-full bg-pink-100" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded-full bg-pink-100" />
        <div className="h-3 w-4/5 rounded-full bg-pink-100" />
        <div className="h-3 w-3/5 rounded-full bg-pink-100" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-20 rounded-full bg-pink-100" />
        <div className="h-8 w-20 rounded-full bg-pink-100" />
        <div className="h-8 w-16 rounded-full bg-pink-100 ml-auto" />
      </div>
    </div>
  );
}

function Pagination({
  current,
  total,
  onChange,
}: {
  current: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (total <= 1) return null;

  // Build page numbers: always show first, last, current ±1, and ellipsis
  const pages: (number | '...')[] = [];

  const add = (n: number) => {
    if (!pages.includes(n)) pages.push(n);
  };

  add(1);
  if (current > 3) pages.push('...');
  if (current > 2) add(current - 1);
  add(current);
  if (current < total - 1) add(current + 1);
  if (current < total - 2) pages.push('...');
  add(total);

  return (
    <div className="flex items-center justify-center gap-1.5 pt-2 pb-4">
      {/* Prev */}
      <button
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        className="w-8 h-8 flex items-center justify-center rounded-full border border-pink-200 bg-white
          text-pink-400 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed
          hover:bg-pink-50 hover:text-pink-600 transition-colors"
      >
        ‹
      </button>

      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="w-8 text-center text-xs text-mauve select-none">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p as number)}
            className={`
              w-8 h-8 flex items-center justify-center rounded-full text-xs font-extrabold
              border transition-all duration-150 active:scale-95
              ${p === current
                ? 'bg-gradient-to-b from-pink-500 to-pink-400 text-white border-transparent shadow-pink'
                : 'bg-white border-pink-200 text-mauve hover:border-pink-400 hover:text-pink-500 hover:bg-pink-50'
              }
            `}
          >
            {p}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        className="w-8 h-8 flex items-center justify-center rounded-full border border-pink-200 bg-white
          text-pink-400 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed
          hover:bg-pink-50 hover:text-pink-600 transition-colors"
      >
        ›
      </button>
    </div>
  );
}

export function ConfessionFeed() {
  const { address } = useAccount();

  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [userVotes,   setUserVotes]   = useState<UserVoteMap>({});
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState('');
  const [sortKey,     setSortKey]     = useState<SortKey>('trending');
  const [page,        setPage]        = useState(1);

  const fetchConfessions = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('confessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);

    if (err) { setError('Could not load confessions.'); return; }
    setConfessions((data as Confession[]) ?? []);
  }, []);

  const fetchUserVotes = useCallback(async (wallet: string) => {
    const { data } = await supabase
      .from('votes')
      .select('confession_id, vote')
      .eq('wallet', wallet.toLowerCase());

    if (!data) return;
    const map: UserVoteMap = {};
    for (const row of data as { confession_id: number; vote: VoteType }[]) {
      map[row.confession_id] = row.vote;
    }
    setUserVotes(map);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchConfessions().finally(() => setIsLoading(false));
  }, [fetchConfessions]);

  useEffect(() => {
    if (address) fetchUserVotes(address);
    else setUserVotes({});
  }, [address, fetchUserVotes]);

  useEffect(() => {
    const channel = supabase
      .channel('feed_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'confessions' }, (payload) => {
        setConfessions((prev) => [payload.new as Confession, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'confessions' }, (payload) => {
        setConfessions((prev) =>
          prev.map((c) => c.id === (payload.new as Confession).id ? (payload.new as Confession) : c)
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Reset to page 1 when sort changes
  const handleSortChange = (key: SortKey) => {
    setSortKey(key);
    setPage(1);
  };

  const handleVoted = useCallback((confessionId: number, vote: VoteType) => {
    setUserVotes((prev) => ({ ...prev, [confessionId]: vote }));
  }, []);

  const sorted     = useMemo(() => sortConfessions(confessions, sortKey), [confessions, sortKey]);
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated  = useMemo(
    () => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sorted, page]
  );

  const handlePageChange = (p: number) => {
    setPage(p);
    // Scroll to top of feed smoothly
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-1.5">
          {SORT_TABS.map((t) => (
            <div key={t.key} className="h-14 rounded-2xl bg-pink-100 animate-pulse" />
          ))}
        </div>
        {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-pink-200 bg-white p-8 text-center space-y-3">
        <p className="text-4xl">😕</p>
        <p className="text-sm font-semibold text-mauve">{error}</p>
        <button onClick={() => fetchConfessions()} className="text-xs text-pink-400 underline font-bold">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Sort tabs */}
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-1.5">
          {SORT_TABS.map((tab) => {
            const active = sortKey === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleSortChange(tab.key)}
                className={`
                  flex flex-col items-center justify-center gap-0.5
                  py-2 px-1 rounded-2xl text-[11px] font-extrabold
                  border transition-all duration-150 active:scale-95
                  ${active
                    ? 'bg-gradient-to-b from-pink-500 to-pink-400 text-white border-transparent shadow-pink'
                    : 'bg-white border-pink-200 text-mauve hover:border-pink-400 hover:text-pink-500 hover:bg-pink-50'
                  }
                `}
              >
                <span className="text-base leading-none">{tab.emoji}</span>
                <span className="leading-tight text-center">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-mauve">
            {sorted.length} confession{sorted.length !== 1 ? 's' : ''}
            {totalPages > 1 && (
              <span className="ml-1 text-pink-300">· page {page}/{totalPages}</span>
            )}
          </span>
          <button
            onClick={() => { fetchConfessions(); setPage(1); }}
            className="text-xs font-bold text-pink-400 hover:text-pink-600 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Empty state */}
      {sorted.length === 0 && (
        <div className="rounded-3xl border border-dashed border-pink-300 bg-white/60 p-12 text-center space-y-2">
          <p className="text-5xl animate-float">🤫</p>
          <p className="text-base font-bold text-ink">No confessions yet</p>
          <p className="text-sm text-mauve">Be the first to confess anonymously.</p>
        </div>
      )}

      {/* Cards for current page */}
      {paginated.map((confession) => (
        <ConfessionCard
          key={confession.id}
          confession={confession}
          userVote={userVotes[confession.id]}
          onVoted={handleVoted}
        />
      ))}

      {/* Pagination */}
      <Pagination
        current={page}
        total={totalPages}
        onChange={handlePageChange}
      />
    </div>
  );
}
