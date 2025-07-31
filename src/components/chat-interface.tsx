import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Panel } from "@/components/chat/panels";
import { DocumentDialog } from "@/components/document-dialog";
import { CreateProjectDialog } from "@/components/create-project-dialog";
import { useAtomValue } from "jotai";
import { resizePanelOpenAtom } from "@/store/chatStore";
import { motion, AnimatePresence } from "motion/react";
import { slideInFromRight, layoutTransition } from "@/lib/motion";

export function ChatInterface({ children }: { children: React.ReactNode }) {
  const resizePanelOpen = useAtomValue(resizePanelOpenAtom);

  return (
    <>
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel className="flex flex-col gap-1 p-2 pt-4">
          {children}
        </ResizablePanel>
        <AnimatePresence mode="popLayout">
          {resizePanelOpen && (
            <>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={layoutTransition}
                style={{ display: "flex", alignItems: "stretch" }}
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
