import { createFileRoute } from "@tanstack/react-router";
import { ChatInput } from "@/components/chat/input";
import { ChatMessages } from "@/components/chat/messages";

export const Route = createFileRoute("/chat/$chatId")({
  component: ChatPage,
  errorComponent: (e) => (
    <div className="flex min-h-screen items-center justify-center font-mono">
      Error occurred: {e.error.message}
    </div>
  ),
});

function ChatPage() {
  return (
    <>
      <div className="flex flex-col max-w-4xl w-full mx-auto bg-muted rounded-lg">
        <ChatMessages />
        <ChatInput />
      </div>
    </>
  );
}
