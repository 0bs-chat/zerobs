import { SignedIn, SignedOut } from "@clerk/tanstack-react-start";
import { Navigate } from "@tanstack/react-router";
import { ChatInput } from "@/components/chat/input/index";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { Toaster } from "@/components/ui/sonner";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { TopNav } from "@/components/topnav";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { rightPanelVisibilityAtom, sidebarOpenAtom } from "@/store/chatStore";
import { useAtomValue, useSetAtom } from "jotai";
import { ResizableHandle } from "@/components/ui/resizable";
import { DocumentDialog } from "@/components/document-dialog";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { Panel } from "@/components/chat/panels";
import { useHydrateAtoms } from "jotai/utils";
import { ChatMessages } from "@/components/chat/messages/messages";
import type { Id } from "convex/_generated/dataModel";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

interface ChatInterfaceProps {
  isNewChat: boolean;
  chatId: Id<"chats">;
}

export const ChatInterface = ({ isNewChat, chatId }: ChatInterfaceProps) => {
  const sidebarOpen = useAtomValue(sidebarOpenAtom);
  const setSidebarOpen = useSetAtom(sidebarOpenAtom);
  const rightPanelVisible = useAtomValue(rightPanelVisibilityAtom);

  useHydrateAtoms([
    [sidebarOpenAtom, false],
    [rightPanelVisibilityAtom, false],
  ] as const);

  return (
    <>
      <SignedIn>
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
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="animate-spin" />
                </div>
              }
            >
              <ResizablePanelGroup
                direction="horizontal"
                id={`resizable-panel-group-${chatId}`} // creates random ids, so for nor having the hydration
              >
                <ResizablePanel className="flex flex-col gap-1 p-2 pt-4 overflow-hidden justify-between">
                  <div className="flex flex-col items-center justify-center overflow-hidden">
                    {chatId && <ChatMessages chatId={chatId} />}
                  </div>
                  <ChatInput isNewChat={isNewChat} chatId={chatId} />
                </ResizablePanel>
                {rightPanelVisible && (
                  <>
                    <ResizableHandle />
                    <ResizablePanel defaultSize={40} minSize={25} maxSize={50}>
                      <Panel />
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </Suspense>
          </div>
          {/* Dialogs */}
          <DocumentDialog />
          <CreateProjectDialog />
        </SidebarProvider>
        <Toaster />
        <TanStackRouterDevtools position="bottom-right" />
      </SignedIn>
      <SignedOut>
        <Navigate to="/auth" />
      </SignedOut>
    </>
  );
};
