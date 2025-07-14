import { layoutTransition } from "@/lib/motion";
import { ChatInput } from "@/components/chat/input";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { Authenticated, Unauthenticated } from "convex/react";
import { motion } from "motion/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  const user = useQuery(api.auth.getUser);

  return (
    <>
      <Unauthenticated>
        <Navigate to="/auth" />
      </Unauthenticated>
      <Authenticated>
        <motion.div
          className="flex-1 min-h-0"
          layout
          transition={layoutTransition}
        >
          <div className="flex items-center justify-center h-full flex-col gap-4">
            <div className="flex flex-col items-center gap-2 text-4xl font-semibold text-muted-foreground/40 font-serif">
              {user?.name && `How can i help you, ${user?.name} ?`}
            </div>
          </div>
        </motion.div>
        <motion.div className="flex-none" layout transition={layoutTransition}>
          <ChatInput />
        </motion.div>
      </Authenticated>
    </>
  );
}
