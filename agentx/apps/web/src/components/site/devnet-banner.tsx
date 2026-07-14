"use client";

import { getSolanaNetwork } from "@/lib/wallet/config";

export function DevnetBanner() {
  if (getSolanaNetwork() === "mainnet") return null;

  return (
    <div className="border-b border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-emerald-500/10 px-4 py-2 text-center">
      <p className="text-[11px] sm:text-xs font-mono tracking-wide text-amber-200/90">
        <span className="inline-flex items-center rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 mr-2 text-[10px] font-bold uppercase text-amber-300">
          Devnet Demo
        </span>
        Solana Devnet · Test USDC only · No real-world monetary value
      </p>
    </div>
  );
}
