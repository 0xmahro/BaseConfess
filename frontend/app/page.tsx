'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { sdk } from '@farcaster/miniapp-sdk';
import { Header } from '@/components/Header';
import { PostConfession } from '@/components/PostConfession';
import { WishBox } from '@/components/WishBox';
import { ConfessionFeed } from '@/components/ConfessionFeed';

type HomeTab = 'confess' | 'wish' | 'love';

export default function Home() {
  const [tab, setTab] = useState<HomeTab>('confess');

  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <div className="min-h-screen bg-pink-50">
      <Header />

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/profile"
            className="inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-2xl text-sm font-extrabold
              border-2 border-pink-300 bg-white text-pink-600 shadow-sm
              hover:bg-pink-50 hover:border-pink-400 hover:shadow-card transition-all duration-200 active:scale-[0.98]"
          >
            <span className="text-base leading-none" aria-hidden>👤</span>
            Create Profile
          </Link>
        </div>

        {/* Screen switcher */}
        <div
          className="flex p-1 rounded-2xl bg-white/90 border border-pink-200 shadow-card gap-1"
          role="tablist"
          aria-label="Choose Confess, Wish Box, or Love Meter"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'confess'}
            onClick={() => setTab('confess')}
            className={`
              flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-sm font-extrabold
              transition-all duration-200 active:scale-[0.98]
              ${tab === 'confess'
                ? 'bg-gradient-to-r from-pink-500 to-pink-400 text-white shadow-pink'
                : 'text-mauve hover:text-pink-500 hover:bg-pink-50/80'
              }
            `}
          >
            <span className="text-base leading-none">🤫</span>
            Confess
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'wish'}
            onClick={() => setTab('wish')}
            className={`
              flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-sm font-extrabold
              transition-all duration-200 active:scale-[0.98]
              ${tab === 'wish'
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-500 text-white shadow-[0_4px_16px_rgba(124,58,237,0.35)]'
                : 'text-mauve hover:text-violet-600 hover:bg-violet-50/60'
              }
            `}
          >
            <span className="text-base leading-none">✨</span>
            Wish Box
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'love'}
            onClick={() => setTab('love')}
            className={`
              flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl text-sm font-extrabold
              transition-all duration-200 active:scale-[0.98]
              ${tab === 'love'
                ? 'bg-gradient-to-r from-fuchsia-500 to-indigo-500 text-white shadow-[0_4px_16px_rgba(99,102,241,0.30)]'
                : 'text-mauve hover:text-fuchsia-600 hover:bg-fuchsia-50/60'
              }
            `}
          >
            <span className="text-base leading-none">💗</span>
            Love Meter
          </button>
        </div>

        {tab === 'confess' && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-3 pt-1">
              <div className="text-5xl animate-float">🤫</div>
              <h1 className="text-2xl font-extrabold text-ink tracking-tight">
                Confess Anonymously
              </h1>
              <p className="text-sm text-mauve font-semibold max-w-xs mx-auto leading-relaxed">
                Your secret lives on Base forever.<br />No names. Just truth.
              </p>
              <div className="inline-flex items-center gap-1.5 bg-white border border-pink-200 rounded-full px-3 py-1.5 text-xs font-bold text-pink-500 shadow-sm">
                <span>⛓</span>
                <span>Powered by Base</span>
              </div>
            </div>

            <PostConfession />

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-pink-200" />
              <span className="text-[11px] font-extrabold text-pink-300 uppercase tracking-widest whitespace-nowrap">
                💬 Recent Confessions
              </span>
              <div className="flex-1 h-px bg-pink-200" />
            </div>

            <ConfessionFeed />
          </div>
        )}

        {tab === 'wish' && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-3 pt-1">
              <div className="text-5xl animate-float">✨</div>
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-violet-700 to-fuchsia-600 bg-clip-text text-transparent tracking-tight">
                Wish Box
              </h1>
              <p className="text-sm text-violet-500/90 font-semibold max-w-xs mx-auto leading-relaxed">
                Send a wish on-chain — only the category is public.<br />Your words stay with you.
              </p>
              <div className="inline-flex items-center gap-1.5 bg-white border border-violet-200 rounded-full px-3 py-1.5 text-xs font-bold text-violet-600 shadow-sm">
                <span>⛓</span>
                <span>On Base · Category only</span>
              </div>
            </div>

            <WishBox />
          </div>
        )}

        {tab === 'love' && (
          <div className="space-y-6 animate-fade-in">
            <div className="text-center space-y-3 pt-1">
              <div className="text-5xl animate-float">💗</div>
              <h1 className="text-2xl font-extrabold bg-gradient-to-r from-fuchsia-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">
                Love Meter
              </h1>
              <p className="text-sm text-indigo-600/80 font-semibold max-w-xs mx-auto leading-relaxed">
                Run an on-chain love test on Base.<br />Random score · Paid with ETH.
              </p>
              <div className="inline-flex items-center gap-1.5 bg-white border border-indigo-200 rounded-full px-3 py-1.5 text-xs font-bold text-indigo-600 shadow-sm">
                <span>⛓</span>
                <span>On Base · Love Meter</span>
              </div>
            </div>

            <Link
              href="/ask"
              className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl text-sm font-extrabold
                border-2 border-indigo-200 bg-white text-indigo-600 shadow-sm
                hover:bg-indigo-50 hover:border-indigo-300 hover:shadow-card transition-all duration-200 active:scale-[0.98]"
            >
              <span className="text-base leading-none" aria-hidden>💘</span>
              Open Love Meter
            </Link>
          </div>
        )}
      </main>

      <footer className="text-center py-10 text-xs text-pink-300 font-bold space-y-1">
        <p>Made with 🩷 on <span className="text-pink-500">Base</span></p>
        <p className="text-[10px] text-pink-200">On-chain · Anonymous · Forever</p>
      </footer>
    </div>
  );
}
