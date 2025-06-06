import { createFileRoute, useParams } from "@tanstack/react-router";
import { ChatMessages } from "@/components/chat/messages";
import type { Id } from "convex/_generated/dataModel";
import { ChatInputToolbar } from "@/components/chat/input/toolbar";

export const Route = createFileRoute("/chat_/$chatId/")({
  component: RouteComponent,
});

function RouteComponent() {
  const params = useParams({ strict: false });
  const chatId: Id<"chats"> = params.chatId as Id<"chats">;

  return (
    <div className="flex flex-col  h-full w-full gap-1 py-2">
      {chatId === "new" ? (
        <div className="flex flex-col items-center justify-end h-full w-full gap-1 py-2">
          <ChatInputToolbar />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-end h-full w-full gap-1 py-2">
          <ChatMessages />
          <ChatInputToolbar />
        </div>
      )}
    </div>
  );
}
