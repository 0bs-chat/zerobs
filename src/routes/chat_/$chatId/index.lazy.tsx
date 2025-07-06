import { createLazyFileRoute } from "@tanstack/react-router";
import { ChatMessages } from "@/components/chat/messages";
import { ChatInput } from "@/components/chat/input/index";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { TopNav } from "@/components/topnav";
import { Panel } from "@/components/chat/panels";
import { DocumentDialog } from "@/components/document-dialog";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { useAtomValue, useSetAtom } from "jotai";
import {
  resizePanelOpenAtom,
  selectedArtifactAtom,
  sidebarOpenAtom,
} from "@/store/chatStore";
import { useEffect } from "react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useParams } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/chat_/$chatId/")({
  component: RouteComponent,
});

function RouteComponent() {
  const params = useParams({
    from: "/chat_/$chatId/",
  });
  const chatId = params.chatId as Id<"chats">;
  const resizePanelOpen = useAtomValue(resizePanelOpenAtom);
  const sidebarOpen = useAtomValue(sidebarOpenAtom);
  const setSidebarOpen = useSetAtom(sidebarOpenAtom);
  const setSelectedArtifact = useSetAtom(selectedArtifactAtom);

  useEffect(() => {
    setSelectedArtifact(null);
  }, [chatId, setSelectedArtifact]);

  return (
    <SidebarProvider
      className="font-sans h-svh"
      open={sidebarOpen}
      onOpenChange={() => {
        setSidebarOpen(!sidebarOpen);
      }}
    >
      <TopNav />
      <AppSidebar />
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel className="flex flex-col gap-1 p-2 pt-4">
          <div className="flex-1 min-h-0">
            <ChatMessages />
          </div>
          <div className="flex-none">
            <ChatInput />
          </div>
        </ResizablePanel>
        {resizePanelOpen && (
          <>
            <ResizableHandle />
            <ResizablePanel defaultSize={40} minSize={25} maxSize={50}>
              <Panel />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
      {/* Dialogs */}
      <DocumentDialog />
      <CreateProjectDialog />
    </SidebarProvider>
  );
}
