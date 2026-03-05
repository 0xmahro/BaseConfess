import { useState } from "react";
import { ThumbsUp, ThumbsDown, DollarSign } from "lucide-react";

export interface Confession {
  id: string;
  wallet: string;
  text: string;
  timestamp: string;
  likes: number;
  dislikes: number;
  tips: number;
  userLiked?: boolean;
  userDisliked?: boolean;
}

interface ConfessionCardProps {
  confession: Confession;
  isConnected: boolean;
  onLike: (id: string) => void;
  onDislike: (id: string) => void;
  onTip: (id: string) => void;
}

export function ConfessionCard({
  confession,
  isConnected,
  onLike,
  onDislike,
  onTip,
}: ConfessionCardProps) {
  const [showFullText, setShowFullText] = useState(false);
  const shouldTruncate = confession.text.length > 200;
  const displayText = shouldTruncate && !showFullText 
    ? confession.text.slice(0, 200) + "..." 
    : confession.text;

  return (
    <div className="bg-white rounded-[20px] border border-[#FFD6E7] p-4 shadow-[0_2px_12px_rgba(255,77,141,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FF4D8D] to-[#FF85B3] flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-[#9B8B95] text-[11px] font-mono">{confession.wallet}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-[#FFE4F0] text-[#FF4D8D] text-[10px] rounded-full">
            on-chain
          </span>
          <span className="text-[#9B8B95] text-xs">{confession.timestamp}</span>
        </div>
      </div>

      {/* Confession text */}
      <div className="mb-4">
        <p className="text-[#1A1A2E] text-sm leading-relaxed italic">
          {displayText}
        </p>
        {shouldTruncate && (
          <button
            onClick={() => setShowFullText(!showFullText)}
            className="text-[#FF4D8D] text-xs mt-1 hover:underline"
          >
            {showFullText ? "show less" : "read more"}
          </button>
        )}
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Like button */}
          <button
            onClick={() => onLike(confession.id)}
            disabled={!isConnected}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              confession.userLiked
                ? "bg-[#DCFCE7] text-[#22C55E] border border-[#22C55E]"
                : "bg-white text-[#9B8B95] border border-[#FFD6E7] hover:border-[#22C55E]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <ThumbsUp className="w-3.5 h-3.5" />
            <span>{confession.likes}</span>
          </button>

          {/* Dislike button */}
          <button
            onClick={() => onDislike(confession.id)}
            disabled={!isConnected}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              confession.userDisliked
                ? "bg-[#FEE2E2] text-[#EF4444] border border-[#EF4444]"
                : "bg-white text-[#9B8B95] border border-[#FFD6E7] hover:border-[#EF4444]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <ThumbsDown className="w-3.5 h-3.5" />
            <span>{confession.dislikes}</span>
          </button>

          {/* Tips received */}
          {confession.tips > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-[#FEF3C7] text-[#F59E0B] text-xs rounded-full">
              <span>💸</span>
              <span>{confession.tips}</span>
            </div>
          )}
        </div>

        {/* Tip button */}
        <button
          onClick={() => onTip(confession.id)}
          disabled={!isConnected}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white text-[#F59E0B] border border-[#F59E0B] hover:bg-[#F59E0B] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Tip</span>
        </button>
      </div>
    </div>
  );
}
