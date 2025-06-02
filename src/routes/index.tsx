import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  const { isAuthenticated } = useConvexAuth();

  return isAuthenticated ? (
    <Navigate to="/chat/$chatId" params={{ chatId: "new" }} />
  ) : (
    <Navigate to="/auth" />
  );
}
