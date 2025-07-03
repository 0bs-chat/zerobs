import { createFileRoute } from "@tanstack/react-router";

import { ChatInput } from "@/components/chat/input";

export const Route = createFileRoute("/")({
  component: NewChat,
});

export default function NewChat() {
  return (
    <div className="flex flex-col h-screen w-full bg-transparent">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-primary text-4xl font-bold font-mono">
          welcome to the power app
        </div>
      </div>
      <div className="w-full flex justify-center pb-3">
        <div className="w-full max-w-4xl">
          <ChatInput />
        </div>
      </div>
    </div>
  );
}
