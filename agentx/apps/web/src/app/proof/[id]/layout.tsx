import type { Metadata } from "next";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "On-Chain Proof",
    description: `Solana prediction certificate for prediction ${id.slice(0, 8)}…`,
  };
}

export default function ProofLayout({ children }: { children: React.ReactNode }) {
  return children;
}
