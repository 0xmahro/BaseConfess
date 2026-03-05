import { ConfessionCard, type Confession } from "./ConfessionCard";
import { RefreshCw } from "lucide-react";

interface ConfessionFeedProps {
  confessions: Confession[];
  isConnected: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onTip: (id: string) => void;
}

export function ConfessionFeed({
  confessions,
  isConnected,
  isLoading,
  onRefresh,
  onLike,
  onDislike,
  onTip,
}: ConfessionFeedProps) {
  return (
    <div className="w-full max-w-[390px] mx-auto px-4">
      {/* Section divider */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-[#FFD6E7]" />
        <span className="text-[#FF85B3] text-[11px] uppercase tracking-wider">
          💬 Recent Confessions
        </span>
        <div className="flex-1 h-px bg-[#FFD6E7]" />
      </div>

      {/* Feed header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[#9B8B95] text-xs">
          {confessions.length} confession{confessions.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 text-[#FF85B3] text-xs hover:text-[#FF4D8D] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[#FFE4F0] rounded-[20px] h-32 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && confessions.length === 0 && (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🤫</div>
          <p className="text-[#9B8B95] text-sm mb-2">No confessions yet.</p>
          <p className="text-[#FF85B3] text-xs">Be the first to confess.</p>
        </div>
      )}

      {/* Confession list */}
      {!isLoading && confessions.length > 0 && (
        <div className="space-y-4 pb-6">
          {confessions.map((confession) => (
            <ConfessionCard
              key={confession.id}
              confession={confession}
              isConnected={isConnected}
              onLike={onLike}
              onDislike={onDislike}
              onTip={onTip}
            />
          ))}
        </div>
      )}
    </div>
  );
}
