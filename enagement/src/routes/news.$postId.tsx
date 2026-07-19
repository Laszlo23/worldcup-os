import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, Heart, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/matchmind/AppShell";
import { ArticleBody } from "@/components/matchmind/ArticleBody";
import { ShareActions } from "@/components/social/share-actions";
import { ConnectWalletButton } from "@/components/wallet/connect-wallet";
import { Button } from "@/components/ui/button";
import { useActiveMatchState } from "@/lib/use-active-match";
import { useLiveEvents } from "@/lib/queries/hooks";
import { buildBallNews, decodeNewsPostId, findBallNewsItem } from "@/lib/ball-news";
import {
  blogImageAbsolute,
  blogPostUrl,
  getBlogPost,
  type BlogPost,
} from "@/lib/blog-posts";
import { apiFetch, ApiError } from "@/lib/api/client";
import { useAppStore } from "@/lib/store";

const APP = import.meta.env.VITE_APP_URL ?? "https://match.buildingcultureid.space";

function articleJsonLd(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    image: [blogImageAbsolute(post.image)],
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { "@type": "Organization", name: post.author },
    publisher: {
      "@type": "Organization",
      name: "MatchMind AI",
      logo: { "@type": "ImageObject", url: `${APP}/brand/logo.png` },
    },
    mainEntityOfPage: blogPostUrl(post.slug),
    keywords: post.tags.join(", "),
  };
}

export const Route = createFileRoute("/news/$postId")({
  head: ({ params }) => {
    const postId = decodeNewsPostId(params.postId);
    const post = getBlogPost(postId);
    if (!post) {
      return {
        meta: [
          { title: "Ball News — MatchMind AI" },
          {
            name: "description",
            content: "Live football wires and MatchMind desk stories.",
          },
        ],
      };
    }
    const url = blogPostUrl(post.slug);
    const image = blogImageAbsolute(post.image);
    return {
      meta: [
        { title: `${post.title} — MatchMind AI` },
        { name: "description", content: post.description },
        { name: "author", content: post.author },
        { name: "keywords", content: post.tags.join(", ") },
        { name: "robots", content: "index,follow,max-image-preview:large" },
        { property: "og:type", content: "article" },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.description },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { property: "og:image:alt", content: post.imageAlt },
        { property: "article:published_time", content: post.publishedAt },
        { property: "article:modified_time", content: post.updatedAt },
        { property: "article:author", content: post.author },
        ...post.tags.map((tag) => ({ property: "article:tag", content: tag })),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: post.title },
        { name: "twitter:description", content: post.description },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(articleJsonLd(post)),
        },
      ],
    };
  },
  component: NewsPostPage,
});

