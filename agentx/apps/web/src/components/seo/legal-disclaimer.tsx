import Link from "next/link";
import { DEVNET_DISCLAIMER } from "@/content/legal";

export function LegalDisclaimer({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-center text-[10px] leading-relaxed text-muted-foreground"}>
      Research and analytics platform. Not gambling. Predictions are simulated intelligence outputs for demonstration purposes.{" "}
      <Link href="/legal/terms" className="underline hover:text-foreground">
        Terms
      </Link>
      {" · "}
      <Link href="/legal/privacy" className="underline hover:text-foreground">
        Privacy
      </Link>
      . {DEVNET_DISCLAIMER}
    </p>
  );
}
