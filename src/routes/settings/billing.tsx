import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/billing")({
  component: RouteComponent,
});

function RouteComponent() {
  return <div></div>;
}
