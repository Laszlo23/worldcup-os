"use client";

import { getSolanaNetwork } from "@/lib/wallet/config";

export function DevnetBanner() {
  if (getSolanaNetwork() === "mainnet") return null;

  return (
    <div className="border-b border-amber-500/25 bg-gradient-to-r from-amber-500/[0.12] via-background to-gold/[0.06] px-4 py-2 text-center">
      <p className="font-mono text-[11px] tracking-wide text-amber-100/85 sm:text-xs">
        <span className="mr-2 inline-flex items-center rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
          Devnet
        </span>
        Test USDC only · No real-world value
      </p>
    </div>
  );
}
