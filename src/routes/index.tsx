import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const { isAuthenticated } = useConvexAuth();

  if (isAuthenticated) {
    return <Navigate to="/chat/$chatId" params={{ chatId: "new" }} />;
  }

  return (
    <div className="flex flex-col items-center h-full w-full justify-center p-2 gap-2">
      <div className="text-5xl font-bold"> 👋 Hi, How can i help you ? </div>
    </div>
  );
}
