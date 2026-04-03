'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import { base } from 'wagmi/chains';
import { decodeEventLog, formatEther, parseAbiItem } from 'viem';
import { sdk } from '@farcaster/miniapp-sdk';
import {
  LOVE_METER_ABI,
  LOVE_METER_CONTRACT_ADDRESS,
  getLoveMeterDeployBlock,
} from '@/lib/config';
import { useMiniApp } from '@/hooks/useMiniApp';

const DEFAULT_APP_URL = 'https://baseconfess.fun';

const LOG_CHUNK_BLOCKS = BigInt(1999);

const loveTestedEvent = parseAbiItem(
  'event LoveTested(address indexed user, bytes32 indexed name1Hash, bytes32 indexed name2Hash, uint8 percent, uint256 paid)'
);

function formatMeasurementCount(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

function loveMeterShare(
  appBaseUrl: string,
  nameA: string,
  nameB: string,
  score: number
) {
  const base = appBaseUrl.replace(/\/$/, '');
  const pageUrl = `${base}/ask`;
  const headline = '💗 BaseConfess · Love Meter';
  const pairLine = `${nameA} & ${nameB}`;

  const whatsappBody = [
    headline,
    '',
    pairLine,
    `${score}% compatibility · settled on-chain on Base`,
    '',
    pageUrl,
  ].join('\n');

  const tweetBody = [
    headline,
    '',
    pairLine,
    `${score}% · on-chain on Base`,
  ].join('\n');

  const castBody = [
    headline,
    '',
    pairLine,
    `${score}% · on-chain on Base`,
  ].join('\n');

  const tweetHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetBody)}&url=${encodeURIComponent(pageUrl)}&hashtags=BaseConfess,Base,onchain`;

  const waHref = `https://wa.me/?text=${encodeURIComponent(whatsappBody)}`;

  const warpcastComposeHref = `https://warpcast.com/~/compose?text=${encodeURIComponent(
    `${castBody}\n\n${pageUrl}`
  )}`;

  return { pageUrl, tweetHref, waHref, warpcastComposeHref, castBody };
}

