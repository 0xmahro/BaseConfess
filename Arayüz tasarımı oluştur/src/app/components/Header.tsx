import { Heart } from "lucide-react";

interface HeaderProps {
  isConnected: boolean;
  walletAddress?: string;
  onConnect: () => void;
}

export function Header({ isConnected, walletAddress, onConnect }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full h-[60px] bg-white border-b border-[#FFD6E7] flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <Heart className="w-6 h-6 text-[#FF4D8D] fill-[#FF4D8D]" />
        <span className="text-[#FF4D8D] font-bold text-lg">BaseConfess</span>
      </div>

      {isConnected && walletAddress ? (
        <div className="flex items-center gap-2 h-9 px-4 bg-[#FFE4F0] rounded-full">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#FF4D8D] to-[#FF85B3]" />
          <span className="text-[#FF4D8D] text-xs font-mono">{walletAddress}</span>
        </div>
      ) : (
        <button
          onClick={onConnect}
          className="h-9 px-6 bg-gradient-to-br from-[#FF4D8D] to-[#FF85B3] text-white rounded-full font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Connect Wallet
        </button>
      )}
    </header>
  );
}
