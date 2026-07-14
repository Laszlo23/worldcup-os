import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import type { CommunityTask } from "@/lib/mock/tasks";
import { useTasksStore } from "@/lib/store/tasks";
import { SoccerImage } from "@/components/soccer-image";
import { SOCCER_REWARDS } from "@/lib/soccer-assets";

export function FeaturedTask({ task }: { task: CommunityTask }) {
  const { completeTask } = useTasksStore();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 via-card to-card">
      <SoccerImage
        src={SOCCER_REWARDS.vip.src}
        alt={SOCCER_REWARDS.vip.alt}
        overlay="left"
        className="absolute inset-0 opacity-35 pointer-events-none"
        imgClassName="object-[center_30%]"
      />
      <div className="relative p-6 md:p-8">
        <Badge className="bg-gold/20 text-gold border-gold/40 mb-4">FEATURED</Badge>
        <h2 className="text-2xl md:text-3xl font-display font-bold mb-2 max-w-xl">{task.title}</h2>
        <p className="text-muted-foreground max-w-xl mb-6">{task.description}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="text-gold border-gold/40 font-mono">+{task.points} PTS</Badge>
          <span className="text-sm text-muted-foreground">{task.timeEstimate}</span>
          <Button
            className="bg-gold text-gold-foreground hover:bg-gold/90 border-0 gap-1 ml-auto"
            onClick={() => {
              window.open(task.ctaUrl, "_blank", "noopener");
              void completeTask(task.id);
            }}
          >
            {task.ctaLabel} <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
