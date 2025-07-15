import { createLazyFileRoute, useParams } from "@tanstack/react-router";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { selectedArtifactAtom } from "@/store/chatStore";
import { motion } from "motion/react";
import { layoutTransition } from "@/lib/motion";
import { ChatMessages } from "@/components/chat/messages";
import { ChatInput } from "@/components/chat/input";

export const Route = createLazyFileRoute("/chat/$chatId/")({
  component: RouteComponent,
});

function RouteComponent() {
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats">;
  const setSelectedArtifact = useSetAtom(selectedArtifactAtom);

  useEffect(() => {
    setSelectedArtifact(undefined);
  }, [chatId, setSelectedArtifact]);

  return (
    <>
      <motion.div
        className="flex-1 min-h-0"
        layout
        transition={layoutTransition}
      >
        <ChatMessages />
      </motion.div>
      <motion.div className="flex-none" layout transition={layoutTransition}>
        <ChatInput />
      </motion.div>
    </>
  );
}
