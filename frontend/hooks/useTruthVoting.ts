'use client';

import { useEffect, useMemo, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { builderCodeTxOpts } from '@/lib/builderCode';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '@/lib/config';

type UseTruthVotingParams = {
  confessionId: number;
  initialRealVotes: number;
  initialFakeVotes: number;
  initialHasVoted: boolean;
};

export function useTruthVoting({
  confessionId,
  initialRealVotes,
  initialFakeVotes,
  initialHasVoted,
}: UseTruthVotingParams) {
  const [realVotes, setRealVotes] = useState(initialRealVotes);
  const [fakeVotes, setFakeVotes] = useState(initialFakeVotes);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const { writeContractAsync } = useWriteContract();
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    setRealVotes(initialRealVotes);
  }, [initialRealVotes]);

  useEffect(() => {
    setFakeVotes(initialFakeVotes);
  }, [initialFakeVotes]);

  useEffect(() => {
    setHasVoted(initialHasVoted);
  }, [initialHasVoted]);

  useEffect(() => {
    if (!txConfirmed) return;
    setTxHash(undefined);
    setShowSuccessToast(true);
    const timer = setTimeout(() => setShowSuccessToast(false), 1800);
    return () => clearTimeout(timer);
  }, [txConfirmed]);

  const submitVote = async (isReal: boolean) => {
    if (hasVoted || txHash) return;
    setError('');

    // Optimistic UI: immediately lock choices and update counters.
    setHasVoted(true);
    if (isReal) setRealVotes((v) => v + 1);
    else setFakeVotes((v) => v + 1);

    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'voteTruth',
        args: [BigInt(confessionId), isReal],
        ...builderCodeTxOpts(),
      });
      setTxHash(hash);
    } catch (err: unknown) {
      // Revert optimistic state on tx failure.
      setHasVoted(initialHasVoted);
      setRealVotes(initialRealVotes);
      setFakeVotes(initialFakeVotes);
      const message = err instanceof Error ? err.message : '';
      const normalized = message.toLowerCase();
      const rejected =
        normalized.includes('user rejected') ||
        normalized.includes('denied');
      if (rejected) {
        setError('');
      } else if (
        normalized.includes('post at least 1 confession') ||
        normalized.includes('post at least one confession')
      ) {
        setError('Post at least one confession before voting.');
      } else if (normalized.includes('already voted')) {
        setError('You already voted on this confession.');
      } else {
        setError('Vote failed. Try again.');
      }
    }
  };

  const totalVotes = realVotes + fakeVotes;
  const truthScore = useMemo(
    () => (totalVotes > 0 ? Math.round((realVotes / totalVotes) * 100) : 0),
    [realVotes, totalVotes]
  );

  return {
    realVotes,
    fakeVotes,
    totalVotes,
    truthScore,
    hasVoted,
    isVoting: Boolean(txHash) && !txConfirmed,
    error,
    showSuccessToast,
    submitVote,
  };
}
