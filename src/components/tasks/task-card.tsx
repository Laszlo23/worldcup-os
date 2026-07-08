import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, ExternalLink } from "lucide-react";
import type { CommunityTask } from "@/lib/mock/tasks";
import { useTasksStore } from "@/lib/store/tasks";
import { Link } from "@tanstack/react-router";

export function TaskCard({ task }: { task: CommunityTask }) {
  const { isCompleted, completeTask } = useTasksStore();
  const done = isCompleted(task.id);

  function handleCta() {
    if (task.ctaUrl.startsWith("http")) {
      window.open(task.ctaUrl, "_blank", "noopener");
    }
    completeTask(task.id);
  }

  const isInternal = task.ctaUrl.startsWith("/");

  return (
    <div className="glass rounded-xl p-5 flex flex-col h-full border border-border/50 hover:border-gold/30 transition-colors">
      <div className="flex items-center gap-2 mb-3">
        <Badge className="bg-success/20 text-success border-success/30 text-[10px] uppercase">{task.category}</Badge>
        <Badge variant="outline" className="text-gold border-gold/40 font-mono text-xs">+{task.points} PTS</Badge>
        <span className="text-[10px] text-muted-foreground ml-auto">{task.timeEstimate}</span>
      </div>
      <h3 className="font-display font-semibold text-lg mb-2">{task.title}</h3>
      <p className="text-sm text-muted-foreground flex-1 mb-4">{task.description}</p>
      {isInternal ? (
        <Button asChild size="sm" className={done ? "bg-muted" : "bg-gold/90 text-gold-foreground hover:bg-gold border-0"} onClick={() => completeTask(task.id)}>
          <Link to={task.ctaUrl}>
            {done ? <><Check className="h-3.5 w-3.5" /> Completed</> : <>{task.ctaLabel} <ExternalLink className="h-3 w-3" /></>}
          </Link>
        </Button>
      ) : (
        <Button
          size="sm"
          className={done ? "bg-muted" : "bg-gold/90 text-gold-foreground hover:bg-gold border-0 gap-1"}
          onClick={handleCta}
        >
          {done ? <><Check className="h-3.5 w-3.5" /> Completed</> : <>{task.ctaLabel} <ExternalLink className="h-3 w-3" /></>}
        </Button>
      )}
    </div>
  );
}
