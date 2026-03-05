import { useState } from "react";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { PostConfession } from "./components/PostConfession";
import { ConfessionFeed } from "./components/ConfessionFeed";
import { TipModal } from "./components/TipModal";
import type { Confession } from "./components/ConfessionCard";

// Mock confessions data
const initialConfessions: Confession[] = [
  {
    id: "1",
    wallet: "0x34a2...5af2",
    text: "I secretly bought more ETH when everyone told me to sell. Best decision ever! 💎🙌",
    timestamp: "3h ago",
    likes: 42,
    dislikes: 3,
    tips: 5,
  },
  {
    id: "2",
    wallet: "0x9b7c...12ed",
    text: "Sometimes I pretend I understand all the crypto jargon in meetings, but I'm just nodding along hoping nobody asks me to explain.",
    timestamp: "5h ago",
    likes: 28,
    dislikes: 8,
    tips: 0,
  },
  {
    id: "3",
    wallet: "0x7f3a...8c4b",
    text: "I've been DCA-ing into crypto for 2 years and never told my partner. They think I'm just saving money. One day I'll surprise them with early retirement! 🚀",
    timestamp: "8h ago",
    likes: 67,
    dislikes: 12,
    tips: 12,
  },
  {
    id: "4",
    wallet: "0x2e1d...4a9c",
    text: "I accidentally sent my friend the wrong amount of ETH and they never noticed. It's been 6 months and I'm too embarrassed to say anything now.",
    timestamp: "12h ago",
    likes: 19,
    dislikes: 15,
    tips: 2,
  },
];

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress] = useState("0x34a2...5af2");
  const [confessions, setConfessions] = useState<Confession[]>(initialConfessions);
  const [isLoading, setIsLoading] = useState(false);
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [selectedConfessionForTip, setSelectedConfessionForTip] = useState<string | null>(null);

  const handleConnect = () => {
    // Simulate wallet connection
    setIsConnected(true);
  };

  const handlePostConfession = async (text: string) => {
    // Simulate posting to blockchain
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const newConfession: Confession = {
      id: Date.now().toString(),
      wallet: walletAddress,
      text,
      timestamp: "just now",
      likes: 0,
      dislikes: 0,
      tips: 0,
    };
    
    setConfessions([newConfession, ...confessions]);
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 800);
  };

  const handleLike = (id: string) => {
    setConfessions(confessions.map((c) => {
      if (c.id === id) {
        if (c.userLiked) {
          return { ...c, likes: c.likes - 1, userLiked: false };
        }
        return {
          ...c,
          likes: c.likes + 1,
          dislikes: c.userDisliked ? c.dislikes - 1 : c.dislikes,
          userLiked: true,
          userDisliked: false,
        };
      }
      return c;
    }));
  };

  const handleDislike = (id: string) => {
    setConfessions(confessions.map((c) => {
      if (c.id === id) {
        if (c.userDisliked) {
          return { ...c, dislikes: c.dislikes - 1, userDisliked: false };
        }
        return {
          ...c,
          dislikes: c.dislikes + 1,
          likes: c.userLiked ? c.likes - 1 : c.likes,
          userDisliked: true,
          userLiked: false,
        };
      }
      return c;
    }));
  };

  const handleTipClick = (id: string) => {
    setSelectedConfessionForTip(id);
    setTipModalOpen(true);
  };

  const handleSendTip = async (amount: string) => {
    // Simulate sending tip
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    if (selectedConfessionForTip) {
      setConfessions(confessions.map((c) => 
        c.id === selectedConfessionForTip 
          ? { ...c, tips: c.tips + 1 }
          : c
      ));
    }
  };

  const selectedConfession = confessions.find((c) => c.id === selectedConfessionForTip);

  return (
    <div className="min-h-screen bg-[#FFF0F5] font-['Plus_Jakarta_Sans',sans-serif]">
      <Header 
        isConnected={isConnected} 
        walletAddress={isConnected ? walletAddress : undefined}
        onConnect={handleConnect}
      />
      
      <main className="pb-8">
        <Hero />
        
        <PostConfession 
          isConnected={isConnected}
          onPost={handlePostConfession}
        />
        
        <ConfessionFeed
          confessions={confessions}
          isConnected={isConnected}
          isLoading={isLoading}
          onRefresh={handleRefresh}
          onLike={handleLike}
          onDislike={handleDislike}
          onTip={handleTipClick}
        />
      </main>

      <TipModal
        isOpen={tipModalOpen}
        onClose={() => {
          setTipModalOpen(false);
          setSelectedConfessionForTip(null);
        }}
        onSendTip={handleSendTip}
        recipientAddress={selectedConfession?.wallet || ""}
      />
    </div>
  );
}

export default App;
