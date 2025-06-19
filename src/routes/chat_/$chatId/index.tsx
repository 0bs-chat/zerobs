import { createFileRoute } from "@tanstack/react-router";
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
import { rightPanelVisibilityAtom, sidebarOpenAtom } from "@/store/chatStore";
import { selectedArtifactAtom } from "@/store/chatStore";
import { useEffect } from "react";
import type { Id } from "convex/_generated/dataModel";
import { useParams } from "@tanstack/react-router";

export const Route = createFileRoute("/chat_/$chatId/")({
  component: RouteComponent,
});

function RouteComponent() {
  const params = useParams({
    from: "/chat_/$chatId/",
  });
  const chatId = params.chatId as Id<"chats"> | "new";
  const rightPanelVisible = useAtomValue(rightPanelVisibilityAtom);
  const sidebarOpen = useAtomValue(sidebarOpenAtom);
  const setSidebarOpen = useSetAtom(sidebarOpenAtom);
  const setSelectedArtifact = useSetAtom(selectedArtifactAtom);
  useEffect(() => {
    setSelectedArtifact(null);
  }, [chatId, setSelectedArtifact]);

  return (
    <SidebarProvider
      className="flex h-svh font-sans"
      open={sidebarOpen}
      onOpenChange={() => {
        setSidebarOpen(!sidebarOpen);
      }}
    >
      <TopNav />
      {sidebarOpen && <AppSidebar />}
      <div className="flex-1">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel className="flex flex-col gap-1 p-2 pt-4 overflow-hidden">
            <ChatMessages />
            <ChatInput />
          </ResizablePanel>
          {rightPanelVisible && (
            <>
              <ResizableHandle />
              <ResizablePanel
                defaultSize={40}
                minSize={25}
                maxSize={50}
                className="overflow-hidden h-full"
              >
                <Panel />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>

      {/* Dialogs */}
      <DocumentDialog />
      <CreateProjectDialog />
    </SidebarProvider>
  );
}
