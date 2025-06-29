import { createFileRoute } from "@tanstack/react-router";
import { ChatInterface } from "@/components/chatInterface";
import type { Id } from "convex/_generated/dataModel";
import { useParams } from "@tanstack/react-router";

export const Route = createFileRoute("/chat/$chatId")({
  component: ChatPage,
  errorComponent: (e) => (
    <div className="flex min-h-screen items-center justify-center font-mono">
      Error occurred: {e.error.message}
    </div>
  ),
});

function ChatPage() {
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats">;

  return (
    <>
      <ChatInterface isNewChat={false} chatId={chatId} />
    </>
  );
}
