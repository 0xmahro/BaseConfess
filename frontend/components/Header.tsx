'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-pink-200">
      <div className="max-w-lg mx-auto px-4 h-[60px] flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            suppressHydrationWarning
            className="flex items-center gap-2"
          >
            <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-300 flex items-center justify-center shadow-pink">
              <span className="text-white text-base select-none">🤍</span>
            </div>
            <span className="font-extrabold text-pink-500 text-lg tracking-tight">
              BaseConfess
            </span>
          </Link>

          <Link
            href="/profile"
            suppressHydrationWarning
            className="hidden sm:inline-flex items-center justify-center h-9 px-3 rounded-2xl
              border border-pink-200 bg-white text-xs font-extrabold text-pink-500
              hover:bg-pink-50 transition-colors"
          >
            Profile
          </Link>
        </div>

        {/* Wallet — auto-connects in mini app, manual connect on web */}
        <ConnectButton
          accountStatus="avatar"
          chainStatus="none"
          showBalance={false}
        />
      </div>
    </header>
  );
}
