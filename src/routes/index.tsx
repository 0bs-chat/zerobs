import { createFileRoute } from "@tanstack/react-router";

import { ChatInterface } from "@/components/chatInterface";

export const Route = createFileRoute("/")({
  component: NewChat,
});

export default function NewChat() {
  return (
    <>
      <ChatInterface isNewChat={true} chatId={null} />
    </>
  );
}