export default function AskTestPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { isMiniApp } = useMiniApp();

  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [step, setStep] = useState<'form' | 'result'>('form');
  const [percent, setPercent] = useState<number | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState('');
  const resultCommitted = useRef(false);
  const [eventBackedCount, setEventBackedCount] = useState<number | null>(null);
  const [eventCountLoading, setEventCountLoading] = useState(false);
  const hasOnChainCounterRef = useRef(false);

  const loveMeterDeployBlock = getLoveMeterDeployBlock();

  const { data: feeWei } = useReadContract({
    address: LOVE_METER_CONTRACT_ADDRESS,
    abi: LOVE_METER_ABI,
    functionName: 'fee',
    query: { enabled: step === 'form' },
  });

  const {
    data: totalTestsWei,
    isError: totalTestsReadError,
    isFetching: totalTestsFetching,
    isPending: totalTestsPending,
    refetch: refetchTotalTests,
  } = useReadContract({
    address: LOVE_METER_CONTRACT_ADDRESS,
    abi: LOVE_METER_ABI,
    functionName: 'totalTests',
    query: {
      enabled: chainId === base.id,
      retry: false,
    },
  });

  const hasContractCounter = typeof totalTestsWei === 'bigint';
  hasOnChainCounterRef.current = hasContractCounter;

  useEffect(() => {
    if (chainId !== base.id || !publicClient) return;
    if (typeof totalTestsWei === 'bigint') return;
    if (totalTestsPending || totalTestsFetching) return;
    if (!totalTestsReadError) return;
    if (loveMeterDeployBlock == null) return;

    let cancelled = false;
    setEventCountLoading(true);

    (async () => {
      try {
        const latest = await publicClient.getBlockNumber();
        let from = loveMeterDeployBlock;
        let count = 0;
        while (from <= latest && !cancelled) {
          const to =
            from + LOG_CHUNK_BLOCKS > latest ? latest : from + LOG_CHUNK_BLOCKS;
          const logs = await publicClient.getLogs({
            address: LOVE_METER_CONTRACT_ADDRESS,
            event: loveTestedEvent,
            fromBlock: from,
            toBlock: to,
          });
          count += logs.length;
          from = to + BigInt(1);
        }
        if (!cancelled) setEventBackedCount(count);
      } catch {
        if (!cancelled) setEventBackedCount(null);
      } finally {
        if (!cancelled) setEventCountLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    chainId,
    publicClient,
    totalTestsWei,
    totalTestsReadError,
    totalTestsPending,
    totalTestsFetching,
    loveMeterDeployBlock,
  ]);

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
        if (hasOnChainCounterRef.current) void refetchTotalTests();
        else setEventBackedCount((c) => (c == null ? 1 : c + 1));
      } catch {
        setError('Could not read result from chain. Please try again.');
        resultCommitted.current = false;
      } finally {
        setTxHash(undefined);
      }
    })();
  }, [isSuccess, txHash, publicClient, refetchTotalTests]);

  const wrongChain = chainId !== base.id;
  const busy = isWriting || isConfirming;

  const measurementsLoading =
    chainId === base.id &&
    (((totalTestsPending || totalTestsFetching) && !totalTestsReadError) ||
      eventCountLoading);

  const measurementsValue: number | null =
    typeof totalTestsWei === 'bigint' ? Number(totalTestsWei) : eventBackedCount;

  const showMeasurementsBadge =
    chainId === base.id &&
    (measurementsLoading || measurementsValue !== null);

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
      setError('Switch to Base Mainnet.');
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

  const appBaseUrl = process.env.NEXT_PUBLIC_URL ?? DEFAULT_APP_URL;

  const share = useMemo(() => {
    if (percent == null) return null;
    return loveMeterShare(appBaseUrl, name1.trim(), name2.trim(), percent);
  }, [appBaseUrl, percent, name1, name2]);

  const openFarcasterShare = async () => {
    if (!share) return;
    if (isMiniApp) {
      try {
        await sdk.actions.composeCast({
          text: share.castBody,
          embeds: [share.pageUrl],
        });
      } catch {
        window.open(share.warpcastComposeHref, '_blank', 'noopener,noreferrer');
      }
    } else {
      window.open(share.warpcastComposeHref, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-gradient-to-b from-[#efe9ff] via-[#e8e0ff] to-[#f7dff1]">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-24 left-[-15%] w-[26rem] h-[26rem] rounded-full bg-fuchsia-400/40 blur-3xl" />
        <div className="absolute top-24 right-[-20%] w-[30rem] h-[30rem] rounded-full bg-indigo-400/40 blur-3xl" />
        <div className="absolute bottom-[-10rem] left-[10%] w-[28rem] h-[28rem] rounded-full bg-pink-300/40 blur-3xl" />

        <div className="absolute top-20 left-[12%] text-white/40 text-2xl rotate-[-12deg]">💗</div>
        <div className="absolute top-36 right-[18%] text-white/35 text-3xl rotate-[10deg]">💞</div>
        <div className="absolute bottom-44 left-[18%] text-white/35 text-3xl rotate-[6deg]">💘</div>
        <div className="absolute bottom-28 right-[14%] text-white/40 text-2xl rotate-[-8deg]">✨</div>
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

      <main className="relative z-10 max-w-lg mx-auto px-4 pb-16 pt-8">
        {step === 'form' && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500 bg-clip-text text-transparent drop-shadow-sm">
                LOVE METER
              </h1>
              <p className="text-sm font-black text-indigo-600/90">
                On-chain on Base ·{' '}
                {feeWei ? `${formatEther(feeWei)} ETH` : '…'}
              </p>
              {showMeasurementsBadge && (
                <div className="flex justify-center pt-1">
                  <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/90 bg-white/75 px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-indigo-800 shadow-sm">
                    <span aria-hidden>📊</span>
                    {measurementsLoading ? (
                      <span>Counting measurements…</span>
                    ) : measurementsValue !== null ? (
                      <span>
                        {formatMeasurementCount(measurementsValue)} measurements
                        on Base
                      </span>
                    ) : null}
                  </div>
                </div>
              )}
              <p className="text-[12px] font-bold text-indigo-600/70">
                Two names in. One transaction. A score you can share.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-[2rem] shadow-[0_14px_70px_rgba(76,29,149,0.16)] border border-white/70 p-5 sm:p-6 space-y-5 overflow-hidden">
              <div className="flex items-center justify-center gap-2">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-indigo-500 text-white shadow-md">
                  💗
                </span>
                <span className="text-xs font-extrabold uppercase tracking-widest text-indigo-700/70">
                  Enter names
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={name1}
                    onChange={(e) => setName1(e.target.value)}
                    placeholder="You"
                    maxLength={40}
                    className="w-full rounded-full border-2 border-violet-100 bg-white px-5 py-3.5 text-ink font-black placeholder:text-mauve/60 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200/60"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={name2}
                    onChange={(e) => setName2(e.target.value)}
                    placeholder="Partner"
                    maxLength={40}
                    className="w-full rounded-full border-2 border-violet-100 bg-white px-5 py-3.5 text-ink font-black placeholder:text-mauve/60 focus:outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-200/60"
                  />
                </div>
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
                className="w-full rounded-full py-4 font-black text-white text-lg shadow-[0_14px_50px_rgba(99,102,241,0.35)] bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-500 hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none"
              >
                {busy
                  ? isConfirming
                    ? 'Waiting for confirmation…'
                    : 'Wallet…'
                  : 'Run Love Meter'}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] font-extrabold text-indigo-700/55">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-300" />
                <span>No storage · Names stay on your device</span>
              </div>
            </div>
          </div>
        )}

        {step === 'result' && percent != null && (
          <div className="space-y-10 animate-fade-in text-center pt-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-ink">
                <span className="text-ink">{name1.trim()}</span>{' '}
                <span className="text-violet-400 font-extrabold">&</span>{' '}
                <span className="text-ink">{name2.trim()}</span>
              </h2>
              <p className="mt-2 text-lg font-black text-fuchsia-500">
                compatibility score
              </p>
              {showMeasurementsBadge && (
                <div className="flex justify-center mt-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/90 bg-white/75 px-4 py-2 text-[11px] font-extrabold uppercase tracking-wide text-indigo-800 shadow-sm">
                    <span aria-hidden>📊</span>
                    {measurementsLoading ? (
                      <span>Counting measurements…</span>
                    ) : measurementsValue !== null ? (
                      <span>
                        {formatMeasurementCount(measurementsValue)} measurements
                        on Base
                      </span>
                    ) : null}
                  </div>
                </div>
              )}
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

            {share && (
              <div className="flex flex-col items-stretch gap-3 max-w-sm mx-auto w-full">
                <p className="text-center text-[11px] font-extrabold uppercase tracking-widest text-violet-400/90">
                  Share result
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <a
                    href={share.waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 min-w-[7.5rem] justify-center items-center gap-2 rounded-2xl bg-[#25D366] px-4 py-3 text-white font-bold text-sm shadow-md hover:brightness-105"
                  >
                    WhatsApp
                  </a>
                  <a
                    href={share.tweetHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 min-w-[7.5rem] justify-center items-center gap-2 rounded-2xl bg-[#0f1419] px-4 py-3 text-white font-bold text-sm shadow-md hover:bg-black/90"
                  >
                    Post on X
                  </a>
                  <button
                    type="button"
                    onClick={openFarcasterShare}
                    className="inline-flex flex-1 min-w-[7.5rem] justify-center items-center gap-2 rounded-2xl bg-[#6A3CFF] px-4 py-3 text-white font-bold text-sm shadow-md hover:brightness-110"
                  >
                    Cast
                  </button>
                </div>
              </div>
            )}

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
