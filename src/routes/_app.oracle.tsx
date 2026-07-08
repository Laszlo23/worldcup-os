import { createFileRoute } from "@tanstack/react-router";
import { OracleCommandCenter } from "@/components/oracle/command-center";

export const Route = createFileRoute("/_app/oracle")({
  head: () => ({ meta: [{ title: "Oracle Command Center — World Cup OS" }] }),
  component: OracleCommandCenter,
});
