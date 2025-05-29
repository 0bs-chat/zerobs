import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: RouteComponent,
});

function RouteComponent() {
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();
  const providers = ["github", "google"] as const;

  if (isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <Button onClick={() => signIn("anonymous")}>Sign in Anonymously</Button>
      {providers.map((provider) => {
        const isProviderEnabled = useQuery(api.auth.isProviderEnabled, {
          provider,
        });
        if (isProviderEnabled) {
          return (
            <Button
              key={provider}
              onClick={() => {
                console.log("Signing in with", provider);
                signIn(provider);
                toast.success(`Signing in with ${provider}`);
              }}
            >
              Sign in with {provider}
            </Button>
          );
        }
        return null;
      })}
    </div>
  );
}
