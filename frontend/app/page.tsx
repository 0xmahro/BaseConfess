import { Header }        from '@/components/Header';
import { PostConfession } from '@/components/PostConfession';
import { ConfessionFeed } from '@/components/ConfessionFeed';

export default function Home() {
  return (
    <div className="min-h-screen bg-pink-50">
      <Header />

      <main className="max-w-lg mx-auto px-4 py-8 space-y-6">

        {/* Hero */}
        <div className="text-center space-y-3 pt-2">
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

        {/* Post confession */}
        <PostConfession />

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-pink-200" />
          <span className="text-[11px] font-extrabold text-pink-300 uppercase tracking-widest whitespace-nowrap">
            💬 Recent Confessions
          </span>
          <div className="flex-1 h-px bg-pink-200" />
        </div>

        {/* Feed */}
        <ConfessionFeed />

      </main>

      <footer className="text-center py-10 text-xs text-pink-300 font-bold space-y-1">
        <p>Made with 🩷 on <span className="text-pink-500">Base</span></p>
        <p className="text-[10px] text-pink-200">On-chain · Anonymous · Forever</p>
      </footer>
    </div>
  );
}
