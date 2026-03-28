'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useAccount,
  useChainId,
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';
import { base } from 'wagmi/chains';
import { formatEther, parseEther } from 'viem';
import { WISH_BOX_ABI, WISH_BOX_FEE } from '@/lib/config';

const ZERO = '0x0000000000000000000000000000000000000000' as const;

export const WISH_CATEGORIES = [
  { id: 'love', emoji: '❤️', label: 'Love' },
  { id: 'money', emoji: '💰', label: 'Money' },
  { id: 'career', emoji: '🚀', label: 'Career' },
  { id: 'health', emoji: '🏥', label: 'Health' },
  { id: 'happiness', emoji: '😊', label: 'Happiness' },
  { id: 'peace', emoji: '🕊️', label: 'Peace' },
] as const;

export type WishCategoryId = (typeof WISH_CATEGORIES)[number]['id'];

type WishRow = {
  creator: `0x${string}`;
  category: string;
  timestamp: bigint;
};

const MAX_WISH_CHARS = 800;

function shortenAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function formatRelativeTime(timestampSec: bigint): string {
  const ts = Number(timestampSec) * 1000;
  const diff = Date.now() - ts;
  if (diff < 0) return 'just now';
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function categoryDisplay(categoryId: string): { emoji: string; label: string } {
  const found = WISH_CATEGORIES.find((c) => c.id === categoryId);
  if (found) return { emoji: found.emoji, label: found.label };
  return { emoji: '✨', label: categoryId };
}

export function WishBox() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const wrongChain = isConnected && chainId !== base.id;

  /** `undefined` = still loading from /api/wish-box-config */
  const [contractAddress, setContractAddress] = useState<`0x${string}` | null | undefined>(
    undefined
  );

  useEffect(() => {
    let cancelled = false;
    fetch('/api/wish-box-config')
      .then((res) => res.json() as Promise<{ address: string | null }>)
      .then((data) => {
        if (cancelled) return;
        const a = data.address;
        setContractAddress(a && a.startsWith('0x') ? (a as `0x${string}`) : null);
      })
      .catch(() => {
        if (!cancelled) setContractAddress(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const configLoading = contractAddress === undefined;
  const isConfigured = Boolean(contractAddress && contractAddress !== ZERO);

  const [wishText, setWishText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<WishCategoryId | null>(null);
  const [status, setStatus] = useState<'idle' | 'pending' | 'confirming' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { writeContractAsync } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: totalWishes, refetch: refetchTotal } = useReadContract({
    address: contractAddress ?? ZERO,
    abi: WISH_BOX_ABI,
    functionName: 'totalWishes',
    query: { enabled: isConfigured },
  });

  const { data: wishesData, refetch: refetchWishes } = useReadContract({
    address: contractAddress ?? ZERO,
    abi: WISH_BOX_ABI,
    functionName: 'getWishes',
    query: { enabled: isConfigured },
  });

  const { data: onChainFee, refetch: refetchFee } = useReadContract({
    address: contractAddress ?? ZERO,
    abi: WISH_BOX_ABI,
    functionName: 'fee',
    query: { enabled: isConfigured },
  });

  const categoryContracts = useMemo(
    () =>
      WISH_CATEGORIES.map((c) => ({
        address: contractAddress ?? ZERO,
        abi: WISH_BOX_ABI,
        functionName: 'categoryCount' as const,
        args: [c.id] as const,
      })),
    [contractAddress]
  );

  const { data: categoryCountResults, refetch: refetchCategoryCounts } = useReadContracts({
    contracts: categoryContracts,
    query: { enabled: isConfigured },
  });

  const wishes = useMemo(() => {
    const raw = (wishesData ?? []) as WishRow[];
    return [...raw].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  }, [wishesData]);

  const last24hCount = useMemo(() => {
    const cutoff = BigInt(Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000));
    return wishes.filter((w) => w.timestamp >= cutoff).length;
  }, [wishes]);

  const topCategory = useMemo(() => {
    if (!categoryCountResults?.length) return null as { id: string; emoji: string; label: string; count: bigint } | null;
    let bestIdx = -1;
    let bestCount = BigInt(0);
    categoryCountResults.forEach((r, i) => {
      if (r.status !== 'success') return;
      const n = r.result as bigint;
      if (n > bestCount) {
        bestCount = n;
        bestIdx = i;
      }
    });
    if (bestIdx < 0 || bestCount === BigInt(0)) return null;
    const cat = WISH_CATEGORIES[bestIdx];
    return { id: cat.id, emoji: cat.emoji, label: cat.label, count: bestCount };
  }, [categoryCountResults]);

  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetchTotal(),
      refetchWishes(),
      refetchFee(),
      refetchCategoryCounts(),
    ]);
  }, [refetchTotal, refetchWishes, refetchFee, refetchCategoryCounts]);

  useEffect(() => {
    if (!txConfirmed) return;
    setWishText('');
    setSelectedCategory(null);
    setTxHash(undefined);
    setStatus('success');
    void refetchAll();
    const t = setTimeout(() => setStatus('idle'), 4500);
    return () => clearTimeout(t);
  }, [txConfirmed, refetchAll]);

  const feeWei = onChainFee ?? parseEther(WISH_BOX_FEE);
  const feeEthDisplay = formatEther(feeWei);

  const handleSubmit = async () => {
    if (!contractAddress || !isConfigured || !selectedCategory || !isConnected || !address || wrongChain)
      return;
    setStatus('pending');
    setErrorMsg('');
    try {
      const hash = await writeContractAsync({
        address: contractAddress,
        abi: WISH_BOX_ABI,
        functionName: 'createWish',
        args: [selectedCategory],
        value: feeWei,
      });
      setTxHash(hash);
      setStatus('confirming');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      const rejected =
        msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('denied');
      setErrorMsg(rejected ? 'Transaction cancelled.' : 'Transaction failed. Check balance and network.');
      setStatus('error');
    }
  };

  const isProcessing = status === 'pending' || status === 'confirming';
  const canSubmit =
    !configLoading &&
    isConfigured &&
    isConnected &&
    !wrongChain &&
    selectedCategory !== null &&
    status === 'idle';

  const totalDisplay = isConfigured && totalWishes !== undefined ? Number(totalWishes) : null;

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div
        className="rounded-3xl border border-violet-200/80 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50/90 p-4 shadow-[0_4px_24px_rgba(124,58,237,0.12)]"
      >
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-white/70 border border-violet-100 px-2 py-3 backdrop-blur-sm">
            <div className="text-lg font-extrabold text-violet-700 leading-none">
              {totalDisplay === null ? '—' : totalDisplay.toLocaleString()}
            </div>
            <div className="text-[10px] font-bold text-violet-400 mt-1 uppercase tracking-wide">
              🌍 Total
            </div>
          </div>
          <div className="rounded-2xl bg-white/70 border border-violet-100 px-2 py-3 backdrop-blur-sm">
            <div className="text-lg font-extrabold text-violet-700 leading-none">
              {!isConfigured ? '—' : last24hCount.toLocaleString()}
            </div>
            <div className="text-[10px] font-bold text-violet-400 mt-1 uppercase tracking-wide">
              ⚡ 24h
            </div>
          </div>
          <div className="rounded-2xl bg-white/70 border border-violet-100 px-2 py-3 backdrop-blur-sm min-h-[4.25rem] flex flex-col justify-center">
            {topCategory ? (
              <>
                <div className="text-sm font-extrabold text-violet-700 leading-tight truncate">
                  {topCategory.emoji} {topCategory.label}
                </div>
                <div className="text-[10px] font-bold text-violet-400 mt-1 uppercase tracking-wide">
                  🔥 Top
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-extrabold text-violet-300">—</div>
                <div className="text-[10px] font-bold text-violet-400 mt-1 uppercase tracking-wide">
                  🔥 Top
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main card */}
      <div
        className="rounded-3xl border-2 border-transparent bg-gradient-to-br from-violet-500/15 via-fuchsia-500/10 to-violet-600/15 p-[1px] shadow-[0_8px_32px_rgba(109,40,217,0.15)]"
      >
        <div className="rounded-[22px] bg-white/95 backdrop-blur-sm p-5 space-y-4 border border-violet-100">
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <h2 className="text-base font-extrabold bg-gradient-to-r from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">
              Make a Wish
            </h2>
          </div>

          {!configLoading && !isConfigured && (
            <p className="text-xs font-semibold text-violet-500/90 rounded-2xl bg-violet-50 border border-violet-100 px-3 py-2">
              Deploy <span className="font-mono text-[11px]">WishBox.sol</span> and set{' '}
              <span className="font-mono text-[11px]">WISH_BOX_ADDRESS</span> or{' '}
              <span className="font-mono text-[11px]">NEXT_PUBLIC_WISH_BOX_ADDRESS</span> in Vercel → Environment
              Variables (Production), then <strong>Redeploy</strong>.
            </p>
          )}

          {wrongChain && (
            <div className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700 font-semibold">
              ⚠️ Switch to <span className="underline">Base Mainnet</span>
            </div>
          )}

          <p className="text-[11px] text-violet-400 font-semibold leading-relaxed">
            Your wish stays private — only the category is stored on-chain. Nothing you type here is sent to the blockchain.
          </p>

          <div className="relative">
            <textarea
              value={wishText}
              onChange={(e) => setWishText(e.target.value)}
              placeholder="Close your eyes, make a wish… (for you only — not stored on-chain)"
              disabled={isProcessing}
              rows={3}
              maxLength={MAX_WISH_CHARS}
              className="w-full resize-none rounded-2xl border border-violet-200/80 px-4 py-3 pb-7 text-sm text-ink placeholder-violet-300 font-medium bg-violet-50/40 outline-none transition-all duration-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span
              className={`absolute bottom-3 right-3 text-[11px] font-mono ${
                MAX_WISH_CHARS - wishText.length <= 40 ? 'text-amber-500' : 'text-violet-300'
              }`}
            >
              {MAX_WISH_CHARS - wishText.length}
            </span>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-bold text-violet-600">Category</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {WISH_CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    disabled={isProcessing}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`
                      rounded-2xl px-3 py-2.5 text-xs font-extrabold transition-all duration-200 border
                      active:scale-[0.98]
                      ${active
                        ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white border-transparent shadow-[0_4px_16px_rgba(124,58,237,0.35)]'
                        : 'bg-white text-violet-600 border-violet-200 hover:border-violet-400 hover:bg-violet-50/80 hover:shadow-sm'
                      }
                      disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-violet-200 disabled:hover:bg-white
                    `}
                  >
                    <span className="mr-1">{cat.emoji}</span>
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-violet-500/90 font-semibold">
            <span>ⓘ</span>
            <span>
              Wish fee:{' '}
              <span className="font-extrabold text-violet-700">
                {isConfigured && onChainFee !== undefined ? feeEthDisplay : WISH_BOX_FEE} ETH
              </span>{' '}
              on Base · category only on-chain
            </span>
          </div>

          {status === 'success' && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm font-semibold text-emerald-700 animate-fade-in">
              ✨ Your wish has been sent
            </div>
          )}

          {status === 'error' && (
            <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 animate-fade-in">
              ✗ {errorMsg}
            </div>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || isProcessing}
            className={`
              w-full h-12 rounded-2xl text-sm font-extrabold transition-all duration-200 flex items-center justify-center gap-2
              ${canSubmit && !isProcessing
                ? 'bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600 text-white shadow-[0_6px_24px_rgba(109,40,217,0.35)] hover:brightness-105 active:scale-[0.98]'
                : 'bg-violet-100 text-violet-300 cursor-not-allowed'
              }
            `}
          >
            {isProcessing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                {status === 'pending' ? 'Waiting for wallet…' : 'Confirming on Base…'}
              </>
            ) : configLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Loading wish box…
              </>
            ) : !isConfigured ? (
              'Wish Box not configured'
            ) : !isConnected ? (
              'Connect wallet to make a wish'
            ) : wrongChain ? (
              'Switch to Base Mainnet'
            ) : !selectedCategory ? (
              'Select a category'
            ) : (
              <>✨ Send wish</>
            )}
          </button>
        </div>
      </div>

      {/* Feed */}
      {isConfigured && wishes.length > 0 && (
        <div className="rounded-3xl border border-violet-200 bg-white/90 p-4 shadow-[0_2px_16px_rgba(124,58,237,0.08)]">
          <h3 className="text-xs font-extrabold text-violet-500 uppercase tracking-widest mb-3">
            Recent wishes
          </h3>
          <ul className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {wishes.slice(0, 40).map((w, i) => {
              const { emoji, label } = categoryDisplay(w.category);
              return (
                <li
                  key={`${w.creator}-${w.timestamp}-${i}`}
                  className="rounded-2xl border border-violet-100 bg-violet-50/30 px-3 py-2.5 text-sm transition-colors hover:bg-violet-50/60"
                >
                  <p className="font-bold text-ink">
                    <span className="font-mono text-violet-700">{shortenAddress(w.creator)}</span>
                    <span className="text-mauve font-semibold"> sent a wish</span>
                  </p>
                  <p className="text-xs font-semibold text-violet-600 mt-0.5">
                    Category: {emoji} {label.toLowerCase()}
                  </p>
                  <p className="text-[11px] text-violet-400 font-bold mt-1">{formatRelativeTime(w.timestamp)}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
