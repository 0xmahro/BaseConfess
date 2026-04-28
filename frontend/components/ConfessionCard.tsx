'use client';

import { useEffect, useRef, useState } from 'react';
import { useAccount, useBalance, useChainId, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { base } from 'wagmi/chains';
import { TipModal } from './TipModal';
import type { Confession, VoteType } from '@/types';
import Link from 'next/link';
import { useTruthVoting } from '@/hooks/useTruthVoting';
import { CONTRACT_ABI, CONTRACT_ADDRESS, LEGACY_CONTRACT_ADDRESS } from '@/lib/config';
import { supabase } from '@/lib/supabase';

interface ConfessionCardProps {
  confession: Confession;
  userVote: VoteType | undefined;
  onVoted: (confessionId: number, vote: VoteType) => void;
  initialRealVotes: number;
  initialFakeVotes: number;
  initialHasVoted: boolean;
  canTruthVote: boolean;
  existsOnCurrentContract: boolean;
  existsOnLegacyContract: boolean;
  username?:  string | null;
}

function formatWallet(wallet: string): string {
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60)    return `${seconds}s ago`;
  if (seconds < 3600)  return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

// Deterministic pastel color from wallet address
function walletColor(wallet: string): string {
  const colors = [
    'from-pink-400 to-rose-400',
    'from-purple-400 to-pink-400',
    'from-fuchsia-400 to-pink-300',
    'from-rose-400 to-orange-300',
    'from-pink-300 to-violet-400',
  ];
  const idx = parseInt(wallet.slice(2, 4), 16) % colors.length;
  return colors[idx];
}

export function ConfessionCard({
  confession,
  userVote,
  onVoted,
  initialRealVotes,
  initialFakeVotes,
  initialHasVoted,
  canTruthVote,
  existsOnCurrentContract,
  existsOnLegacyContract,
  username,
}: ConfessionCardProps) {
  const { address, isConnected } = useAccount();
  const chainId    = useChainId();
  const wrongChain = isConnected && chainId !== base.id;
  const { data: nativeBalance } = useBalance({
    address,
    chainId: base.id,
    query: { enabled: Boolean(address) && isConnected },
  });

  const [showTipModal,  setShowTipModal]  = useState(false);
  const [localLikes,    setLocalLikes]    = useState(confession.likes);
  const [localDislikes, setLocalDislikes] = useState(confession.dislikes);
  const [localUserVote, setLocalUserVote] = useState<VoteType | undefined>(userVote);
  const [voteTxHash,    setVoteTxHash]    = useState<`0x${string}` | undefined>();
  const [legacyVoteError, setLegacyVoteError] = useState('');
  const [truthLocalError, setTruthLocalError] = useState('');
  const [likePopped,    setLikePopped]    = useState(false);
  const pendingVoteRef = useRef<VoteType | null>(null);
  const { writeContractAsync } = useWriteContract();
  const { isSuccess: voteConfirmed } = useWaitForTransactionReceipt({ hash: voteTxHash });

  const {
    realVotes,
    fakeVotes,
    totalVotes,
    truthScore,
    hasVoted,
    isVoting,
    error,
    showSuccessToast,
    submitVote,
  } = useTruthVoting({
    confessionId: confession.id,
    initialRealVotes,
    initialFakeVotes,
    initialHasVoted,
  });

  const [expanded, setExpanded] = useState(false);
  const CHAR_LIMIT = 180;
  const isLong = (confession.text?.length ?? 0) > CHAR_LIMIT;
  const displayText = isLong && !expanded
    ? confession.text!.slice(0, CHAR_LIMIT).trimEnd() + '...'
    : confession.text;

  const avatarGradient = walletColor(confession.wallet);
  const truthVoteBlocked = !hasVoted && !canTruthVote;
  const legacyConfession = !existsOnCurrentContract;
  const canUseLikeDislike = existsOnCurrentContract || existsOnLegacyContract;
  const hasGasForTx = (nativeBalance?.value ?? BigInt(0)) > BigInt(0);

  useEffect(() => {
    setLocalLikes(confession.likes);
    setLocalDislikes(confession.dislikes);
  }, [confession.likes, confession.dislikes]);

  useEffect(() => {
    setLocalUserVote(userVote);
  }, [userVote]);

  const handleLegacyVote = async (voteType: VoteType) => {
    if (!isConnected || !address) return;
    if (!canUseLikeDislike) {
      setLegacyVoteError('Bu itiraf icin oy kontrati bulunamadi.');
      return;
    }
    if (wrongChain) {
      setLegacyVoteError('Switch to Base');
      return;
    }
    if (!hasGasForTx) {
      setLegacyVoteError('Base aginda gas icin ETH yok. Biraz Base ETH gonder.');
      return;
    }
    setLegacyVoteError('');

    const prevVote = localUserVote;
    let newLikes = localLikes;
    let newDislikes = localDislikes;

    if (prevVote === 1) newLikes = Math.max(0, newLikes - 1);
    if (prevVote === -1) newDislikes = Math.max(0, newDislikes - 1);
    if (voteType === 1) {
      newLikes += 1;
      setLikePopped(true);
      setTimeout(() => setLikePopped(false), 400);
    }
    if (voteType === -1) newDislikes += 1;

    setLocalLikes(newLikes);
    setLocalDislikes(newDislikes);
    setLocalUserVote(voteType);

    try {
      const voteContractAddress = existsOnCurrentContract
        ? CONTRACT_ADDRESS
        : LEGACY_CONTRACT_ADDRESS;
      const hash = await writeContractAsync({
        address: voteContractAddress,
        abi: CONTRACT_ABI,
        functionName: 'vote',
        args: [BigInt(confession.id), voteType],
      });
      pendingVoteRef.current = voteType;
      setVoteTxHash(hash);
      onVoted(confession.id, voteType);
    } catch (err: unknown) {
      setLocalLikes(confession.likes);
      setLocalDislikes(confession.dislikes);
      setLocalUserVote(prevVote);
      const msg = err instanceof Error ? err.message : '';
      const normalized = msg.toLowerCase();
      const rejected =
        normalized.includes('user rejected') || normalized.includes('denied');
      if (rejected) {
        setLegacyVoteError('');
      } else if (
        normalized.includes('insufficient funds') ||
        normalized.includes('gas required exceeds allowance') ||
        normalized.includes('intrinsic gas too low')
      ) {
        setLegacyVoteError('Oy icin cuzdanda biraz Base ETH olmali (gas).');
      } else if (normalized.includes('confession not found')) {
        setLegacyVoteError('Bu itiraf eski kontratta oldugu icin oy verilemiyor.');
      } else {
        setLegacyVoteError('Like/Dislike oyu gonderilemedi. Tekrar dene.');
      }
    }
  };

  const handleTruthVote = (isReal: boolean) => {
    if (!isConnected || !address) return;
    if (legacyConfession) {
      setTruthLocalError('Bu itiraf eski kontrattan. Truth vote kullanilamaz.');
      return;
    }
    if (wrongChain) {
      setTruthLocalError('Switch to Base Mainnet to vote.');
      return;
    }
    if (!hasGasForTx) {
      setTruthLocalError('Base aginda gas icin ETH yok. Biraz Base ETH gonder.');
      return;
    }
    setTruthLocalError('');
    submitVote(isReal);
  };

  useEffect(() => {
    if (!voteConfirmed || !address || !pendingVoteRef.current) return;
    const voteType = pendingVoteRef.current;
    const confessionId = confession.id;
    const wallet = address.toLowerCase();

    const syncVote = async () => {
      try {
        await supabase.from('votes').upsert(
          { confession_id: confessionId, wallet, vote: voteType },
          { onConflict: 'confession_id,wallet' }
        );
        const { data: allVotes } = await supabase
          .from('votes')
          .select('vote')
          .eq('confession_id', confessionId);
        if (allVotes) {
          const likes = allVotes.filter((v) => v.vote === 1).length;
          const dislikes = allVotes.filter((v) => v.vote === -1).length;
          await supabase.from('confessions').update({ likes, dislikes }).eq('id', confessionId);
        }
      } catch (err) {
        console.error('[ConfessionCard] Vote sync error:', err);
      } finally {
        pendingVoteRef.current = null;
        setVoteTxHash(undefined);
      }
    };
    syncVote();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voteConfirmed]);

  return (
    <>
      <article className="bg-white rounded-3xl border border-pink-200 shadow-card hover:shadow-card-hover transition-shadow duration-200 p-5 space-y-4 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center shrink-0 shadow-sm`}>
              <span className="text-white text-xs font-bold select-none">
                {confession.wallet.slice(2, 4).toUpperCase()}
              </span>
            </div>
            <div className="leading-tight">
              {username ? (
                <Link
                  href={`/p/${encodeURIComponent(username)}`}
                  className="text-xs font-extrabold text-pink-500 hover:text-pink-600 transition-colors"
                >
                  @{username}
                </Link>
              ) : null}
              <div className="font-mono text-[11px] font-semibold text-mauve">
                {formatWallet(confession.wallet)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-pink-400 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-full">
              ⛓ on-chain
            </span>
            <span className="text-xs text-pink-300 font-semibold">
              {timeAgo(confession.timestamp)}
            </span>
          </div>
        </div>

        {/* Confession text */}
        <div>
          <p className="text-ink text-sm leading-relaxed font-medium italic break-words">
            {confession.text == null ? (
              <span className="text-pink-300 not-italic">
                Text pending sync — hash: <span className="font-mono">{confession.hash.slice(0, 14)}…</span>
              </span>
            ) : (
              displayText
            )}
          </p>

          {isLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1.5 text-xs font-extrabold text-pink-400 hover:text-pink-600 transition-colors"
            >
              {expanded ? '↑ Show less' : '↓ Show more'}
            </button>
          )}
        </div>

        {/* 4-button voting area */}
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => handleLegacyVote(1)}
              disabled={!isConnected || !!voteTxHash || !canUseLikeDislike}
              className={`
                flex items-center justify-center gap-1.5 h-8 rounded-full text-xs font-bold
                border bg-white transition-all duration-150 active:scale-95
                disabled:opacity-30 disabled:cursor-not-allowed ${likePopped ? 'animate-heart-pop' : ''}
                ${localUserVote === 1
                  ? 'border-green-300 text-green-600 bg-green-50'
                  : 'border-pink-200 text-mauve hover:bg-pink-50 hover:border-pink-300'
                }
              `}
            >
              <span className="inline-flex items-center gap-1.5">
                  <span>🤍</span>
                  <span>{localLikes}</span>
              </span>
            </button>
            <button
              onClick={() => handleLegacyVote(-1)}
              disabled={!isConnected || !!voteTxHash || !canUseLikeDislike}
              className={`
                flex items-center justify-center gap-1.5 h-8 rounded-full text-xs font-bold
                border bg-white transition-all duration-150 active:scale-95
                disabled:opacity-30 disabled:cursor-not-allowed
                ${localUserVote === -1
                  ? 'border-red-300 text-red-500 bg-red-50'
                  : 'border-pink-200 text-mauve hover:bg-pink-50 hover:border-pink-300'
                }
              `}
            >
              <span className="inline-flex items-center gap-1.5">
                <span>🖤</span>
                <span>{localDislikes}</span>
              </span>
            </button>
            <button
              onClick={() => handleTruthVote(true)}
              disabled={!isConnected || !address || wrongChain || isVoting || hasVoted || truthVoteBlocked || legacyConfession}
              className="flex items-center justify-center gap-1.5 h-8 rounded-full text-xs font-bold
                border border-pink-200 text-mauve bg-white
                hover:bg-pink-50 hover:border-pink-300
                transition-all duration-150 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              🕵️ Real
            </button>
            <button
              onClick={() => handleTruthVote(false)}
              disabled={!isConnected || !address || wrongChain || isVoting || hasVoted || truthVoteBlocked || legacyConfession}
              className="flex items-center justify-center gap-1.5 h-8 rounded-full text-xs font-bold
                border border-pink-200 text-mauve bg-white
                hover:bg-pink-50 hover:border-pink-300
                transition-all duration-150 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              🎭 Fake
            </button>
          </div>

          {!hasVoted ? (
            <>
              <p className="text-[11px] font-bold text-pink-500">
                Vote to unlock truth results
              </p>
            </>
          ) : (
            <div className="space-y-2 animate-fade-in">
              <p className="text-sm font-extrabold text-ink">
                🧠 {truthScore}% think this is real
              </p>
              <div className="w-full h-2 rounded-full bg-pink-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-blue-500 transition-all duration-500"
                  style={{ width: `${truthScore}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold text-[#7f758f]">
                <span>🕵️ Real: {realVotes}</span>
                <span>🎭 Fake: {fakeVotes}</span>
                <span>{totalVotes} total</span>
              </div>
            </div>
          )}

          {isVoting && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-pink-500">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Submitting vote...
            </div>
          )}

          {showSuccessToast && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-[11px] font-extrabold text-green-600 animate-fade-in">
              Vote submitted
            </div>
          )}

          {error && (
            <div className="text-[11px] font-bold text-red-500">{error}</div>
          )}
          {truthLocalError && (
            <div className="text-[11px] font-bold text-red-500">{truthLocalError}</div>
          )}
          {legacyVoteError && (
            <div className="text-[11px] font-bold text-red-500">{legacyVoteError}</div>
          )}
          {legacyConfession && (
            <p className="text-[11px] font-semibold text-amber-600">
              Bu kart eski kontrat kaydi. Like/Dislike aktif, Truth vote sadece yeni kontratta acik.
            </p>
          )}
          {truthVoteBlocked && isConnected && (
            <p className="text-[11px] font-semibold text-amber-600">
              Truth vote icin once en az 1 itiraf paylasmalisin.
            </p>
          )}

          {!isConnected && (
            <p className="text-[11px] font-semibold text-[#7f758f]">Connect wallet to vote.</p>
          )}

          {wrongChain && isConnected && (
            <p className="text-[11px] font-semibold text-amber-600">Switch to Base Mainnet to vote.</p>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">
            {confession.tips_received > 0 && (
              <span className="flex items-center gap-1 px-2.5 h-8 rounded-full text-xs font-bold border border-amber-200 bg-amber-50 text-amber-500">
                💸 {confession.tips_received}
              </span>
            )}
          </div>

          <button
            onClick={() => setShowTipModal(true)}
            disabled={!isConnected}
            className="flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-bold
              border border-amber-200 text-amber-500 bg-white
              hover:bg-amber-50 hover:border-amber-300
              disabled:opacity-30 disabled:cursor-not-allowed
              transition-all duration-150 active:scale-95"
          >
            💸 <span>Tip</span>
          </button>
        </div>
      </article>

      {showTipModal && (
        <TipModal
          confessionId={confession.id}
          ownerWallet={confession.wallet}
          onClose={() => setShowTipModal(false)}
        />
      )}
    </>
  );
}
