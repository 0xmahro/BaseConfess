'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { supabase } from '@/lib/supabase';
import { ProfileConfessionCard } from '@/components/ProfileConfessionCard';
import {
  PROFILE_CONTRACT_ABI,
  PROFILE_CONTRACT_ADDRESS,
  PROFILE_CREATION_FEE,
  USERNAME_CHANGE_FEE,
  WISH_BOX_ABI,
} from '@/lib/config';
import { useWishBoxContractAddress } from '@/hooks/useWishBoxContractAddress';
import type { Confession } from '@/types';

const ADDR_ZERO = '0x0000000000000000000000000000000000000000' as const;

function isWalletAddress(s: string): s is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}

type Status = 'idle' | 'pending' | 'confirming' | 'success' | 'error';

const ALLOWED_TAGS = [
  'anon',
  'toxic',
  'lover',
  'degen',
  'dev',
  'trader',
  'shitposter',
  'overthinker',
  'lonely',
  'savage',
] as const;

export function ProfileView({ targetAddress }: { targetAddress: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const profileAddress = targetAddress.toLowerCase();
  const isValid = isWalletAddress(profileAddress);

  const { address: viewerAddress, isConnected } = useAccount();
  const isOwner =
    Boolean(viewerAddress) && viewerAddress!.toLowerCase() === profileAddress;

  const isMissingContract =
    PROFILE_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000';

  const { address: wishBoxAddress, isConfigured: wishBoxConfigured } = useWishBoxContractAddress();

  const { data: wishesOnChain, isPending: wishesPending } = useReadContract({
    address: wishBoxAddress ?? ADDR_ZERO,
    abi: WISH_BOX_ABI,
    functionName: 'getWishes',
    query: { enabled: mounted && isValid && wishBoxConfigured && Boolean(wishBoxAddress) },
  });

  const wishCountForProfile = useMemo(() => {
    if (!wishesOnChain || !isValid) return null;
    const rows = wishesOnChain as unknown as readonly { creator: `0x${string}` }[];
    return rows.filter((w) => w.creator.toLowerCase() === profileAddress).length;
  }, [wishesOnChain, profileAddress, isValid]);

  const { data: profileData, refetch: refetchProfile } = useReadContract({
    address: PROFILE_CONTRACT_ADDRESS,
    abi: PROFILE_CONTRACT_ABI,
    functionName: 'getProfile',
    args: [(isValid ? profileAddress : '0x0000000000000000000000000000000000000000') as `0x${string}`],
    query: { enabled: mounted && isValid && !isMissingContract },
  });

  const profile = useMemo(() => {
    if (!profileData) return null;
    const [
      exists,
      owner,
      username,
      tags,
      activityScore,
      totalTipsReceived,
      totalSpent,
      confessionCount,
    ] = profileData as unknown as [
      boolean,
      `0x${string}`,
      string,
      string[],
      bigint,
      bigint,
      bigint,
      bigint,
    ];

    return {
      exists,
      owner,
      username: username?.trim() || '',
      tags: (tags ?? []).filter(Boolean),
      activityScore,
      totalTipsReceived,
      totalSpent,
      confessionCount,
    };
  }, [profileData]);

  // ---- Confession history ----
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);

  // ---- Activity score (frontend-indexed) ----
  const tipsReceivedEth = Number(formatEther(profile?.totalTipsReceived ?? BigInt(0)));
  const totalSpentEth = Number(formatEther(profile?.totalSpent ?? BigInt(0)));
  const computedActivityScore = useMemo(() => {
    const confessionCount = confessions.length;
    const tips = tipsReceivedEth;
    const spent = totalSpentEth;
    const wishes = wishCountForProfile ?? 0;
    return Math.floor(confessionCount * 2 + wishes * 2 + tips * 5 + spent * 10);
  }, [confessions.length, tipsReceivedEth, totalSpentEth, wishCountForProfile]);

  const PAGE_SIZE = 30;

  const fetchConfessions = async (reset = false) => {
    if (!isValid) return;
    setLoading(true);
    setError('');
    try {
      const from = reset ? 0 : confessions.length;
      const to = from + PAGE_SIZE - 1;
      const { data, error: err } = await supabase
        .from('confessions')
        .select('*')
        .eq('wallet', profileAddress)
        .order('id', { ascending: false })
        .range(from, to);
      if (err) throw err;
      const next = (data as Confession[]) ?? [];
      setConfessions((prev) => (reset ? next : [...prev, ...next]));
      setHasMore(next.length === PAGE_SIZE);
    } catch {
      setError('Could not load confessions.');
      setConfessions([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    fetchConfessions(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, profileAddress, isValid]);

  // ---- Owner actions: create profile + update tags ----
  const [memeId, setMemeId] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tipAmount, setTipAmount] = useState('0.001');
  const [status, setStatus] = useState<Status>('idle');
  const [errMsg, setErrMsg] = useState('');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [pendingUsername, setPendingUsername] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    if (profile.username) setMemeId(profile.username);
    if (profile.tags?.length) setSelectedTags(profile.tags.slice(0, 3));
  }, [profile]);

  const parsedTags = useMemo(() => selectedTags.slice(0, 3), [selectedTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const has = prev.includes(tag);
      if (has) return prev.filter((t) => t !== tag);
      if (prev.length >= 3) return prev;
      return [...prev, tag];
    });
  };

  const { writeContractAsync } = useWriteContract();
  const { isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!confirmed) return;
    setStatus('success');
    setTxHash(undefined);
    // Refetch twice to avoid RPC/indexing delays and cache stickiness.
    refetchProfile?.();
    const t2 = setTimeout(() => refetchProfile?.(), 1500);
    fetchConfessions(true);
    if (pendingUsername) {
      // If currently on /p/<username>, keep URL in sync with the new Meme ID.
      try {
        if (typeof window !== 'undefined' && window.location.pathname.startsWith('/p/')) {
          window.history.replaceState(null, '', `/p/${encodeURIComponent(pendingUsername)}`);
        }
      } catch {}
      setPendingUsername(null);
    }
    const t = setTimeout(() => setStatus('idle'), 3500);
    return () => { clearTimeout(t); clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed]);

  const doCreateProfile = async () => {
    if (!isOwner || !isConnected || isMissingContract) return;
    setStatus('pending');
    setErrMsg('');
    try {
      const hash = await writeContractAsync({
        address: PROFILE_CONTRACT_ADDRESS,
        abi: PROFILE_CONTRACT_ABI,
        functionName: 'createProfile',
        args: [memeId.trim(), parsedTags],
        value: parseEther(PROFILE_CREATION_FEE),
      });
      setTxHash(hash);
      setStatus('confirming');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      const rejected = msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('denied');
      setErrMsg(rejected ? 'Transaction cancelled.' : 'Transaction failed.');
      setStatus('error');
    }
  };

  const doUpdateTags = async () => {
    if (!isOwner || !isConnected || isMissingContract) return;
    setStatus('pending');
    setErrMsg('');
    try {
      const hash = await writeContractAsync({
        address: PROFILE_CONTRACT_ADDRESS,
        abi: PROFILE_CONTRACT_ABI,
        functionName: 'updateTags',
        args: [parsedTags],
      });
      setTxHash(hash);
      setStatus('confirming');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      const rejected = msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('denied');
      setErrMsg(rejected ? 'Transaction cancelled.' : 'Transaction failed.');
      setStatus('error');
    }
  };

  const doUpdateUsername = async () => {
    if (!isOwner || !isConnected || isMissingContract) return;
    if (!memeId.trim()) return;
    setStatus('pending');
    setErrMsg('');
    setPendingUsername(memeId.trim());
    try {
      const hash = await writeContractAsync({
        address: PROFILE_CONTRACT_ADDRESS,
        abi: PROFILE_CONTRACT_ABI,
        functionName: 'updateUsername',
        args: [memeId.trim()],
        value: parseEther(USERNAME_CHANGE_FEE),
      });
      setTxHash(hash);
      setStatus('confirming');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      const rejected = msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('denied');
      setErrMsg(rejected ? 'Transaction cancelled.' : 'Transaction failed.');
      setStatus('error');
      setPendingUsername(null);
    }
  };

  const doSendTip = async () => {
    if (!isValid || !isConnected || isMissingContract) return;
    setStatus('pending');
    setErrMsg('');
    try {
      const hash = await writeContractAsync({
        address: PROFILE_CONTRACT_ADDRESS,
        abi: PROFILE_CONTRACT_ABI,
        functionName: 'sendTip',
        args: [profileAddress as `0x${string}`],
        value: parseEther(tipAmount || '0'),
      });
      setTxHash(hash);
      setStatus('confirming');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      const rejected = msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('denied');
      setErrMsg(rejected ? 'Transaction cancelled.' : 'Transaction failed.');
      setStatus('error');
    }
  };

  const busy = status === 'pending' || status === 'confirming';

  if (!mounted) {
    return (
      <div className="rounded-3xl border border-pink-200 bg-white p-6 text-sm text-mauve font-semibold animate-pulse">
        Loading profile...
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-600 font-semibold">
        Invalid address
      </div>
    );
  }

  return (
    <>
      <div className="text-center space-y-2 pt-2">
        <div className="text-5xl">👤</div>
        <h1 className="text-2xl font-extrabold text-ink tracking-tight">
          {profile?.username ? `@${profile.username}` : 'Profile'}
        </h1>
      </div>

      {isMissingContract && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700 font-semibold">
          Set <span className="font-mono">NEXT_PUBLIC_PROFILE_SYSTEM_ADDRESS</span> to enable profiles.
        </div>
      )}

      {/* Stats */}
      <div className="bg-white rounded-3xl border border-pink-200 shadow-card p-5 space-y-3">
        <div className="flex flex-wrap gap-2">
          {(profile?.tags ?? []).map((t) => (
            <span
              key={t}
              className="px-2.5 h-8 inline-flex items-center rounded-full text-xs font-extrabold
                border border-pink-200 bg-pink-50 text-pink-500"
            >
              {t}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-pink-200 bg-white p-4">
            <p className="text-[11px] font-extrabold text-mauve">Activity score</p>
            <p className="text-xl font-extrabold text-ink">{computedActivityScore}</p>
          </div>
          <div className="rounded-2xl border border-pink-200 bg-white p-4">
            <p className="text-[11px] font-extrabold text-mauve">Tips received</p>
            <p className="text-xl font-extrabold text-ink">{tipsReceivedEth.toFixed(4)} ETH</p>
          </div>
          <div className="rounded-2xl border border-pink-200 bg-white p-4">
            <p className="text-[11px] font-extrabold text-mauve">Wishes</p>
            <p className="text-xl font-extrabold text-ink">
              {!wishBoxConfigured
                ? '—'
                : wishesPending
                  ? '…'
                  : wishCountForProfile ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-pink-200 bg-white p-4">
            <p className="text-[11px] font-extrabold text-mauve">Confessions</p>
            <p className="text-xl font-extrabold text-ink">{confessions.length}</p>
          </div>
        </div>
      </div>

      {/* Tip */}
      <div className="bg-white rounded-3xl border border-pink-200 shadow-card p-5 space-y-3">
        <p className="text-sm font-extrabold text-pink-500">Send Tip</p>
        <div className="flex gap-2">
          <input
            value={tipAmount}
            onChange={(e) => setTipAmount(e.target.value)}
            disabled={!isConnected || busy || isMissingContract}
            className="flex-1 h-11 rounded-2xl border bg-pink-50 px-4 text-sm font-semibold text-ink
              border-pink-200 outline-none transition-all focus:border-pink-400 focus:ring-2 focus:ring-pink-100
              disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="0.001"
          />
          <button
            onClick={doSendTip}
            disabled={!isConnected || busy || isMissingContract}
            className="h-11 px-4 rounded-2xl text-sm font-extrabold border border-amber-200 text-amber-600 bg-white
              hover:bg-amber-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            💸 Tip
          </button>
        </div>
        <p className="text-xs text-mauve font-semibold">
          ETH is forwarded directly to the profile owner.
        </p>
      </div>

      {/* Owner controls */}
      {isOwner && (
        <div className="bg-white rounded-3xl border border-pink-200 shadow-card p-5 space-y-4">
          <p className="text-sm font-extrabold text-pink-500">Your Meme ID</p>
          <div className="space-y-2">
            <label className="text-xs font-bold text-mauve">Meme ID</label>
            <input
              value={memeId}
              onChange={(e) => setMemeId(e.target.value)}
              disabled={!isConnected || busy || isMissingContract}
              placeholder="e.g. basememe"
              className="w-full h-11 rounded-2xl border bg-pink-50 px-4 text-sm font-semibold text-ink
                border-pink-200 outline-none transition-all focus:border-pink-400 focus:ring-2 focus:ring-pink-100
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {profile?.exists && (
              <p className="text-[11px] text-mauve font-semibold">
                Changing Meme ID costs {USERNAME_CHANGE_FEE} ETH.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-mauve">Tags (pick up to 3)</label>
            <div className="flex flex-wrap gap-2">
              {ALLOWED_TAGS.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    disabled={!isConnected || busy || isMissingContract}
                    className={`
                      px-3 h-9 rounded-2xl text-xs font-extrabold border transition-colors
                      disabled:opacity-40 disabled:cursor-not-allowed
                      ${active
                        ? 'bg-gradient-to-b from-pink-500 to-pink-400 text-white border-transparent shadow-pink'
                        : 'bg-white border-pink-200 text-mauve hover:bg-pink-50 hover:border-pink-400 hover:text-pink-500'
                      }
                    `}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-mauve font-semibold">
              Selected: {parsedTags.length ? parsedTags.join(', ') : '—'}
            </p>
          </div>

          {!profile?.exists ? (
            <>
              <div className="rounded-2xl border border-pink-200 bg-white p-4 space-y-1">
                <p className="text-xs font-extrabold text-pink-500">Fee</p>
                <p className="text-sm font-semibold text-mauve">
                  You are about to pay {PROFILE_CREATION_FEE} ETH to create your Meme ID.
                </p>
              </div>
              <button
                onClick={doCreateProfile}
                disabled={!isConnected || busy || isMissingContract || memeId.trim().length === 0}
                className="w-full h-12 rounded-2xl text-sm font-extrabold
                  bg-gradient-to-r from-pink-500 to-pink-400 text-white shadow-pink
                  hover:from-pink-600 hover:to-pink-500 active:scale-[0.98]
                  disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {busy ? 'Confirming…' : 'Pay & create Meme ID'}
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <button
                onClick={doUpdateUsername}
                disabled={!isConnected || busy || isMissingContract || memeId.trim().length === 0}
                className="w-full h-12 rounded-2xl text-sm font-extrabold
                  bg-gradient-to-r from-pink-500 to-pink-400 text-white shadow-pink
                  hover:from-pink-600 hover:to-pink-500 active:scale-[0.98]
                  disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {busy ? 'Confirming…' : 'Update Meme ID'}
              </button>

              <button
                onClick={doUpdateTags}
                disabled={!isConnected || busy || isMissingContract}
                className="w-full h-12 rounded-2xl text-sm font-extrabold
                  border border-pink-200 bg-white text-pink-500
                  hover:bg-pink-50 active:scale-[0.98]
                  disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {busy ? 'Confirming…' : 'Update tags'}
              </button>
            </div>
          )}

          {status === 'success' && (
            <div className="rounded-2xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-600 font-semibold">
              ✓ Transaction confirmed.
            </div>
          )}
          {status === 'error' && (
            <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-500 font-semibold">
              ✗ {errMsg}
            </div>
          )}
        </div>
      )}

      {/* Confession history */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-pink-500">Confession history</h2>
          <button
            onClick={() => fetchConfessions(true)}
            disabled={loading}
            className="text-xs font-extrabold text-pink-400 hover:text-pink-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-500 font-semibold">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-3xl border border-pink-200 bg-white p-6 text-sm text-mauve font-semibold animate-pulse">
            Loading confessions...
          </div>
        )}

        {!loading && !error && confessions.length === 0 && (
          <div className="rounded-3xl border border-dashed border-pink-300 bg-white/60 p-10 text-center space-y-2">
            <p className="text-4xl">🤫</p>
            <p className="text-sm font-extrabold text-ink">No confessions yet</p>
          </div>
        )}

        {!loading && !error && confessions.length > 0 && (
          <div className="space-y-4">
            {confessions.map((c) => (
              <ProfileConfessionCard key={c.id} confession={c} />
            ))}

            {hasMore && (
              <button
                onClick={() => fetchConfessions(false)}
                disabled={loading}
                className="w-full h-11 rounded-2xl border border-pink-200 bg-white text-mauve text-sm font-extrabold
                  hover:bg-pink-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Load more
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

