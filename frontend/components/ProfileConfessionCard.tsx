'use client';

import type { Confession } from '@/types';

function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function ProfileConfessionCard({
  confession,
}: {
  confession: Confession;
}) {
  const CHAR_LIMIT = 220;
  const text = confession.text ?? '';
  const display = text.length > CHAR_LIMIT ? `${text.slice(0, CHAR_LIMIT).trimEnd()}…` : text;

  return (
    <article className="bg-white rounded-3xl border border-pink-200 shadow-card p-5 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-pink-400 bg-pink-50 border border-pink-200 px-2 py-0.5 rounded-full">
          ⛓ on-chain
        </span>
        <span className="text-xs text-pink-300 font-semibold">
          {timeAgo(confession.timestamp)}
        </span>
      </div>

      <p className="text-ink text-sm leading-relaxed font-medium italic break-words">
        {confession.text == null ? (
          <span className="text-pink-300 not-italic">
            Text pending sync — hash: <span className="font-mono">{confession.hash.slice(0, 14)}…</span>
          </span>
        ) : (
          display
        )}
      </p>

      <div className="flex items-center gap-2 text-xs font-bold text-mauve">
        <span className="px-2.5 h-8 rounded-full border border-pink-200 bg-white inline-flex items-center">
          💚 {confession.likes}
        </span>
        <span className="px-2.5 h-8 rounded-full border border-pink-200 bg-white inline-flex items-center">
          💔 {confession.dislikes}
        </span>
        {confession.tips_received > 0 && (
          <span className="px-2.5 h-8 rounded-full border border-amber-200 bg-amber-50 text-amber-600 inline-flex items-center ml-auto">
            💸 {confession.tips_received}
          </span>
        )}
      </div>
    </article>
  );
}

