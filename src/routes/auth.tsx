import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: RouteComponent,
});

function RouteComponent() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const providers = ["github", "google"] as const;

  return (
    <div className="flex flex-col items-center gap-2 justify-center h-screen w-screen">
      <Button
        variant="default"
        className="px-4 text-lg py-6 cursor-pointer w-56"
        onClick={async () => {
          await signIn("anonymous");
          toast.success("Signed in anonymously");
          navigate({ to: "/chat/$chatId", params: { chatId: "new" } });
        }}
      >
        🥷 Anonymous Sign in
      </Button>
      {providers.map((provider) => {
        const isProviderEnabled = useQuery(api.auth.isProviderEnabled, {
          provider,
        });
        if (isProviderEnabled) {
          return (
            <Button
              variant="default"
              className="px-4 text-lg py-6 cursor-pointer w-56"
              key={provider}
              onClick={() => {
                signIn(provider);
                toast.success(`Signing in with ${provider}`);
              }}
            >
              <div className="flex items-center gap-2 justify-center">
                <span className="text-lg">Sign in with {provider}</span>
              </div>
            </Button>
          );
        }
        return null;
      })}
    </div>
  );
}
