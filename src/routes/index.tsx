import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const { signIn } = useAuthActions();

  return (
    <div className="flex flex-col items-center h-full w-full justify-center p-2 gap-2">
      <div className="text-5xl font-bold"> 👋 hi, how can i help you ?</div>
      <Button
        key="github-repo"
        onClick={() => {
          console.log("Signing in with", "github-repo");
          signIn("github-repo");
          toast.success(`Signing in with github-repo`);
        }}
      >
        Sign in with github-repo
      </Button>
    </div>
  );
}
