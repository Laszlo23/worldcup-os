import type { Metadata } from "next";
import { apiFetch } from "@/lib/api";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const data = await apiFetch<{ signal: { headline: string; confidence: number } }>(`/api/signals/${id}`);
    return {
      title: data.signal.headline,
      description: `AI signal · ${data.signal.confidence}% confidence · TxLINE AI Trader`,
    };
  } catch {
    return { title: "Signal Detail" };
  }
}

export default function SignalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
