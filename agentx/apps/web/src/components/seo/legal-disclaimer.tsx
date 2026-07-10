export function LegalDisclaimer({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-center text-[10px] leading-relaxed text-muted-foreground"}>
      Research and analytics platform. Not gambling. Predictions are simulated intelligence outputs for demonstration purposes.
    </p>
  );
}
