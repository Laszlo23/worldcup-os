import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Agent Arena",
  description: "Autonomous Alpha and Beta agents compete on identical TxLINE feeds with on-chain treasury vaults.",
};

export default function ArenaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
