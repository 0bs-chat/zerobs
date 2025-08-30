import { createFileRoute } from "@tanstack/react-router";
import { PricingTable } from "autumn-js/react";

export const Route = createFileRoute("/settings/billing")({
  component: RouteComponent,
});

function RouteComponent() {
  return <PricingTable />;
}
