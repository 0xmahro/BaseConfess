'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount }    from 'wagmi';
import { useMiniApp }    from '@/hooks/useMiniApp';

export function Header() {
  const { isMiniApp }           = useMiniApp();
  const { address, isConnected } = useAccount();

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-pink-200">
      <div className="max-w-lg mx-auto px-4 h-[60px] flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-300 flex items-center justify-center shadow-pink">
            <span className="text-white text-base select-none">🤍</span>
          </div>
          <span className="font-extrabold text-pink-500 text-lg tracking-tight">
            BaseConfess
          </span>
        </div>

        {/* Wallet */}
        {isMiniApp ? (
          <div className="flex items-center gap-2">
            {isConnected && address ? (
              <div className="flex items-center gap-1.5 bg-pink-50 border border-pink-200 rounded-full px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-xs font-bold text-pink-600">
                  {address.slice(0, 6)}…{address.slice(-4)}
                </span>
              </div>
            ) : (
              <span className="text-xs text-pink-400 font-semibold">Connecting…</span>
            )}
          </div>
        ) : (
          <ConnectButton
            accountStatus="avatar"
            chainStatus="none"
            showBalance={false}
          />
        )}
      </div>
    </header>
  );
}
