import { Toggle } from "@/components/ui/toggle";
import { Network } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useAtom } from "jotai";
import { newChatConductorModeAtom } from "@/store/chatStore";
import { motion } from "motion/react";
import { buttonHover, smoothTransition } from "@/lib/motion";
import React from "react";

export const ConductorToggle = React.memo(
  ({ chatId }: { chatId: Id<"chats"> }) => {
    const [newChatConductorMode, setNewChatConductorMode] = useAtom(
      newChatConductorModeAtom
    );
    const chat = useQuery(
      api.chats.queries.get,
      chatId !== undefined ? { chatId } : "skip"
    );
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
          pressed={chat?.conductorMode ?? newChatConductorMode}
          onPressedChange={() => {
            if (
              chat?._id === undefined ||
              chat?._id === null ||
              chat?._id === ""
            ) {
              setNewChatConductorMode(!newChatConductorMode);
            } else {
              updateChatMutation({
                chatId: chat?._id,
                updates: {
                  conductorMode: !chat?.conductorMode,
                },
              });
            }
          }}
        >
          <motion.div
            animate={{
              scale: newChatConductorMode ? 1.1 : 1,
            }}
            transition={{ duration: 0.3 }}
          >
            <Network className="h-4 w-4" />
          </motion.div>
          Conductor
        </Toggle>
      </motion.div>
    );
  }
);
