import { createFileRoute } from "@tanstack/react-router";
import { ChatInput } from "@/components/chat/input";

export const Route = createFileRoute("/")({
  component: App,
});

function App() {
  return (
    <div className="flex flex-col h-full w-full justify-center items-center">
      <ChatInput />
    </div>
  );
}