function NewsPostPage() {
  const { postId: rawId } = Route.useParams();
  const postId = decodeNewsPostId(rawId);
  const editorial = getBlogPost(postId);
  const { match } = useActiveMatchState();
  const { data: events = [] } = useLiveEvents(match?.id);
  const news = useMemo(() => (match ? buildBallNews(match, events) : []), [match, events]);
  const wire = editorial ? null : findBallNewsItem(news, postId);
  const wallet = useAppStore((s) => s.wallet);
  const qc = useQueryClient();
  const [comment, setComment] = useState("");

  const enc = encodeURIComponent(postId);
  const { data, isPending } = useQuery({
    queryKey: ["blog", postId],
    queryFn: () =>
      apiFetch<{
        engagement: {
          likeCount: number;
          commentCount: number;
          likedByMe: boolean;
          headline: string;
          lede: string;
          body: string | null;
          imageUrl: string | null;
          kicker: string;
        };
        comments: {
          id: string;
          body: string;
          createdAt: string;
          author: { wallet: string; nickname: string | null; displayName: string | null };
        }[];
      }>(`/api/engagement/blog/${enc}`),
    refetchInterval: 12_000,
  });

  const metaPayload = () => {
    if (editorial) {
      return {
        kind: "feature",
        kicker: editorial.kicker,
        headline: editorial.title,
        lede: editorial.description,
        body: editorial.body
          .map((b) => {
            if (b.type === "p" || b.type === "h2" || b.type === "h3") return b.text;
            if (b.type === "quote") return b.text;
            if (b.type === "ul") return b.items.join(" · ");
            return "";
          })
          .filter(Boolean)
          .join("\n\n"),
        imageUrl: editorial.image,
      };
    }
    return {
      kind: wire?.kind,
      kicker: wire?.kicker ?? data?.engagement.kicker,
      headline: wire?.headline || data?.engagement.headline || "Ball News",
      lede: wire?.lede ?? data?.engagement.lede,
      body: wire?.body ?? data?.engagement.body ?? undefined,
      imageUrl: wire?.image ?? data?.engagement.imageUrl ?? undefined,
      matchExternalId: wire?.matchId ?? match?.id,
    };
  };

  const like = useMutation({
    mutationFn: () =>
      apiFetch<{ liked: boolean; likeCount: number }>(`/api/engagement/blog/${enc}/like`, {
        method: "POST",
        body: JSON.stringify(metaPayload()),
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["blog", postId] }),
    onError: (err) => toast.error(err instanceof Error ? err.message : "Like failed"),
  });

  const postComment = useMutation({
    mutationFn: () =>
      apiFetch(`/api/engagement/blog/${enc}/comment`, {
        method: "POST",
        body: JSON.stringify({ ...metaPayload(), text: comment }),
      }),
    onSuccess: () => {
      setComment("");
      toast.success("Comment posted");
      void qc.invalidateQueries({ queryKey: ["blog", postId] });
    },
    onError: (err) =>
      toast.error(err instanceof ApiError || err instanceof Error ? err.message : "Comment failed"),
  });

  const headline = editorial?.title || wire?.headline || data?.engagement.headline || "Story";
  const lede = editorial?.description || wire?.lede || data?.engagement.lede || "";
  const image =
    editorial?.image || wire?.image || data?.engagement.imageUrl || "/soccer/grassimage.webp";
  const imageAlt = editorial?.imageAlt || headline;
  const kicker = editorial?.kicker || wire?.kicker || data?.engagement.kicker || "Ball News";
  const shareUrl = editorial ? blogPostUrl(editorial.slug) : `${APP}/news/${enc}`;
  const published = editorial
    ? new Date(editorial.publishedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  if (!editorial && !wire && !isPending && !data?.engagement.headline) {
    return (
      <AppShell title="Ball News" subtitle="Story">
        <div className="space-y-3 px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">This story aged off the live wire.</p>
          <Link to="/news" className="text-sm font-semibold text-accent">
            ← Back to desk
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Ball News" subtitle={kicker} backdropVariant="action">
      <article className="px-4 pb-4 pt-4">
        <Link to="/news" className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
          <ArrowLeft className="size-3.5" /> Desk
        </Link>

        <div className="mt-3 overflow-hidden rounded-3xl border border-border">
          <img src={image} alt={imageAlt} className="aspect-[16/10] w-full object-cover" />
        </div>

        <header className="mt-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
            {kicker}
            {wire?.minuteLabel ? ` · ${wire.minuteLabel}` : ""}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold italic tracking-tight text-balance sm:text-[1.75rem]">
            {headline}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{lede}</p>
          {editorial ? (
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-muted-foreground">
              <span>{editorial.author}</span>
              <span aria-hidden>·</span>
              <time dateTime={editorial.publishedAt}>{published}</time>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" />
                {editorial.readingMinutes} min read
              </span>
            </p>
          ) : null}
        </header>

        <div className="mt-5">
          {editorial ? (
            <ArticleBody blocks={editorial.body} />
          ) : (
            <div className="space-y-3 text-[15px] leading-[1.7] text-foreground/90">
              {(wire?.body || data?.engagement.body || lede).split("\n").map((line, i) =>
                line.trim() ? (
                  <p key={i}>{line}</p>
                ) : (
                  <span key={i} className="block h-2" />
                ),
              )}
            </div>
          )}
        </div>

        {editorial ? (
          <ul className="mt-6 flex flex-wrap gap-1.5">
            {editorial.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-border/70 bg-muted/30 px-2.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-muted-foreground"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
          <Button
            size="sm"
            variant="outline"
            className={`gap-1.5 ${data?.engagement.likedByMe ? "border-live/40 text-live" : ""}`}
            disabled={!wallet.connected || like.isPending}
            onClick={() => like.mutate()}
          >
            <Heart className={`size-3.5 ${data?.engagement.likedByMe ? "fill-current" : ""}`} />
            {data?.engagement.likeCount ?? 0}
          </Button>
          <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
            <MessageCircle className="size-3" />
            {data?.engagement.commentCount ?? 0}
          </span>
          <ShareActions
            contentType="blog"
            contentId={postId}
            title={headline}
            url={shareUrl}
            className="ml-auto"
          />
        </div>
      </article>

      <section className="px-4 pb-8">
        <h2 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Terrace comments
        </h2>
        {!wallet.connected ? (
          <div className="mt-3 rounded-2xl border border-border p-4 text-center">
            <p className="text-xs text-muted-foreground">Connect to like & comment</p>
            <div className="mt-2 flex justify-center">
              <ConnectWalletButton size="sm" />
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Add a comment…"
              className="w-full resize-none rounded-xl border border-border bg-background/70 px-3 py-2 text-sm"
            />
            <Button
              size="sm"
              disabled={postComment.isPending || comment.trim().length < 1}
              onClick={() => postComment.mutate()}
            >
              {postComment.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Post comment"}
            </Button>
          </div>
        )}
        <ul className="mt-4 space-y-2">
          {(data?.comments ?? []).map((c) => {
            const name =
              c.author.displayName?.trim() ||
              c.author.nickname ||
              `${c.author.wallet.slice(0, 4)}…${c.author.wallet.slice(-4)}`;
            return (
              <li key={c.id} className="rounded-2xl border border-border bg-card/60 p-3">
                <p className="text-sm">{c.body}</p>
                <p className="mt-1 font-mono text-[10px] text-muted-foreground">{name}</p>
              </li>
            );
          })}
          {!isPending && (data?.comments?.length ?? 0) === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No comments yet — open the terrace.
            </p>
          ) : null}
        </ul>
      </section>
    </AppShell>
  );
}
