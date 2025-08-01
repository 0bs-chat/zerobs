import { createLazyFileRoute } from "@tanstack/react-router";
import { ProjectsList } from "@/components/chat/panels/projects/list";

export const Route = createLazyFileRoute("/projects")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="min-w-4xl p-3 mx-auto flex h-screen flex-col overflow-y-auto w-full">
      <ProjectsList />
    </div>
  );
}
