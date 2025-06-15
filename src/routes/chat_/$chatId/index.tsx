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
import { resizablePanelsOpenAtom, sidebarOpenAtom } from "@/store/chatStore";

export const Route = createFileRoute("/chat_/$chatId/")({
  component: RouteComponent,
});

function RouteComponent() {
  const resizablePanelsOpen = useAtomValue(resizablePanelsOpenAtom);
  const sidebarOpen = useAtomValue(sidebarOpenAtom);
  const setSidebarOpen = useSetAtom(sidebarOpenAtom);

  return (
    <SidebarProvider
      className="flex h-svh font-sans"
      open={sidebarOpen}
      onOpenChange={setSidebarOpen}
    >
      <AppSidebar />
      <TopNav />
      <div className="flex-1">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel className="flex flex-col gap-1 p-2 pt-4">
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
      </div>

      {/* Dialogs */}
      <DocumentDialog />
      <CreateProjectDialog />
    </SidebarProvider>
  );
}
