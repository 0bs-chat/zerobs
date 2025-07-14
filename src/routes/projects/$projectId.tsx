import { layoutTransition, slideInFromLeft } from "@/lib/motion";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";

export const Route = createFileRoute("/projects/$projectId")({
  component: RouteComponent,
});

function RouteComponent() {
  return <ProjectDetails />;
}

function ProjectDetails() {
  return (
    <motion.div
      variants={slideInFromLeft}
      initial="initial"
      animate="animate"
      transition={layoutTransition}
    >
      <div className="flex h-screen flex-col overflow-y-auto bg-background w-full">
        <div className="container mx-auto flex max-w-4xl flex-1 flex-col p-3 pb-6 lg:max-h-dvh lg:overflow-y-hidden lg:p-6">
          <div className="flex flex-col gap-1 p-2 pt-4">
            <h1 className="text-2xl font-bold">Project Details</h1>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
