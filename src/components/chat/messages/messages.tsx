import { motion, AnimatePresence } from "motion/react";
import { UserMessage } from "./user-message";
import {
  messageListVariants,
  chatMessageVariants,
  springTransition,
} from "@/lib/motion";
import { useAtomValue } from "jotai";
import { groupedMessagesAtom } from "@/store/chatStore";
import { AiMessage } from "./ai-message";

export const MessagesList = () => {
  const groupedMessages = useAtomValue(groupedMessagesAtom);

  return (
    <motion.div
      variants={messageListVariants}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-1"
    >
      <AnimatePresence mode="popLayout">
        {groupedMessages?.map((group) => (
          <motion.div
            key={group.input.message._id}
            variants={chatMessageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springTransition}
            className="flex flex-col gap-1"
          >
            <UserMessage
              item={group.input}
              groupedMessages={groupedMessages}
            />
            <AiMessage group={group} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};
