import { useState } from "react";
import { X, Loader2, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent } from "./ui/dialog";

interface TipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendTip: (amount: string) => Promise<void>;
  recipientAddress: string;
}

export function TipModal({ isOpen, onClose, onSendTip, recipientAddress }: TipModalProps) {
  const [selectedAmount, setSelectedAmount] = useState("0.001");
  const [customAmount, setCustomAmount] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [success, setSuccess] = useState(false);

  const presetAmounts = ["0.001", "0.005", "0.01"];

  const handleSendTip = async () => {
    const amount = customAmount || selectedAmount;
    if (!amount || parseFloat(amount) <= 0) return;

    setIsSending(true);
    try {
      await onSendTip(amount);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        setCustomAmount("");
        setSelectedAmount("0.001");
      }, 2000);
    } catch (error) {
      console.error("Failed to send tip:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleClose = () => {
    if (!isSending && !success) {
      onClose();
      setCustomAmount("");
      setSelectedAmount("0.001");
      setSuccess(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[360px] p-0 bg-white rounded-[24px] border-0 overflow-hidden">
        {/* Pink gradient top bar */}
        <div className="h-1 bg-gradient-to-r from-[#FF4D8D] to-[#FF85B3]" />

        <div className="p-6">
          {success ? (
            // Success state
            <div className="text-center py-8">
              <CheckCircle2 className="w-16 h-16 text-[#22C55E] mx-auto mb-4" />
              <p className="text-[#1A1A2E] font-semibold text-lg">Tip sent! 💸</p>
              <p className="text-[#9B8B95] text-sm mt-2">
                Your tip is on its way on-chain
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[#1A1A2E] font-bold text-lg">💸 Send a Tip</h2>
                <button
                  onClick={handleClose}
                  disabled={isSending}
                  className="text-[#9B8B95] hover:text-[#1A1A2E] transition-colors disabled:opacity-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Subtitle */}
              <p className="text-[#9B8B95] text-sm mb-6">
                ETH goes directly to the confession owner on-chain.
              </p>

              {/* Recipient */}
              <div className="mb-4 p-3 bg-[#FFF8FB] rounded-lg">
                <p className="text-[#9B8B95] text-xs mb-1">To:</p>
                <p className="text-[#1A1A2E] text-xs font-mono">{recipientAddress}</p>
              </div>

              {/* Quick amount buttons */}
              <div className="mb-4">
                <p className="text-[#1A1A2E] text-sm font-semibold mb-2">Quick Amount</p>
                <div className="flex gap-2">
                  {presetAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => {
                        setSelectedAmount(amount);
                        setCustomAmount("");
                      }}
                      disabled={isSending}
                      className={`flex-1 py-2.5 rounded-full text-sm font-medium transition-all ${
                        selectedAmount === amount && !customAmount
                          ? "bg-gradient-to-br from-[#FF4D8D] to-[#FF85B3] text-white"
                          : "bg-white border border-[#FFD6E7] text-[#FF4D8D] hover:border-[#FF4D8D]"
                      } disabled:opacity-50`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom amount */}
              <div className="mb-6">
                <label className="text-[#1A1A2E] text-sm font-semibold mb-2 block">
                  Custom amount (ETH)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="0.000"
                    disabled={isSending}
                    className="w-full px-4 py-2.5 border border-[#FFD6E7] rounded-lg text-[#1A1A2E] text-sm focus:outline-none focus:border-[#FF4D8D] transition-colors disabled:opacity-50"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9B8B95] text-sm">
                    ETH
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  disabled={isSending}
                  className="flex-1 py-3 border border-[#FFD6E7] text-[#9B8B95] rounded-lg font-semibold hover:bg-[#FFF8FB] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendTip}
                  disabled={isSending || (!customAmount && !selectedAmount)}
                  className="flex-1 py-3 bg-gradient-to-br from-[#FF4D8D] to-[#FF85B3] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Tip {customAmount || selectedAmount} ETH</span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
