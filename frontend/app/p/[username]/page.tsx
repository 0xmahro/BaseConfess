'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { keccak256, toBytes, isAddress } from 'viem';
import { useReadContract } from 'wagmi';
import { Header } from '@/components/Header';
import { PROFILE_CONTRACT_ABI, PROFILE_CONTRACT_ADDRESS } from '@/lib/config';
import { ProfileView } from '@/components/ProfileView';

function normalizeUsername(raw: string) {
  return raw.trim().replace(/^@/, '').toLowerCase();
}

export default function ProfileByUsernamePage() {
  const params = useParams<{ username?: string }>();
  const u = normalizeUsername((params?.username ?? '').toString());

  const key = useMemo(() => {
    if (!u) return null;
    return keccak256(toBytes(u));
  }, [u]);

  const isMissingContract =
    PROFILE_CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000';

  const { data: owner } = useReadContract({
    address: PROFILE_CONTRACT_ADDRESS,
    abi: PROFILE_CONTRACT_ABI,
    functionName: 'usernameOwner',
    args: key ? [key] : undefined,
    query: { enabled: Boolean(key) && !isMissingContract },
  });

  const resolved = (owner as string | undefined) ?? '';
  const ok = isAddress(resolved) && resolved !== '0x0000000000000000000000000000000000000000';

  return (
    <div className="min-h-screen bg-pink-50">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {!u && (
          <div className="rounded-3xl border border-pink-200 bg-white p-6 text-center text-sm text-mauve font-semibold">
            Invalid username
          </div>
        )}

        {u && !ok && (
          <div className="rounded-3xl border border-pink-200 bg-white p-6 text-center space-y-2">
            <p className="text-2xl font-extrabold text-ink">@{u}</p>
            <p className="text-sm text-mauve font-semibold">Profile not found</p>
          </div>
        )}

        {ok && <ProfileView targetAddress={resolved} />}
      </main>
    </div>
  );
}

