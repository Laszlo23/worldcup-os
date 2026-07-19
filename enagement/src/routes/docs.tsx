import { createFileRoute } from "@tanstack/react-router";
import { DocPageShell } from "@/components/matchmind/DocPageShell";
import { DOCS_SECTIONS } from "@/content/docs";

export const Route = createFileRoute("/docs")({
  component: DocsPage,
});

function DocsPage() {
  return (
    <DocPageShell title="Docs" subtitle="How MatchMind actually works">
      <header className="kit-stripe relative overflow-hidden rounded-3xl border border-accent/30 p-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
          Builder notes
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold italic tracking-tight">
          Fan stack playbook
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Architecture, wallets, Agent Pilot, the XP Mine, and the APIs behind the app.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {DOCS_SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="rounded-full border border-border bg-background/60 px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground hover:border-accent/40 hover:text-accent"
            >
              {s.title}
            </a>
          ))}
        </div>
      </header>

      <div className="mt-6 space-y-6">
        {DOCS_SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h3 className="font-display text-lg font-bold italic tracking-tight">{section.title}</h3>
            <div className="mt-2 space-y-2 rounded-2xl border border-border bg-card/60 p-4">
              {section.body.map((p) => (
                <p key={p.slice(0, 40)} className="text-sm leading-relaxed text-muted-foreground">
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </DocPageShell>
  );
}
