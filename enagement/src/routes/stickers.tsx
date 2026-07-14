import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/stickers")({
  beforeLoad: () => {
    throw redirect({ to: "/moments" });
  },
});
