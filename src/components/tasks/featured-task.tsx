import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import type { CommunityTask } from "@/lib/mock/tasks";
import { useTasksStore } from "@/lib/store/tasks";

export function FeaturedTask({ task }: { task: CommunityTask }) {
  const { completeTask } = useTasksStore();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 via-card to-card p-6 md:p-8">
      <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3 pointer-events-none" />
      <Badge className="bg-gold/20 text-gold border-gold/40 mb-4">FEATURED</Badge>
      <h2 className="text-2xl md:text-3xl font-display font-bold mb-2">{task.title}</h2>
      <p className="text-muted-foreground max-w-xl mb-6">{task.description}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline" className="text-gold border-gold/40 font-mono">+{task.points} PTS</Badge>
        <span className="text-sm text-muted-foreground">{task.timeEstimate}</span>
        <Button
          className="bg-gold text-gold-foreground hover:bg-gold/90 border-0 gap-1 ml-auto"
          onClick={() => {
            window.open(task.ctaUrl, "_blank", "noopener");
            completeTask(task.id);
          }}
        >
          {task.ctaLabel} <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
