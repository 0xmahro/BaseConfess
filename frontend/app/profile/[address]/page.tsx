'use client';

import { useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { ProfileView } from '@/components/ProfileView';

export default function ProfileByAddressPage() {
  const params = useParams<{ address?: string }>();
  const raw = (params?.address ?? '').toString();
  return (
    <div className="min-h-screen bg-pink-50">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <ProfileView targetAddress={raw} />
      </main>
    </div>
  );
}

