import { ChatMessages } from "@/components/chat/messages";
import { ChatInput } from "@/components/chat/input/index";
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
import { useAtomValue } from "jotai";
import { resizePanelOpenAtom } from "@/store/chatStore";
import { motion, AnimatePresence } from "motion/react";
import {
  slideInFromRight,
  slideInFromLeft,
  layoutTransition,
} from "@/lib/motion";

export const ChatInterface = () => {
  const resizePanelOpen = useAtomValue(resizePanelOpenAtom);

  return <></>;
};
