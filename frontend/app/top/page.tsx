'use client';

import Link from 'next/link';
import { Header } from '@/components/Header';
import { TopSoulsLeaderboard } from '@/components/TopSoulsLeaderboard';

export default function TopPage() {
  return (
    <div className="min-h-screen bg-pink-50">
      <Header />
      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-extrabold text-pink-500 hover:text-pink-600"
        >
          ← Back
        </Link>
        <TopSoulsLeaderboard />
      </main>
    </div>
  );
}

