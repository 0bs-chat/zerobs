import { useAuth } from "@clerk/clerk-react";
import { useMemo } from "react";

export type Plan = "free" | "pro" | "unlimited";

export function useBilling() {
  const { has, isLoaded } = useAuth();

  const plan: Plan = useMemo(() => {
    if (!isLoaded || !has) {
      return "free";
    }

    // Check for pro plan using Clerk's has() function
    if (has({ plan: "pro" })) {
      return "pro";
    }

    // Default to free plan
    return "free";
  }, [has, isLoaded]);

  const isPro = plan === "pro";
  const isFree = plan === "free";

  return {
    plan,
    isPro,
    isFree,
    isLoaded,
  };
}
