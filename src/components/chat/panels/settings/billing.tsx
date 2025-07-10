import { dark } from "@clerk/themes";
import { PricingTable } from "@clerk/clerk-react";

export const BillingTab = () => {
  return (
    <div>
      <PricingTable
        appearance={{
          baseTheme: dark,
        }}
      />
    </div>
  );
};
