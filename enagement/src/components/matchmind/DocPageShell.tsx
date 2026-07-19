import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/matchmind/AppShell";

export function DocPageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <AppShell title={title} subtitle={subtitle} backdropVariant="pitch" backdropIntensity="subtle">
      <div className="px-4 pt-4">
        <nav className="flex flex-wrap gap-3 text-xs font-semibold">
          <Link to="/news" className="text-accent hover:text-accent/80">
            News
          </Link>
          <Link to="/faq" className="text-accent hover:text-accent/80">
            FAQ
          </Link>
          <Link to="/docs" className="text-accent hover:text-accent/80">
            Docs
          </Link>
          <Link to="/tasks" className="text-accent hover:text-accent/80">
            Tasks
          </Link>
          <Link to="/stake" className="text-accent hover:text-accent/80">
            Mine
          </Link>
          <Link to="/agent" className="text-accent hover:text-accent/80">
            Agent
          </Link>
          <Link to="/" className="text-muted-foreground hover:text-accent">
            Live
          </Link>
        </nav>
      </div>
      <div className="px-4 pb-6 pt-4">{children}</div>
    </AppShell>
  );
}
