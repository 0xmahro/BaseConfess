'use client';

import { useAccount } from 'wagmi';
import { Header } from '@/components/Header';
import { ProfileView } from '@/components/ProfileView';

export default function ProfilePage() {
  const { address, isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-pink-50">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {isConnected && address ? (
          <ProfileView targetAddress={address} />
        ) : (
        <div className="bg-white rounded-3xl border border-pink-200 shadow-card p-6 text-center space-y-2">
          <p className="text-4xl">🪪</p>
          <p className="text-sm font-extrabold text-ink">Connect your wallet to view your profile</p>
          <p className="text-xs text-mauve font-semibold">
            Tip: tap a username in the feed to open their profile.
          </p>
        </div>
        )}
      </main>
    </div>
  );
}

