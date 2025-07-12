import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import { Loader2 } from "lucide-react";
import { Navigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signIn } = useAuthActions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-12 h-12 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" />;
  }

  return (
    <main className="flex min-h-full items-center w-full selection:none  select-none justify-center font-mono ">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col gap-4 border bg-background shadow-xs p-4 rounded-lg w-full max-w-md"
      >
        <div className="flex items-center w-full  justify-between">
          <img
            src="/android-chrome-512x512.png"
            alt="zerobs logo"
            className="cursor-pointer w-12 h-12 rounded-md"
          />
          <div className=" text-lg"></div>
        </div>

        <Button
          variant="default"
          size="lg"
          className="font-mono text-lg py-6 px-8 cursor-pointer font-medium"
          onClick={() => signIn("google")}
        >
          Sign in with Google
        </Button>
      </motion.div>
    </main>
  );
}
