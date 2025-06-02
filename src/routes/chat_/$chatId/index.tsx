import { createFileRoute } from "@tanstack/react-router";
import { ChatMessages } from "@/components/chat/messages";
import { ChatInput } from "@/components/chat/input";

export const Route = createFileRoute("/chat_/$chatId/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col h-full w-full gap-1 py-2">
      <ChatMessages />
      <ChatInput />
    </div>
  );
}
