import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/matchmind/AppShell";
import { BallNewsCard, BallNewsHero } from "@/components/matchmind/BallNews";
import { useActiveMatchState } from "@/lib/use-active-match";
import { useLiveEvents } from "@/lib/queries/hooks";
import { buildBallNews, type BallNewsItem } from "@/lib/ball-news";
import { editorialAsNewsItems, listBlogPosts } from "@/lib/blog-posts";

const APP = "https://match.buildingcultureid.space";

export const Route = createFileRoute("/news/")({
  head: () => ({
    meta: [
      { title: "Ball News — Soccer news & terrace pulse | MatchMind AI" },
      {
        name: "description",
        content:
          "Soccer news, terrace pulse, and World Cup colour from MatchMind Ball News — full readable stories plus live match wires.",
      },
      { name: "robots", content: "index,follow" },
      { property: "og:title", content: "Ball News — soccer stories & community pulse" },
      {
        property: "og:description",
        content:
          "Argentina–Spain nights, World Cup fan guides, collectables, and Crew culture — written to be read.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${APP}/news` },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${APP}/news` }],
  }),
  component: NewsIndexPage,
});

function toNewsItem(
  item: ReturnType<typeof editorialAsNewsItems>[number],
): BallNewsItem {
  return {
    ...item,
    kind: item.kind,
  };
}

function NewsIndexPage() {
  const { match } = useActiveMatchState();
  const { data: events = [] } = useLiveEvents(match?.id);
  const editorial = useMemo(() => editorialAsNewsItems().map(toNewsItem), []);
  const wire = useMemo(
    () => (match ? buildBallNews(match, events) : []),
    [match, events],
  );
  const posts = listBlogPosts();
  const hero = editorial[0];
  const restEditorial = editorial.slice(1);

  return (
    <AppShell title="Ball News" subtitle="Soccer news + live desk" backdropVariant="action">
      <section className="px-4 pt-5">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          Soccer news
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold italic tracking-tight">
          Ball News
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Match nights, terrace pulse, collectables, and World Cup colour — tap a story to read the
          full post. Live wires sit underneath when the fixture is on.
        </p>
      </section>

      <section className="mt-5 space-y-3 px-4">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-accent">
          Features · {posts.length} stories
        </p>
        {hero ? <BallNewsHero item={hero} /> : null}
        {restEditorial.map((item) => (
          <BallNewsCard key={item.id} item={item} />
        ))}
      </section>

      {wire.length > 0 ? (
        <section className="mt-8 space-y-3 px-4 pb-6">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-live">
              Live wire
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {match
                ? `${match.home.code} vs ${match.away.code} — TxLINE flashes`
                : "Match flashes"}
            </p>
          </div>
          {wire.slice(0, 6).map((item) => (
            <BallNewsCard key={item.id} item={item} compact />
          ))}
        </section>
      ) : (
        <section className="px-4 pb-6 pt-4">
          <p className="text-center text-xs text-muted-foreground">
            Live wires appear when a fixture is active.
          </p>
        </section>
      )}

      <section className="flex flex-wrap justify-center gap-4 px-4 pb-8 text-xs font-semibold">
        <Link to="/" className="text-accent">
          ← Live Hub
        </Link>
        <Link to="/predict" className="text-muted-foreground hover:text-accent">
          Polls
        </Link>
        <Link to="/moments" className="text-muted-foreground hover:text-accent">
          Drops
        </Link>
      </section>
    </AppShell>
  );
}
