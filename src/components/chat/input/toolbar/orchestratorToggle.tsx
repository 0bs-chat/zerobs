import { Toggle } from "@/components/ui/toggle";
import { Binoculars } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useSetAtom } from "jotai";
import { newChatAtom } from "@/store/chatStore";
import { motion } from "motion/react";
import { buttonHover, smoothTransition } from "@/lib/motion";

export const OrchestratorToggle = ({
  chatId,
  orchestratorMode,
}: {
  chatId: Id<"chats">;
  orchestratorMode?: boolean;
}) => {
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const setNewChat = useSetAtom(newChatAtom);
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
        pressed={orchestratorMode}
        onPressedChange={() => {
          if (chatId === "new") {
            setNewChat((prev) => ({
              ...prev,
              orchestratorMode: !prev.orchestratorMode,
            }));
          } else {
            updateChatMutation({
              chatId,
              updates: {
                orchestratorMode: !orchestratorMode,
              },
            });
          }
        }}
      >
        <motion.div
          animate={{ scale: orchestratorMode ? 1.1 : 1 }}
          transition={{ duration: 0.2 }}
        >
          <Binoculars className="h-4 w-4" />
        </motion.div>
        Orchestrator
      </Toggle>
    </motion.div>
  );
};
