import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col items-center justify-end h-full w-full gap-1 py-2">
      {/* <ChatInput /> */}
    </div>
  );
}
