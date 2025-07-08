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
import { motion, AnimatePresence } from "motion/react";
import {
  slideInFromRight,
  slideInFromLeft,
  layoutTransition,
} from "@/lib/motion";

export const Route = createLazyFileRoute("/chat/$chatId/")({
  component: RouteComponent,
});

function RouteComponent() {
  const params = useParams({
    from: "/chat/$chatId/",
  });
  const chatId = params.chatId as Id<"chats">;
  const resizePanelOpen = useAtomValue(resizePanelOpenAtom);
  const sidebarOpen = useAtomValue(sidebarOpenAtom);
  const setSidebarOpen = useSetAtom(sidebarOpenAtom);
  const setSelectedArtifact = useSetAtom(selectedArtifactAtom);

  useEffect(() => {
    setSelectedArtifact(undefined);
  }, [chatId, setSelectedArtifact]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <SidebarProvider
        className="font-sans h-svh relative before:content-[''] before:fixed before:inset-0 before:bg-[url('/images/noise.png')] before:opacity-50 before:pointer-events-none before:z-[-1]"
        open={sidebarOpen}
        onOpenChange={() => {
          setSidebarOpen(!sidebarOpen);
        }}
      >
        <TopNav />
        <motion.div
          variants={slideInFromLeft}
          initial="initial"
          animate="animate"
          transition={layoutTransition}
        >
          <AppSidebar />
        </motion.div>
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel className="flex flex-col gap-1 p-2 pt-4">
            <motion.div
              className="flex-1 min-h-0"
              layout
              transition={layoutTransition}
            >
              <ChatMessages />
            </motion.div>
            <motion.div
              className="flex-none"
              layout
              transition={layoutTransition}
            >
              <ChatInput />
            </motion.div>
          </ResizablePanel>
          <AnimatePresence mode="wait">
            {resizePanelOpen && (
              <>
                <ResizableHandle />
                <ResizablePanel defaultSize={40} minSize={25} maxSize={60}>
                  <motion.div
                    variants={slideInFromRight}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={layoutTransition}
                    className="h-full"
                  >
                    <Panel />
                  </motion.div>
                </ResizablePanel>
              </>
            )}
          </AnimatePresence>
        </ResizablePanelGroup>
        {/* Dialogs */}
        <DocumentDialog />
        <CreateProjectDialog />
      </SidebarProvider>
    </motion.div>
  );
}
