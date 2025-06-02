import { createFileRoute, Navigate } from "@tanstack/react-router";
import { ChatMessages } from "@/components/chat/messages";
import { ChatInput } from "@/components/chat/input";
import { useConvexAuth } from "convex/react";

export const Route = createFileRoute("/chat_/$chatId/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { isAuthenticated } = useConvexAuth();

  if (!isAuthenticated) {
    return <Navigate to="/auth" />;
  }

  return (
    <div className="flex flex-col h-full w-full p-4 gap-2">
      <ChatMessages />
      <ChatInput />
    </div>
  );
}
