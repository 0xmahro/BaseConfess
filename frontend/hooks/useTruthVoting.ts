'use client';

import { useEffect, useMemo, useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { TRUTH_REGISTRY_ABI, TRUTH_REGISTRY_ADDRESS } from '@/lib/config';
import { builderCodeTxOpts } from '@/lib/builderCode';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

type UseTruthVotingParams = {
  confessionId: number;
  initialRealVotes: number;
  initialFakeVotes: number;
  initialHasVoted: boolean;
  /**
   * Optional override (e.g. a custom registry deployment). Defaults to
   * the project-wide TRUTH_REGISTRY_ADDRESS configured via env.
   */
  contractAddress?: `0x${string}` | null;
};

export function useTruthVoting({
  confessionId,
  initialRealVotes,
  initialFakeVotes,
  initialHasVoted,
  contractAddress,
}: UseTruthVotingParams) {
  const registryAddress =
    contractAddress && contractAddress !== ZERO_ADDRESS
      ? contractAddress
      : TRUTH_REGISTRY_ADDRESS !== ZERO_ADDRESS
        ? TRUTH_REGISTRY_ADDRESS
        : null;
  const [realVotes, setRealVotes] = useState(initialRealVotes);
  const [fakeVotes, setFakeVotes] = useState(initialFakeVotes);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const { writeContractAsync } = useWriteContract();
  const {
    isSuccess: txConfirmed,
    isError: txReceiptFailed,
    error: txReceiptError,
  } = useWaitForTransactionReceipt({ hash: txHash });

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

  useEffect(() => {
    if (!txReceiptFailed) return;
    setTxHash(undefined);
    setHasVoted(initialHasVoted);
    setRealVotes(initialRealVotes);
    setFakeVotes(initialFakeVotes);
    const message =
      txReceiptError instanceof Error ? txReceiptError.message.toLowerCase() : '';
    if (message.includes('reverted')) {
      setError('Islem zincirde basarisiz oldu (revert).');
    } else {
      setError('Islem dogrulanamadi. Tekrar dene.');
    }
  }, [txReceiptFailed, txReceiptError, initialHasVoted, initialRealVotes, initialFakeVotes]);

  useEffect(() => {
    if (!txHash) return;
    const timer = setTimeout(() => {
      setTxHash(undefined);
      setHasVoted(initialHasVoted);
      setRealVotes(initialRealVotes);
      setFakeVotes(initialFakeVotes);
      setError('Islem uzun surdu. Durumu cuzdandan kontrol edip tekrar dene.');
    }, 90000);
    return () => clearTimeout(timer);
  }, [txHash, initialHasVoted, initialRealVotes, initialFakeVotes]);

  const submitVote = async (isReal: boolean) => {
    if (hasVoted || txHash) return;
    setError('');
    if (!registryAddress) {
      setError('Truth voting is not configured yet.');
      return;
    }

    setHasVoted(true);
    if (isReal) setRealVotes((v) => v + 1);
    else setFakeVotes((v) => v + 1);

    try {
      const hash = await writeContractAsync({
        address: registryAddress,
        abi: TRUTH_REGISTRY_ABI,
        functionName: 'voteTruth',
        args: [BigInt(confessionId), isReal],
        gas: BigInt(120000),
        ...builderCodeTxOpts(),
      });
      setTxHash(hash);
    } catch (err: unknown) {
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
