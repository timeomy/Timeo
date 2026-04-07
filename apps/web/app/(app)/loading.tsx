import { TimeoLogo } from "@/timeo-logo";

export default function AppLoading() {
  return (
    <div className="flex h-screen items-center justify-center bg-[#060912]">
      <div className="flex flex-col items-center gap-5">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(139,92,246,0.2) 100%)",
            border: "1px solid rgba(99,102,241,0.3)",
            boxShadow: "0 0 30px rgba(99,102,241,0.15)",
          }}
        >
          <TimeoLogo size="lg" />
        </div>
        {/* Animated progress bar */}
        <div className="relative h-1 w-32 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="absolute inset-y-0 w-1/2 animate-ping rounded-full opacity-0"
            style={{ background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }}
          />
          <div
            className="h-full w-full animate-pulse rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, #6366f1, transparent)" }}
          />
        </div>
        <p className="text-xs text-white/30 tracking-widest uppercase">Loading</p>
      </div>
    </div>
  );
}
