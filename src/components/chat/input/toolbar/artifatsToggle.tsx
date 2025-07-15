import { Toggle } from "@/components/ui/toggle";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { FileIcon } from "lucide-react";
import { newChatArtifactsAtom } from "@/store/chatStore";
import { useAtom } from "jotai";
import { motion } from "motion/react";
import { buttonHover, smoothTransition } from "@/lib/motion";
import { memo } from "react";

export const ArtifactsToggle = memo(({ chatId }: { chatId: Id<"chats"> }) => {
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const [newChatArtifacts, setNewChatArtifacts] = useAtom(newChatArtifactsAtom);

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
        pressed={chat?.artifacts ?? newChatArtifacts}
        onPressedChange={() => {
          if (
            chat?._id === undefined ||
            chat?._id === null ||
            chat?._id === ""
          ) {
            setNewChatArtifacts(!newChatArtifacts);
          } else {
            updateChatMutation({
              chatId: chat?._id,
              updates: {
                artifacts: !chat?.artifacts,
              },
            });
          }
        }}
      >
        <motion.div
          animate={{
            scale: newChatArtifacts ? 1.1 : 1,
            y: newChatArtifacts ? -2 : 0,
          }}
          transition={{ duration: 0.2 }}
        >
          <FileIcon className="h-4 w-4" />
        </motion.div>
        Artifacts
      </Toggle>
    </motion.div>
  );
});
