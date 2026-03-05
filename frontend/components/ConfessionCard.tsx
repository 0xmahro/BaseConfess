'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { base } from 'wagmi/chains';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { TipModal } from './TipModal';
import type { Confession, VoteType } from '@/types';

interface ConfessionCardProps {
  confession: Confession;
  userVote:   VoteType | undefined;
  onVoted:    (confessionId: number, vote: VoteType) => void;
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

export function ConfessionCard({ confession, userVote, onVoted }: ConfessionCardProps) {
  const { address, isConnected } = useAccount();
  const chainId    = useChainId();
  const wrongChain = isConnected && chainId !== base.id;

  const [showTipModal,  setShowTipModal]  = useState(false);
  const [localLikes,    setLocalLikes]    = useState(confession.likes);
  const [localDislikes, setLocalDislikes] = useState(confession.dislikes);
  const [localUserVote, setLocalUserVote] = useState<VoteType | undefined>(userVote);
  const [voteTxHash,    setVoteTxHash]    = useState<`0x${string}` | undefined>();
  const [voteError,     setVoteError]     = useState('');
  const [likePopped,    setLikePopped]    = useState(false);

  const pendingVoteRef = useRef<VoteType | null>(null);
  const { writeContractAsync } = useWriteContract();
  const { isSuccess: voteConfirmed } = useWaitForTransactionReceipt({ hash: voteTxHash });

  const handleVote = async (voteType: VoteType) => {
    if (!isConnected || !address) return;
    if (wrongChain) { setVoteError('Switch to Base'); return; }
    setVoteError('');

    const prevVote    = localUserVote;
    let   newLikes    = localLikes;
    let   newDislikes = localDislikes;

    if (prevVote === 1)  newLikes    = Math.max(0, newLikes - 1);
    if (prevVote === -1) newDislikes = Math.max(0, newDislikes - 1);
    if (voteType === 1)  { newLikes += 1; setLikePopped(true); setTimeout(() => setLikePopped(false), 400); }
    if (voteType === -1) newDislikes += 1;

    setLocalLikes(newLikes);
    setLocalDislikes(newDislikes);
    setLocalUserVote(voteType);

    try {
      const hash = await writeContractAsync({
        address:      CONTRACT_ADDRESS,
        abi:          CONTRACT_ABI,
        functionName: 'vote',
        args:         [BigInt(confession.id), voteType],
      });
      pendingVoteRef.current = voteType;
      setVoteTxHash(hash);
      onVoted(confession.id, voteType);
    } catch (err: unknown) {
      setLocalLikes(confession.likes);
      setLocalDislikes(confession.dislikes);
      setLocalUserVote(prevVote);
      const msg      = err instanceof Error ? err.message : '';
      const rejected = msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('denied');
      setVoteError(rejected ? '' : 'Vote failed');
    }
  };

  useEffect(() => {
    if (!voteConfirmed || !address || !pendingVoteRef.current) return;
    const voteType     = pendingVoteRef.current;
    const confessionId = confession.id;
    const wallet       = address.toLowerCase();

    const syncVote = async () => {
      try {
        await supabase.from('votes').upsert(
          { confession_id: confessionId, wallet, vote: voteType },
          { onConflict: 'confession_id,wallet' }
        );
        const { data: allVotes } = await supabase.from('votes').select('vote').eq('confession_id', confessionId);
        if (allVotes) {
          const likes    = allVotes.filter((v) => v.vote === 1).length;
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

  const [expanded, setExpanded] = useState(false);
  const CHAR_LIMIT = 180;
  const isLong = (confession.text?.length ?? 0) > CHAR_LIMIT;
  const displayText = isLong && !expanded
    ? confession.text!.slice(0, CHAR_LIMIT).trimEnd() + '...'
    : confession.text;

  const avatarGradient = walletColor(confession.wallet);

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
            <span className="font-mono text-xs font-semibold text-mauve">
              {formatWallet(confession.wallet)}
            </span>
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

        {/* Actions */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-1.5">

            {/* Like */}
            <button
              onClick={() => handleVote(1)}
              disabled={!isConnected || !!voteTxHash}
              className={`
                flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-bold
                border transition-all duration-150 active:scale-95
                disabled:opacity-40 disabled:cursor-not-allowed
                ${likePopped ? 'animate-heart-pop' : ''}
                ${localUserVote === 1
                  ? 'bg-green-50 border-green-300 text-green-600'
                  : 'bg-white border-pink-200 text-mauve hover:border-green-300 hover:text-green-500 hover:bg-green-50'
                }
              `}
            >
              <span className="text-sm">{localUserVote === 1 ? '💚' : '🤍'}</span>
              <span>{localLikes}</span>
            </button>

            {/* Dislike */}
            <button
              onClick={() => handleVote(-1)}
              disabled={!isConnected || !!voteTxHash}
              className={`
                flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-bold
                border transition-all duration-150 active:scale-95
                disabled:opacity-40 disabled:cursor-not-allowed
                ${localUserVote === -1
                  ? 'bg-red-50 border-red-300 text-red-500'
                  : 'bg-white border-pink-200 text-mauve hover:border-red-300 hover:text-red-400 hover:bg-red-50'
                }
              `}
            >
              <span className="text-sm">{localUserVote === -1 ? '💔' : '🖤'}</span>
              <span>{localDislikes}</span>
            </button>

            {/* Vote pending spinner */}
            {voteTxHash && !voteConfirmed && (
              <svg className="w-3.5 h-3.5 animate-spin text-pink-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            )}

            {voteError && <span className="text-xs text-red-400 font-bold ml-1">{voteError}</span>}

            {/* Tips badge */}
            {confession.tips_received > 0 && (
              <span className="flex items-center gap-1 px-2.5 h-8 rounded-full text-xs font-bold border border-amber-200 bg-amber-50 text-amber-500">
                💸 {confession.tips_received}
              </span>
            )}
          </div>

          {/* Tip button */}
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
