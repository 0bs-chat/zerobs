import { createLazyFileRoute, useLocation } from "@tanstack/react-router";
import { ProjectsList } from "@/components/chat/panels/projects/list";

export const Route = createLazyFileRoute("/projects")({
  component: RouteComponent,
});

function RouteComponent() {
  const isOnProjectsRoute = useLocation().pathname === "/projects";
  return (
    <div
      className={` ${isOnProjectsRoute ? "min-w-5xl p-3 mx-auto flex h-[calc(100vh-24rem)] flex-col overflow-y-auto" : "min-w-4xl py-4 mx-auto"}`}
    >
      <ProjectsList />
    </div>
  );
}
