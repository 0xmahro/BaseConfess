export function Hero() {
  return (
    <div className="flex flex-col items-center text-center pt-8 pb-6 px-4">
      <div className="text-5xl mb-4">🤫</div>
      <h1 className="text-[#1A1A2E] font-bold text-[28px] mb-2">
        Confess Anonymously
      </h1>
      <p className="text-[#9B8B95] text-sm mb-4 max-w-[320px]">
        Your secret lives on Base forever. No names. Just truth.
      </p>
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFE4F0] rounded-full">
        <span className="text-xs text-[#FF4D8D]">⛓ Powered by Base</span>
      </div>
    </div>
  );
}
