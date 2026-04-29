'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { base } from 'wagmi/chains';
import { keccak256, toBytes, parseEther, parseEventLogs } from 'viem';
import { builderCodeTxOpts } from '@/lib/builderCode';
import { CONTRACT_ADDRESS, CONTRACT_ABI, CONFESSION_FEE } from '@/lib/config';
import { supabase } from '@/lib/supabase';

const MAX_CHARS = 1000;
const MIN_CONFESSION_CHARS = 15;

export function PostConfession() {
  const { address, isConnected } = useAccount();
  const chainId    = useChainId();
  const wrongChain = isConnected && chainId !== base.id;

  const [text, setText]         = useState('');
  const [status, setStatus]     = useState<'idle' | 'pending' | 'confirming' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [txHash, setTxHash]     = useState<`0x${string}` | undefined>();

  const submittedTextRef = useRef('');

  const { writeContractAsync } = useWriteContract();
  const { isSuccess: txConfirmed, data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || !isConnected || !address || wrongChain) return;
    if (trimmed.length < MIN_CONFESSION_CHARS) {
      setErrorMsg(`Confession is too short (min ${MIN_CONFESSION_CHARS} characters).`);
      setStatus('error');
      return;
    }
    setStatus('pending');
    setErrorMsg('');

    try {
      const confessionHash = keccak256(toBytes(trimmed)) as `0x${string}`;
      const hash = await writeContractAsync({
        address:      CONTRACT_ADDRESS,
        abi:          CONTRACT_ABI,
        functionName: 'postConfession',
        args:         [confessionHash, trimmed.length],
        value:        parseEther(CONFESSION_FEE),
        ...builderCodeTxOpts(),
      });
      submittedTextRef.current = trimmed;
      setTxHash(hash);
      setStatus('confirming');
    } catch (err: unknown) {
      const msg      = err instanceof Error ? err.message : '';
      const rejected = msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('denied');
      setErrorMsg(rejected ? 'Transaction cancelled.' : 'Transaction failed. Check balance and network.');
      setStatus('error');
    }
  };

  useEffect(() => {
    if (!txConfirmed || !receipt || !address) return;
    const capturedText = submittedTextRef.current;

    const store = async () => {
      let stored = false;
      try {
        const logs = parseEventLogs({
          abi: CONTRACT_ABI,
          logs: receipt.logs,
          eventName: 'ConfessionPosted',
          strict: false,
        });
        if (logs.length === 0) throw new Error('Event not found');

        const { confessionId, confessionHash, timestamp, user } = logs[0].args as {
          confessionId: bigint;
          confessionHash: `0x${string}`;
          timestamp: bigint;
          user?: `0x${string}`;
        };

        const { error: upsertError } = await supabase.from('confessions').upsert(
          {
            id: Number(confessionId),
            wallet: (user ?? address).toLowerCase(),
            text: capturedText,
            hash: confessionHash,
            timestamp: new Date(Number(timestamp) * 1000).toISOString(),
          },
          { onConflict: 'id' }
        );
        if (upsertError) throw upsertError;
        stored = true;

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('confession:posted'));
        }
      } catch (err) {
        console.error('[PostConfession] Supabase write error:', err);
        setErrorMsg('Transaction confirmed but feed sync failed. Please tap Refresh.');
        setStatus('error');
      } finally {
        setTxHash(undefined);
        if (stored) {
          setText('');
          submittedTextRef.current = '';
          setStatus('success');
          setTimeout(() => setStatus('idle'), 4000);
        }
      }
    };
    store();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txConfirmed, receipt]);

  const charsLeft    = MAX_CHARS - text.length;
  const isOverLimit  = charsLeft < 0;
  const isProcessing = status === 'pending' || status === 'confirming';
  const canSubmit    =
    isConnected &&
    !wrongChain &&
    text.trim().length >= MIN_CONFESSION_CHARS &&
    !isOverLimit &&
    status === 'idle';

  const hashPreview = text.trim()
    ? keccak256(toBytes(text.trim())).slice(0, 18) + '...'
    : null;

  return (
    <div className="bg-white rounded-3xl border border-pink-200 shadow-[0_16px_56px_rgba(236,72,153,0.12)] p-5 space-y-4">

      {/* Title row */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-60" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-pink-500" />
        </span>
        <span className="text-sm font-bold text-pink-500">New Confession</span>
      </div>

      {/* Wrong chain */}
      {wrongChain && (
        <div className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-600 font-semibold">
          ⚠️ Switch to <span className="ml-1 underline">Base Mainnet</span>
        </div>
      )}

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's your confession? It lives on Base forever... 🤫"
          disabled={isProcessing || !isConnected || wrongChain}
          rows={4}
          maxLength={MAX_CHARS}
          className={`
            w-full resize-none rounded-2xl border px-4 py-3 pb-7
            text-sm text-ink placeholder-pink-500/70 font-semibold
            bg-pink-50 outline-none transition-all duration-200
            focus:border-pink-400 focus:ring-2 focus:ring-pink-100
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isOverLimit ? 'border-red-400' : 'border-pink-200'}
          `}
        />
        <span className={`absolute bottom-3 right-3 text-[11px] font-mono transition-colors ${
          isOverLimit ? 'text-red-400' : charsLeft <= 50 ? 'text-amber-400' : 'text-pink-300'
        }`}>
          {charsLeft}
        </span>
      </div>

      {/* Hash preview */}
      {hashPreview && (
        <div className="flex items-center gap-1.5 text-[11px] text-mauve">
          <span>#</span>
          <span className="font-mono text-pink-400">{hashPreview}</span>
          <span className="text-pink-200">· keccak256 stored on-chain</span>
        </div>
      )}

      {/* Fee */}
      <div className="flex items-center gap-1.5 text-xs text-mauve">
        <span className="text-blue-400">ⓘ</span>
        <span>Posting fee: <span className="font-bold text-blue-500">{CONFESSION_FEE} ETH</span> on Base</span>
      </div>

      {/* Success */}
      {status === 'success' && (
        <div className="flex items-center gap-2 rounded-2xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-600 font-semibold animate-fade-in">
          ✓ Confession posted on-chain. Your secret is eternal. 🤫
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="flex items-center gap-2 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-500 font-semibold animate-fade-in">
          ✗ {errorMsg}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit || isProcessing}
        className={`
          w-full h-12 rounded-2xl text-sm font-extrabold
          transition-all duration-200 flex items-center justify-center gap-2
          ${canSubmit && !isProcessing
            ? 'bg-gradient-to-r from-pink-500 to-pink-400 text-white shadow-pink hover:from-pink-600 hover:to-pink-500 active:scale-[0.98]'
            : 'bg-pink-200/80 text-pink-500/70 cursor-not-allowed'
          }
        `}
      >
        {isProcessing ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {status === 'pending' ? 'Waiting for wallet...' : 'Confirming on Base...'}
          </>
        ) : !isConnected ? (
          'Connect wallet to confess 💬'
        ) : wrongChain ? (
          '⚠️ Switch to Base Mainnet'
        ) : (
          <>🤫 Confess Anonymously</>
        )}
      </button>

      {!canSubmit && !isProcessing && (
        <p className="text-[11px] font-semibold text-[#7f758f] text-center">
          {!isConnected
            ? 'Connect wallet to post.'
            : wrongChain
              ? 'Switch to Base Mainnet.'
              : text.trim().length < MIN_CONFESSION_CHARS
                ? `Write at least ${MIN_CONFESSION_CHARS} characters.`
                : null}
        </p>
      )}
    </div>
  );
}
