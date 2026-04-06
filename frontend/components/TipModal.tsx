'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { base } from 'wagmi/chains';
import { parseEther } from 'viem';
import { builderCodeTxOpts } from '@/lib/builderCode';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '@/lib/config';
import { supabase } from '@/lib/supabase';

interface TipModalProps {
  confessionId: number;
  ownerWallet:  string;
  onClose:      () => void;
}

const QUICK_AMOUNTS = ['0.001', '0.005', '0.01'];

export function TipModal({ confessionId, ownerWallet, onClose }: TipModalProps) {
  const { address } = useAccount();
  const chainId     = useChainId();
  const wrongChain  = chainId !== base.id;

  const [amount,       setAmount]    = useState('0.001');
  const [customAmount, setCustom]    = useState('');
  const [useCustom,    setUseCustom] = useState(false);
  const [txHash,       setTxHash]    = useState<`0x${string}` | undefined>();
  const [error,        setError]     = useState('');
  const [isPending,    setIsPending] = useState(false);

  const sentAmountRef = useRef('');
  const { writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const finalAmount = useCustom ? customAmount : amount;

  const handleTip = async () => {
    if (!finalAmount || Number(finalAmount) <= 0) { setError('Enter a valid amount.'); return; }
    if (!address) { setError('Connect your wallet first.'); return; }
    if (wrongChain) { setError('Switch to Base Mainnet first.'); return; }

    setError('');
    setIsPending(true);

    try {
      const hash = await writeContractAsync({
        address:      CONTRACT_ADDRESS,
        abi:          CONTRACT_ABI,
        functionName: 'tip',
        args:         [BigInt(confessionId)],
        value:        parseEther(finalAmount),
        ...builderCodeTxOpts(),
      });
      sentAmountRef.current = finalAmount;
      setTxHash(hash);
    } catch (err: unknown) {
      const msg      = err instanceof Error ? err.message : '';
      const rejected = msg.toLowerCase().includes('user rejected') || msg.toLowerCase().includes('denied');
      if (rejected) setError('Transaction cancelled.');
      else if (msg.includes('ContractFunctionExecution') || msg.includes('execution reverted'))
        setError('Contract error — check you are on Base Mainnet.');
      else setError('Transaction failed. Check balance and network.');
    } finally {
      setIsPending(false);
    }
  };

  useEffect(() => {
    if (!isSuccess || !address) return;
    const tipAmount  = sentAmountRef.current;
    const fromWallet = address.toLowerCase();
    const toWallet   = ownerWallet.toLowerCase();

    const syncTip = async () => {
      try {
        await supabase.from('tips').insert({
          confession_id: confessionId,
          from_wallet:   fromWallet,
          to_wallet:     toWallet,
          amount:        tipAmount,
        });
        const { data: c } = await supabase.from('confessions').select('tips_received').eq('id', confessionId).single();
        if (c) await supabase.from('confessions').update({ tips_received: c.tips_received + 1 }).eq('id', confessionId);
      } catch (err) {
        console.error('[TipModal] Supabase sync error:', err);
      }
    };
    syncTip();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  const isProcessing = isPending || isConfirming;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-4xl border border-pink-200 bg-white p-6 space-y-5 animate-slide-up shadow-modal overflow-hidden">

        {/* Pink accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 to-pink-300 rounded-t-4xl" />

        {/* Header */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💸</span>
            <h2 className="text-base font-extrabold text-ink">Send a Tip</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-mauve hover:text-ink hover:bg-pink-50 transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-mauve font-semibold">
          ETH goes directly to the confession owner on-chain. 🔒
        </p>

        {/* Wrong chain */}
        {wrongChain && (
          <div className="flex items-center gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-600 font-bold">
            ⚠️ Switch to Base Mainnet
          </div>
        )}

        {/* Success */}
        {isSuccess ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="text-5xl animate-heart-pop">💸</div>
              <p className="text-base font-extrabold text-ink">Tip sent!</p>
              <p className="text-xs text-mauve">The confession owner received your ETH.</p>
            </div>
            <button
              onClick={onClose}
              className="w-full h-11 rounded-2xl bg-pink-50 border border-pink-200 text-pink-500 text-sm font-bold hover:bg-pink-100 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            {/* Quick amounts */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-mauve">Quick amounts (ETH)</p>
              <div className="flex gap-2">
                {QUICK_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => { setAmount(a); setUseCustom(false); }}
                    className={`flex-1 h-10 rounded-2xl text-xs font-extrabold border transition-all ${
                      !useCustom && amount === a
                        ? 'bg-gradient-to-r from-pink-500 to-pink-400 border-pink-500 text-white shadow-pink'
                        : 'bg-white border-pink-200 text-pink-400 hover:border-pink-400 hover:bg-pink-50'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-mauve">Custom amount</p>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.001"
                  placeholder="0.000"
                  value={customAmount}
                  onChange={(e) => { setCustom(e.target.value); setUseCustom(true); }}
                  onFocus={() => setUseCustom(true)}
                  className={`
                    w-full h-11 rounded-2xl border bg-pink-50 px-4 pr-14
                    text-sm font-bold text-ink placeholder-pink-300 outline-none
                    transition-all focus:border-pink-400 focus:ring-2 focus:ring-pink-100
                    ${useCustom ? 'border-pink-400' : 'border-pink-200'}
                  `}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-pink-400">
                  ETH
                </span>
              </div>
            </div>

            {error && <p className="text-xs text-red-400 font-bold">{error}</p>}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 h-11 rounded-2xl border border-pink-200 text-mauve text-sm font-bold hover:bg-pink-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTip}
                disabled={isProcessing || !finalAmount || wrongChain}
                className={`
                  flex-1 h-11 rounded-2xl text-sm font-extrabold
                  flex items-center justify-center gap-2 transition-all
                  ${!isProcessing && finalAmount && !wrongChain
                    ? 'bg-gradient-to-r from-pink-500 to-pink-400 text-white shadow-pink hover:from-pink-600 hover:to-pink-500 active:scale-95'
                    : 'bg-pink-100 text-pink-300 cursor-not-allowed'
                  }
                `}
              >
                {isProcessing ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    {isPending ? 'Confirm...' : 'Sending...'}
                  </>
                ) : (
                  `💸 Tip ${finalAmount || '0'} ETH`
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
