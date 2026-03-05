import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

interface PostConfessionProps {
  isConnected: boolean;
  onPost: (text: string) => Promise<void>;
}

export function PostConfession({ isConnected, onPost }: PostConfessionProps) {
  const [text, setText] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const maxLength = 500;
  const remaining = maxLength - text.length;

  const handleSubmit = async () => {
    if (!text.trim() || !isConnected) return;
    
    setIsPosting(true);
    try {
      await onPost(text);
      setText("");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Failed to post confession:", error);
    } finally {
      setIsPosting(false);
    }
  };

  // Simple hash preview (mock)
  const hashPreview = text ? `0x${Math.random().toString(16).slice(2, 10)}...` : "0x...";

  return (
    <div className="w-full max-w-[390px] mx-auto px-4 mb-6">
      <div className="bg-white rounded-[20px] border border-[#FFD6E7] p-5 shadow-[0_4px_20px_rgba(255,77,141,0.08)]">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-[#FF4D8D] animate-pulse" />
          <span className="text-[#FF4D8D] text-sm font-semibold">New Confession</span>
        </div>

        {/* Textarea */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, maxLength))}
          placeholder="What's your confession? It lives on Base forever... 🤫"
          className="w-full h-24 p-3 bg-[#FFF8FB] border border-[#FFD6E7] rounded-[14px] text-[#1A1A2E] text-sm resize-none focus:outline-none focus:border-[#FF4D8D] transition-colors placeholder:text-[#9B8B95]"
          disabled={!isConnected}
        />

        {/* Character count */}
        <div className="text-right text-xs text-[#FF85B3] mt-1 mb-3">
          {remaining} left
        </div>

        {/* Hash preview */}
        {text && (
          <div className="flex items-center gap-2 mb-3 text-[11px] text-[#9B8B95] font-mono">
            <span>#</span>
            <span>{hashPreview}</span>
            <span className="text-[#9B8B95]">· keccak256 · stored on-chain</span>
          </div>
        )}

        {/* Fee notice */}
        <div className="flex items-center gap-2 mb-4 text-xs text-[#9B8B95]">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 16v-4m0-4h.01" />
          </svg>
          <span>Posting fee: <span className="text-[#3B82F6]">0.000025 ETH</span> on Base</span>
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!isConnected || !text.trim() || isPosting}
          className="w-full h-12 bg-gradient-to-br from-[#FF4D8D] to-[#FF85B3] text-white font-bold rounded-[14px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:from-gray-400 disabled:to-gray-400"
        >
          {isPosting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Posting...</span>
            </>
          ) : !isConnected ? (
            <span>Connect wallet to confess</span>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Confess Anonymously 🤫</span>
            </>
          )}
        </button>

        {/* Success banner */}
        {showSuccess && (
          <div className="mt-4 p-3 bg-[#DCFCE7] border border-[#86EFAC] rounded-lg flex items-center gap-2 text-sm text-[#166534]">
            <span>✓</span>
            <span>Confession posted on-chain. Your secret is eternal.</span>
          </div>
        )}
      </div>
    </div>
  );
}
