import { Outlet, createFileRoute } from "@tanstack/react-router";

/** Layout for /news and /news/$postId — child routes render via Outlet. */
export const Route = createFileRoute("/news")({
  component: NewsLayout,
});

function NewsLayout() {
  return <Outlet />;
}
