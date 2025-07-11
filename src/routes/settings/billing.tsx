import { createFileRoute } from "@tanstack/react-router";
import { dark } from "@clerk/themes";
import { PricingTable } from "@clerk/clerk-react";

export const Route = createFileRoute("/settings/billing")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div>
      <PricingTable
        appearance={{
          baseTheme: dark,
        }}
      />
    </div>
  );
}
