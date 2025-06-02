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
  const providers = ["github", "google"] as const;
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center gap-2 justify-center h-full w-full">
      <Button
        variant="default"
        className="px-4 text-lg py-6 cursor-pointer"
        onClick={() => {
          signIn("anonymous");
          toast.success("Signed in anonymously");
          navigate({ to: "/chat/$chatId", params: { chatId: "new" } });
        }}
      >
        Anonymous Sign in 🥷
      </Button>

      {providers.map((provider) => {
        const isProviderEnabled = useQuery(api.auth.isProviderEnabled, {
          provider,
        });
        if (isProviderEnabled) {
          return (
            <Button
              variant="default"
              className="px-4 text-lg py-6 cursor-pointer"
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
