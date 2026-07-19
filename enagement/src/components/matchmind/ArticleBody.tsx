import type { BlogBlock } from "@/lib/blog-posts";

/** Readable long-form article body for Ball News posts. */
export function ArticleBody({ blocks }: { blocks: BlogBlock[] }) {
  return (
    <div className="mm-article space-y-5 text-[16px] leading-[1.75] text-foreground/93">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "p":
            return (
              <p
                key={i}
                className={`text-pretty ${i === 0 ? "text-[17px] leading-[1.8] text-foreground" : ""}`}
              >
                {block.text}
              </p>
            );
          case "h2":
            return (
              <h2
                key={i}
                className="scroll-mt-24 border-t border-border/50 pt-5 font-display text-[1.35rem] font-bold italic tracking-tight text-foreground"
              >
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3
                key={i}
                className="pt-1 text-[1.05rem] font-semibold tracking-tight text-foreground"
              >
                {block.text}
              </h3>
            );
          case "ul":
            return (
              <ul key={i} className="my-1 list-disc space-y-2.5 pl-5 marker:text-primary">
                {block.items.map((item, j) => (
                  <li key={j} className="pl-1 text-pretty text-foreground/90">
                    {item}
                  </li>
                ))}
              </ul>
            );
          case "quote":
            return (
              <blockquote
                key={i}
                className="my-2 rounded-2xl border-l-4 border-primary/60 bg-primary/8 px-4 py-3.5 text-[15px] italic leading-relaxed text-foreground/95"
              >
                <p className="text-pretty">“{block.text}”</p>
                {block.cite ? (
                  <footer className="mt-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] not-italic text-primary">
                    — {block.cite}
                  </footer>
                ) : null}
              </blockquote>
            );
          default: {
            const _exhaustive: never = block;
            return _exhaustive;
          }
        }
      })}
    </div>
  );
}
