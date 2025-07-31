import { createLazyFileRoute } from "@tanstack/react-router";
import { ProjectsList } from "@/components/chat/panels/projects/list";

export const Route = createLazyFileRoute("/projects")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="min-w-4xl py-4 mx-auto">
      <ProjectsList />
    </div>
  );
}
