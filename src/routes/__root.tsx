import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  Link,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppProviders } from "@/components/app-providers";
import { canonicalUrl, defaultMeta, organizationJsonLd } from "@/lib/seo";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass p-10 rounded-2xl">
        <h1 className="text-7xl font-display font-bold gradient-text">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This market doesn't exist yet.
        </p>
        <Link to="/" className="mt-6 inline-flex items-center rounded-md bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          Back home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center glass p-10 rounded-2xl">
        <h1 className="text-xl font-semibold">Something broke</h1>
        <p className="mt-2 text-sm text-muted-foreground">The live feed hiccupped. Try again.</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 rounded-md bg-gradient-primary px-4 py-2 text-sm text-primary-foreground">
          Retry
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: defaultMeta.title },
      { name: "description", content: defaultMeta.description },
      { name: "author", content: "World Cup OS" },
      { name: "robots", content: "index, follow" },
      { name: "theme-color", content: "#10b981" },
      { property: "og:site_name", content: "World Cup OS" },
      { property: "og:title", content: defaultMeta.title },
      { property: "og:description", content: defaultMeta.description },
      { property: "og:type", content: defaultMeta.type },
      { property: "og:url", content: canonicalUrl() },
      { property: "og:image", content: defaultMeta.image },
      { property: "og:image:alt", content: "World Cup OS — TxLINE oracle prediction markets on Solana" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: defaultMeta.title },
      { name: "twitter:description", content: defaultMeta.description },
      { name: "twitter:image", content: defaultMeta.image },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/brand/logo.png" },
      { rel: "canonical", href: canonicalUrl() },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(organizationJsonLd()),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // After deploys, stale tabs can request deleted hashed chunks (e.g. connect-wallet-*.js).
  useEffect(() => {
    const key = "wmos_chunk_reload";
    const reloadOnce = () => {
      if (sessionStorage.getItem(key) === "1") return;
      sessionStorage.setItem(key, "1");
      window.location.reload();
    };
    const onError = (event: ErrorEvent) => {
      const msg = String(event.message ?? "");
      if (/Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg)) {
        reloadOnce();
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const msg = reason instanceof Error ? reason.message : String(reason ?? "");
      if (/Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(msg)) {
        reloadOnce();
      }
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    // Clear the one-shot guard only after a healthy load window.
    const clearTimer = window.setTimeout(() => sessionStorage.removeItem(key), 15_000);
    return () => {
      window.clearTimeout(clearTimer);
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <Outlet />
        <Toaster theme="dark" position="top-right" richColors closeButton />
      </AppProviders>
    </QueryClientProvider>
  );
}
