import { createLazyFileRoute } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";

export const Route = createLazyFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
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
          onClick={() =>
            authClient.signIn.social({
              provider: "google",
            })
          }
        >
          Sign in with Google
        </Button>
      </motion.div>
    </main>
  );
}
