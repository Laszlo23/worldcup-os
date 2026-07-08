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
      { title: "World Cup OS — Predict the World Cup. Trust the Blockchain." },
      { name: "description", content: "Real-time World Cup prediction markets powered by TxLINE with automatic on-chain settlement on Solana." },
      { name: "author", content: "World Cup OS" },
      { property: "og:title", content: "World Cup OS — Predict the World Cup. Trust the Blockchain." },
      { property: "og:description", content: "Real-time World Cup prediction markets powered by TxLINE with automatic on-chain settlement on Solana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "World Cup OS — Predict the World Cup. Trust the Blockchain." },
      { name: "twitter:description", content: "Real-time World Cup prediction markets powered by TxLINE with automatic on-chain settlement on Solana." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3f944e2d-76c1-4674-bfe5-c16063f0d8d1/id-preview-7163e96e--e1b2104c-fed1-4c30-a6eb-d0daebeb762c.lovable.app-1783535951859.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3f944e2d-76c1-4674-bfe5-c16063f0d8d1/id-preview-7163e96e--e1b2104c-fed1-4c30-a6eb-d0daebeb762c.lovable.app-1783535951859.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" },
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
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <Outlet />
        <Toaster theme="dark" position="top-right" richColors closeButton />
      </AppProviders>
    </QueryClientProvider>
  );
}
