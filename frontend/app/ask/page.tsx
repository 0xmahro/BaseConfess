'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { decodeEventLog, formatEther } from 'viem';
import { sdk } from '@farcaster/miniapp-sdk';
import { LOVE_METER_ABI, LOVE_METER_CONTRACT_ADDRESS } from '@/lib/config';

export default function AskTestPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();

  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [step, setStep] = useState<'form' | 'result'>('form');
  const [percent, setPercent] = useState<number | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState('');
  const resultCommitted = useRef(false);

  const { data: feeWei } = useReadContract({
    address: LOVE_METER_CONTRACT_ADDRESS,
    abi: LOVE_METER_ABI,
    functionName: 'fee',
    query: { enabled: step === 'form' },
  });

  const { writeContractAsync, isPending: isWriting } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  useEffect(() => {
    sdk.actions.ready();
  }, []);

  useEffect(() => {
    if (!isSuccess || !txHash || resultCommitted.current) return;
    if (!publicClient) return;

    resultCommitted.current = true;
    (async () => {
      try {
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
        let found: number | null = null;

        for (const log of receipt.logs) {
          if (log.address?.toLowerCase() !== LOVE_METER_CONTRACT_ADDRESS.toLowerCase()) continue;
          try {
            const decoded = decodeEventLog({
              abi: LOVE_METER_ABI,
              data: log.data,
              topics: log.topics,
            });
            if (decoded.eventName === 'LoveTested') {
              const p = decoded.args.percent as unknown as number;
              found = Number(p);
              break;
            }
          } catch {
            // ignore non-matching logs
          }
        }

        if (found == null || Number.isNaN(found)) throw new Error('No LoveTested event found');
        setPercent(found);
        setStep('result');
      } catch {
        setError('Could not read result from chain. Please try again.');
        resultCommitted.current = false;
      } finally {
        setTxHash(undefined);
      }
    })();
  }, [isSuccess, txHash, publicClient]);

  const supportedChain = chainId === base.id || chainId === baseSepolia.id;
  const wrongChain = !supportedChain;
  const busy = isWriting || isConfirming;

  const runTest = async () => {
    setError('');
    const a = name1.trim();
    const b = name2.trim();
    if (!a || !b) {
      setError('Please enter both names.');
      return;
    }
    if (!isConnected || !address) {
      setError('Please connect your wallet first.');
      return;
    }
    if (wrongChain) {
      setError('Switch to Base (or Base Sepolia).');
      return;
    }
    if (!feeWei) {
      setError('Fee is loading — try again in a moment.');
      return;
    }

    resultCommitted.current = false;
    try {
      const hash = await writeContractAsync({
        address: LOVE_METER_CONTRACT_ADDRESS,
        abi: LOVE_METER_ABI,
        functionName: 'test',
        args: [a, b],
        value: feeWei,
      });
      setTxHash(hash);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      const rejected =
        msg.toLowerCase().includes('user rejected') ||
        msg.toLowerCase().includes('denied');
      if (rejected) setError('Transaction cancelled.');
      else setError('Transaction failed. Check balance and network.');
    }
  };

  const reset = () => {
    setStep('form');
    setPercent(null);
    setError('');
    resultCommitted.current = false;
  };

  const shareText =
    percent != null
      ? `${name1.trim()} + ${name2.trim()} — Love Meter: ${percent}%`
      : '';
  const waHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const tweetHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;

  return (
    <div className="min-h-screen bg-[#e4dcfa] relative overflow-x-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        aria-hidden
      >
        <div className="absolute top-20 left-[8%] w-32 h-32 rounded-full bg-violet-400 blur-2xl" />
        <div className="absolute bottom-40 right-[10%] w-40 h-40 rounded-full bg-pink-400 blur-3xl" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-4 pt-4 max-w-lg mx-auto">
        <Link
          href="/"
          className="text-sm font-extrabold text-violet-700/80 hover:text-violet-900"
        >
          ← BaseConfess
        </Link>
        <ConnectButton
          accountStatus="avatar"
          chainStatus="icon"
          showBalance={false}
        />
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-4 pb-16 pt-6">
        {step === 'form' && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 bg-clip-text text-transparent drop-shadow-sm">
                LOVE METER
              </h1>
              <p className="text-sm font-bold text-indigo-600/90">
                On-chain on Base ·{' '}
                {feeWei ? `${formatEther(feeWei)} ETH` : '…'}
              </p>
            </div>

            <div className="bg-white rounded-[2rem] rounded-b-3xl shadow-[0_8px_40px_rgba(99,102,241,0.12)] border border-white/80 p-5 sm:p-6 space-y-5">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={name1}
                  onChange={(e) => setName1(e.target.value)}
                  placeholder="You"
                  maxLength={40}
                  className="flex-1 rounded-full border-2 border-violet-100 bg-white px-5 py-3.5 text-ink font-bold placeholder:text-mauve/60 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200/60"
                />
                <input
                  type="text"
                  value={name2}
                  onChange={(e) => setName2(e.target.value)}
                  placeholder="Partner"
                  maxLength={40}
                  className="flex-1 rounded-full border-2 border-violet-100 bg-white px-5 py-3.5 text-ink font-bold placeholder:text-mauve/60 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200/60"
                />
              </div>

              {error && (
                <p className="text-center text-sm font-bold text-red-500">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={runTest}
                disabled={busy}
                className="w-full rounded-full py-4 font-black text-white text-lg shadow-lg bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-500 hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {busy
                  ? isConfirming
                    ? 'Waiting for confirmation…'
                    : 'Wallet…'
                  : 'Run Love Meter'}
              </button>
            </div>
          </div>
        )}

        {step === 'result' && percent != null && (
          <div className="space-y-10 animate-fade-in text-center pt-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-ink">
                <span className="text-ink">{name1.trim()}</span>{' '}
                <span className="text-violet-400 font-extrabold">+</span>{' '}
                <span className="text-ink">{name2.trim()}</span>
              </h2>
              <p className="mt-2 text-lg font-black text-fuchsia-500">
                compatibility score
              </p>
            </div>

            <div className="flex justify-center">
              <div className="relative w-[min(280px,85vw)] aspect-square flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  className="w-full h-full drop-shadow-[0_12px_40px_rgba(236,72,153,0.35)]"
                  aria-hidden
                >
                  <defs>
                    <linearGradient
                      id="askHeartGrad"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#fb7185" />
                      <stop offset="100%" stopColor="#4f46e5" />
                    </linearGradient>
                  </defs>
                  <path
                    fill="url(#askHeartGrad)"
                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-5xl sm:text-6xl font-black text-white pt-2">
                  %{percent}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#25D366] px-5 py-3 text-white font-bold text-sm shadow-md hover:brightness-105"
              >
                WhatsApp
              </a>
              <a
                href={tweetHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 font-extrabold text-sm underline-offset-2 hover:underline"
              >
                Tweet
              </a>
            </div>

            <button
              type="button"
              onClick={reset}
              className="text-violet-700 font-bold text-sm hover:underline"
            >
              Try again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
