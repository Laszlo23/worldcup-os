import { useEffect, useMemo, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X } from "lucide-react";
import { KitSwitcher } from "./KitSwitcher";
import { DESK_ZONES, filterDeskLinks, type DeskLink } from "@/lib/nav-desk";

function accentClass(accent?: DeskLink["accent"], active?: boolean): string {
  if (active) return "border-primary/55 bg-primary/18 text-primary";
  switch (accent) {
    case "live":
      return "border-live/30 bg-live/10 text-live hover:border-live/50";
    case "accent":
      return "border-accent/30 bg-accent/10 text-accent hover:border-accent/50";
    case "primary":
      return "border-primary/30 bg-primary/10 text-primary hover:border-primary/50";
    default:
      return "border-border bg-card/70 text-foreground hover:border-primary/35";
  }
}

export function MatchDesk({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const filtered = useMemo(() => filterDeskLinks(query), [query]);
  const searching = query.trim().length > 0;

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="Close match desk"
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Match Desk navigation"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-w-[480px] outline-none"
          >
            <div className="max-h-[min(88vh,720px)] overflow-hidden rounded-t-[1.75rem] border border-white/10 border-b-0 bg-[linear-gradient(180deg,oklch(0.14_0.04_155),oklch(0.1_0.03_210))] shadow-[0_-24px_80px_-20px_oklch(0_0_0_/_0.75)]">
              <div className="flex justify-center pt-3">
                <span className="h-1 w-10 rounded-full bg-white/20" />
              </div>

              <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-2">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-primary">
                    Match Desk
                  </p>
                  <h2 className="mt-0.5 font-display text-xl font-bold italic tracking-tight">
                    Go anywhere
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Formation map of every MatchMind surface
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/5 text-muted-foreground"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="px-5 pb-3">
                <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-3 py-2.5">
                  <Search className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Jump to polls, mine, news…"
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
                    autoFocus
                  />
                </label>
              </div>

              {/* Mini pitch lanes */}
              <div className="relative mx-5 mb-3 h-2 overflow-hidden rounded-full bg-primary/10">
                <div className="absolute inset-y-0 left-0 w-1/3 bg-live/40" />
                <div className="absolute inset-y-0 left-1/3 w-1/3 bg-accent/35" />
                <div className="absolute inset-y-0 right-0 w-1/3 bg-primary/40" />
              </div>

              <div className="max-h-[min(58vh,480px)] overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] no-scrollbar">
                {searching ? (
                  <div className="grid grid-cols-2 gap-2 pb-2">
                    {filtered.map((link) => (
                      <DeskTile
                        key={link.to}
                        link={link}
                        active={link.to === "/" ? pathname === "/" : pathname.startsWith(link.to)}
                        onNavigate={() => onOpenChange(false)}
                      />
                    ))}
                    {filtered.length === 0 ? (
                      <p className="col-span-2 py-8 text-center text-sm text-muted-foreground">
                        No match — try “agent” or “news”
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-5 pb-2">
                    {DESK_ZONES.map((zone, zi) => (
                      <motion.section
                        key={zone.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: zi * 0.04 }}
                      >
                        <div className="mb-2 flex items-baseline justify-between gap-2">
                          <div>
                            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                              {zone.title}
                            </p>
                            <p className="text-xs text-foreground/80">{zone.role}</p>
                          </div>
                          <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/70">
                            {zone.links.length}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {zone.links.map((link) => (
                            <DeskTile
                              key={link.to}
                              link={link}
                              active={
                                link.to === "/" ? pathname === "/" : pathname.startsWith(link.to)
                              }
                              onNavigate={() => onOpenChange(false)}
                            />
                          ))}
                        </div>
                      </motion.section>
                    ))}

                    <section className="pb-1">
                      <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                        Look
                      </p>
                      <KitSwitcher />
                    </section>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function DeskTile({
  link,
  active,
  onNavigate,
}: {
  link: DeskLink;
  active: boolean;
  onNavigate: () => void;
}) {
  const Icon = link.icon;
  return (
    <Link
      to={link.to}
      onClick={onNavigate}
      className={`flex min-h-[72px] flex-col justify-between rounded-2xl border p-3 transition active:scale-[0.98] ${accentClass(link.accent, active)}`}
    >
      <Icon className="size-4 opacity-90" strokeWidth={active ? 2.4 : 1.9} />
      <div>
        <p className="text-sm font-semibold leading-tight text-foreground">{link.label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{link.hint}</p>
      </div>
    </Link>
  );
}
