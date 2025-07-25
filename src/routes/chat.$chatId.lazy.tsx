import { createLazyFileRoute } from "@tanstack/react-router";
import { ChatMessages } from "@/components/chat/messages";
import { ChatInput } from "@/components/chat/input/index";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Panel } from "@/components/chat/panels";
import { DocumentDialog } from "@/components/document-dialog";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { useAtomValue, useSetAtom } from "jotai";
import { chatAtom, resizePanelOpenAtom, selectedArtifactAtom } from "@/store/chatStore";
import { useEffect } from "react";
import type { Id } from "../../convex/_generated/dataModel";
import { useParams } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  slideInFromRight,
  layoutTransition,
} from "@/lib/motion";
import { api } from "../../convex/_generated/api";
import { useQuery } from "convex/react";
import { newChatAtom } from "@/store/chatStore";

export const Route = createLazyFileRoute("/chat/$chatId")({
  component: RouteComponent,
});

function RouteComponent() {
  const params = useParams({
    from: "/chat/$chatId",
  });
  const chatId = params.chatId as Id<"chats">;
  const resizePanelOpen = useAtomValue(resizePanelOpenAtom);
  const setSelectedArtifact = useSetAtom(selectedArtifactAtom);
  const newChat = useAtomValue(newChatAtom);
  const setChat = useSetAtom(chatAtom);
  useEffect(() => {
    setSelectedArtifact(undefined);
  }, [chatId, setSelectedArtifact]);

  const queryChat =
    useQuery(api.chats.queries.get, chatId !== "new" ? { chatId } : "skip") ??
    newChat;
  useEffect(() => {
    setChat(queryChat);
  }, [queryChat, setChat]);

  return (
    <>
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel className="flex flex-col gap-1 p-2 pt-4">
          <motion.div
            className="flex-1 min-h-0"
            layout
            transition={layoutTransition}
          >
            {chatId !== "new" && <ChatMessages chatId={chatId} />}
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
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={layoutTransition}
                style={{ display: 'flex', alignItems: 'stretch' }}
              >
                <ResizableHandle />
              </motion.div>
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
    </>
  );
}
