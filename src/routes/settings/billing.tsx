import { createFileRoute } from "@tanstack/react-router";
import { PricingTable } from "autumn-js/react";
import { useCustomer } from "autumn-js/react";

export const Route = createFileRoute("/settings/billing")({
  component: RouteComponent,
});

function RouteComponent() {
  const { customer } = useCustomer();

  const getUsagePercentage = (usage: number, limit: number) => {
    return Math.min((usage / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-blue-500";
  };

  // Determine reset intervals based on plan and feature
  const getMessageResetInterval = () => {
    // Free plan messages reset daily, Pro plan messages reset monthly
    const isFreePlan = customer?.features?.messages?.included_usage === 8;
    return isFreePlan ? "daily" : "monthly";
  };

  // Usage Card Component
  const UsageCard = ({
    title,
    usage,
    limit,
    balance,
    showReset = false,
    resetInterval = "",
  }: {
    title: string;
    usage: number;
    limit: string | number;
    balance: number;
    showReset?: boolean;
    resetInterval?: string;
  }) => (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        {showReset && (
          <span className="text-sm text-muted-foreground">
            Resets {resetInterval}
          </span>
        )}
      </div>

      <div className="text-3xl font-bold mb-2">
        {usage}
        <span className="text-lg text-muted-foreground font-normal">
          /{limit}
        </span>
      </div>

      {/* Usage Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(
            getUsagePercentage(usage, typeof limit === "number" ? limit : 1),
          )}`}
          style={{
            width: `${getUsagePercentage(usage, typeof limit === "number" ? limit : 1)}%`,
          }}
        />
      </div>

      <div className="text-sm text-muted-foreground">{balance} remaining</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Billing & Usage</h2>
        <p className="text-muted-foreground">
          Manage your subscription and view usage
        </p>
      </div>

      {/* Usage Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <UsageCard
          title="Messages"
          usage={customer?.features?.messages?.usage || 0}
          limit={customer?.features?.messages?.included_usage || "∞"}
          balance={customer?.features?.messages?.balance || 0}
          showReset={true}
          resetInterval={getMessageResetInterval()}
        />

        <UsageCard
          title="MCPs"
          usage={customer?.features?.mcps?.usage || 0}
          limit={customer?.features?.mcps?.included_usage || "∞"}
          balance={customer?.features?.mcps?.balance || 0}
          showReset={false}
        />
      </div>

      {/* Pricing Table */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Plans & Pricing</h3>
        <PricingTable />
      </div>
    </div>
  );
}
