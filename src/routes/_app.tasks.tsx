import { createFileRoute } from "@tanstack/react-router";
import { TaskBoard } from "@/components/tasks/task-board";

export const Route = createFileRoute("/_app/tasks")({
  head: () => ({ meta: [{ title: "Community Tasks — World Cup OS" }] }),
  component: TaskBoard,
});
