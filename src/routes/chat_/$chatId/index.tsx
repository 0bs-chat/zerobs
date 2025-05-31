import { createFileRoute } from "@tanstack/react-router";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useChat } from "@/store/use-chat";
import { ChatMessages } from "@/components/chat/messages";
import { ChatInput } from "@/components/chat/input";
import { Panel } from "@/components/chat/panel";

export const Route = createFileRoute("/chat_/$chatId/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { resizablePanelsOpen } = useChat();

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel className="flex flex-col h-full p-2 gap-2">
        <ChatMessages />
        <ChatInput />
      </ResizablePanel>
      {resizablePanelsOpen && (
        <>
          <ResizableHandle />
          <ResizablePanel defaultSize={40} minSize={25} maxSize={50}>
            <Panel />
          </ResizablePanel>
        </>
      )}
    </ResizablePanelGroup>
  );
}
