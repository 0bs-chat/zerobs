import { chatMessageVariants, layoutTransition } from "@/lib/motion";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useProjects } from "@/hooks/use-projects";
import { Card } from "@/components/ui/card";
import { ArrowLeft, FolderOpen } from "lucide-react";
import { ModeToggle } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/projects/")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const { projects } = useProjects(20);

  return (
    <motion.div
      variants={chatMessageVariants}
      initial="initial"
      animate="animate"
      transition={layoutTransition}
    >
      <div className="flex h-screen flex-col overflow-y-auto bg-background w-full">
        <div className="container mx-auto flex max-w-4xl flex-1 flex-col p-3 pb-6 lg:max-h-dvh lg:overflow-y-hidden lg:p-6">
          <div className="mb-6 flex items-center justify-between">
            <Button
              variant="ghost"
              className=" cursor-pointer"
              onClick={() => {
                navigate({ to: "/" });
              }}
            >
              <ArrowLeft className="h-6 w-6" />
              Back to chat
            </Button>
            <ModeToggle />
          </div>
          <div className="py-6  flex gap-2 items-center">
            <FolderOpen className="w-10 h-10 fill-accent text-accent-foreground" />
            <div className="text-3xl font-bold">All Projects</div>
          </div>
          {projects?.page.map((project) => (
            <Card
              key={project._id}
              className={`group flex-col relative group/card px-4 py-4 flex items-center justify-between hover:bg-accent duration-300 transition-colors gap-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer`}
              onClick={() => {
                navigate({
                  to: "/projects/$projectId",
                  params: { projectId: project._id },
                });
              }}
            >
              <div className="flex items-center justify-between flex-1 gap-1 w-full">
                <div className="flex gap-2 items-center justify-start w-full">
                  <h3 className="font-medium text-lg">{project.name}</h3>
                </div>
              </div>
              {project.description && (
                <p className="text-sm text-muted-foreground text-justify line-clamp-2 text-ellipsis w-full">
                  {project.description}
                </p>
              )}
            </Card>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
