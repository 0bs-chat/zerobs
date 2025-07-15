import { Toggle } from "@/components/ui/toggle";
import { Binoculars } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useAtom } from "jotai";
import { newChatOrchestratorModeAtom } from "@/store/chatStore";
import { motion } from "motion/react";
import { buttonHover, smoothTransition } from "@/lib/motion";
import { memo } from "react";

export const OrchestratorToggle = memo(
  ({ chatId }: { chatId: Id<"chats"> }) => {
    const updateChatMutation = useMutation(api.chats.mutations.update);
    const [newChatOrchestratorMode, setNewChatOrchestratorMode] = useAtom(
      newChatOrchestratorModeAtom
    );
    const chat = useQuery(
      api.chats.queries.get,
      chatId !== undefined ? { chatId } : "skip"
    );
    return (
      <motion.div
        variants={buttonHover}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
        transition={smoothTransition}
      >
        <Toggle
          variant="outline"
          className="transition-all duration-300"
          pressed={chat?.orchestratorMode ?? newChatOrchestratorMode}
          onPressedChange={() => {
            if (
              chat?._id === undefined ||
              chat?._id === null ||
              chat?._id === ""
            ) {
              setNewChatOrchestratorMode(!newChatOrchestratorMode);
            } else {
              updateChatMutation({
                chatId: chat?._id,
                updates: {
                  orchestratorMode: !chat?.orchestratorMode,
                },
              });
            }
          }}
        >
          <motion.div
            animate={{ scale: newChatOrchestratorMode ? 1.1 : 1 }}
            transition={{ duration: 0.2 }}
          >
            <Binoculars className="h-4 w-4" />
          </motion.div>
          Orchestrator
        </Toggle>
      </motion.div>
    );
  }
);
