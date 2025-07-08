import { Toggle } from "@/components/ui/toggle";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { FileIcon } from "lucide-react";
import { newChatAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";
import { motion } from "motion/react";
import { buttonHover, smoothTransition } from "@/lib/motion";

export const ArtifactsToggle = ({
  chatId,
  artifacts,
}: {
  chatId: Id<"chats">;
  artifacts?: boolean;
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
        pressed={artifacts ?? false}
        onPressedChange={() => {
          if (chatId === "new") {
            setNewChat((prev) => ({ ...prev, artifacts: !prev.artifacts }));
          } else {
            updateChatMutation({
              chatId,
              updates: {
                artifacts: !artifacts,
              },
            });
          }
        }}
      >
        <motion.div
          animate={{ 
            scale: artifacts ? 1.1 : 1,
            y: artifacts ? -2 : 0 
          }}
          transition={{ duration: 0.2 }}
        >
          <FileIcon className="h-4 w-4" />
        </motion.div>
        Artifacts
      </Toggle>
    </motion.div>
  );
};
