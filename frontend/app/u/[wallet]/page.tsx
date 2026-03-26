'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useReadContract } from 'wagmi';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { ConfessionCard } from '@/components/ConfessionCard';
import { PROFILE_CONTRACT_ABI, PROFILE_CONTRACT_ADDRESS } from '@/lib/config';
import type { Confession } from '@/types';

function isWalletAddress(s: string): s is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}

export default function UserProfilePage() {
  const params = useParams<{ wallet?: string }>();
  const rawWallet = (params?.wallet ?? '').toString();
  const wallet = rawWallet.toLowerCase();

  const isValid = isWalletAddress(wallet);
  const isMissingProfileContract =
    PROFILE_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000';

  const { data: profileData } = useReadContract({
    address: PROFILE_CONTRACT_ADDRESS,
    abi: PROFILE_CONTRACT_ABI,
    functionName: 'getProfile',
    args: [(isValid ? wallet : '0x0000000000000000000000000000000000000000') as `0x${string}`],
    query: { enabled: isValid && !isMissingProfileContract },
  });

  const username = useMemo(() => {
    const exists = (profileData?.[0] as boolean | undefined) ?? false;
    const name = (profileData?.[1] as string | undefined) ?? '';
    const trimmed = name.trim();
    return exists && trimmed ? trimmed : null;
  }, [profileData]);

  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchUserConfessions = async () => {
    if (!isValid) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('confessions')
        .select('*')
        .eq('wallet', wallet)
        .order('id', { ascending: false })
        .limit(200);
      if (err) throw err;
      setConfessions((data as Confession[]) ?? []);
    } catch {
      setError('Could not load confessions.');
      setConfessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserConfessions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, isValid]);

  useEffect(() => {
    if (isValid) {
      window.location.replace(`/profile/${wallet}`);
    }
  }, [isValid, wallet]);

  return (
    <div className="min-h-screen bg-pink-50">
      <Header />

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <div className="rounded-3xl border border-pink-200 bg-white p-6 text-center space-y-2">
          <p className="text-4xl">↪</p>
          <p className="text-sm font-extrabold text-ink">Redirecting…</p>
          {!isValid && (
            <p className="text-xs text-red-500 font-semibold">
              Invalid address
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

