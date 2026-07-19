import { createFileRoute } from "@tanstack/react-router";
import { DocPageShell } from "@/components/matchmind/DocPageShell";
import { FAQ_SECTIONS } from "@/content/faq";

export const Route = createFileRoute("/faq")({
  component: FaqPage,
});

function FaqPage() {
  return (
    <DocPageShell title="FAQ" subtitle="Straight answers from the terrace">
      <header className="kit-stripe relative overflow-hidden rounded-3xl border border-primary/30 p-5">
        <div className="pointer-events-none absolute inset-0 pitch-lines opacity-25" />
        <p className="relative font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          MatchMind help
        </p>
        <h2 className="relative mt-1 font-display text-2xl font-bold italic tracking-tight">
          Ask the booth
        </h2>
        <p className="relative mt-2 text-sm text-muted-foreground">
          Wallets, polls, Agent Pilot, XP mining, and community rewards — quick hits.
        </p>
      </header>

      <div className="mt-6 space-y-8">
        {FAQ_SECTIONS.map((section) => (
          <section key={section.title}>
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
              {section.title}
            </h3>
            <ul className="mt-3 space-y-2">
              {section.items.map((item) => (
                <li key={item.q} className="glass rounded-2xl p-4">
                  <p className="text-sm font-semibold">{item.q}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </DocPageShell>
  );
}
