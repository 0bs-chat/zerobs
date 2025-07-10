import { Toggle } from "@/components/ui/toggle";
import { Network } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useSetAtom } from "jotai";
import { newChatAtom } from "@/store/chatStore";
import { motion } from "motion/react";
import { buttonHover, smoothTransition } from "@/lib/motion";

export const ConductorToggle = ({
  chatId,
  conductorMode,
}: {
  chatId: Id<"chats">;
  conductorMode: boolean;
}) => {
  const setNewChat = useSetAtom(newChatAtom);
  const updateChatMutation = useMutation(api.chats.mutations.update);

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
        pressed={conductorMode}
        onPressedChange={() => {
          if (chatId === "new") {
            setNewChat((prev) => ({
              ...prev,
              conductorMode: !prev.conductorMode,
            }));
          } else {
            updateChatMutation({
              chatId,
              updates: { conductorMode: !conductorMode },
            });
          }
        }}
      >
        <motion.div
          animate={{
            scale: conductorMode ? 1.1 : 1,
          }}
          transition={{ duration: 0.3 }}
        >
          <Network className="h-4 w-4" />
        </motion.div>
        Conductor
      </Toggle>
    </motion.div>
  );
};
