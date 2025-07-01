import { createFileRoute } from "@tanstack/react-router";

import { ChatInterface } from "@/components/chatInterface";
import type { Id } from "convex/_generated/dataModel";

export const Route = createFileRoute("/")({
  component: NewChat,
});

export default function NewChat() {
  return (
    <>
      <ChatInterface isNewChat={true} chatId={"new" as Id<"chats">} />
    </>
  );
}
