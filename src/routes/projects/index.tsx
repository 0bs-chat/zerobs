import { chatMessageVariants, layoutTransition } from "@/lib/motion";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";

export const Route = createFileRoute("/projects/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <motion.div
      variants={chatMessageVariants}
      initial="initial"
      animate="animate"
      transition={layoutTransition}
    >
      <div className="flex h-screen flex-col overflow-y-auto bg-background w-full">
        <div className="container mx-auto flex max-w-4xl flex-1 flex-col p-3 pb-6 lg:max-h-dvh lg:overflow-y-hidden lg:p-6">
          all projects will be shown here.
        </div>
      </div>
    </motion.div>
  );
}
