import { createFileRoute } from "@tanstack/react-router";
import { ChatMessages } from "@/components/chat/messages";

export const Route = createFileRoute("/chat_/$chatId/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col h-full p-2 gap-2">
      <ChatMessages />
    </div>
  );
}
