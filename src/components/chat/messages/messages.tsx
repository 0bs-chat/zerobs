import { memo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserMessage } from "./user-message";
import { AiMessage } from "./ai-message";
import { UtilsBar } from "./utils-bar";
import { useAtomValue } from "jotai";
import { groupedMessagesAtom } from "@/store/chatStore";
import type { NavigateBranch } from "@/hooks/chats/use-messages";
import { messageListVariants, chatMessageVariants, springTransition } from "@/lib/motion";

export const MessagesList = memo(
  ({ navigateBranch }: { navigateBranch: NavigateBranch }) => {
    const groupedMessages = useAtomValue(groupedMessagesAtom);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(
      null,
    );
    const [editedText, setEditedText] = useState("");

    useEffect(() => {
      if (editingMessageId) {
        const messageToEdit = groupedMessages?.find(
          (g) => g.input.message._id === editingMessageId,
        );
        if (messageToEdit) {
          const content = messageToEdit.input.message.message.content;
          const textContent = Array.isArray(content)
            ? ((
                content.find((c) => c.type === "text") as
                  | { type: "text"; text: string }
                  | undefined
              )?.text ?? "")
            : "";
          setEditedText(textContent);
        }
      }
    }, [editingMessageId, groupedMessages]);

    const onDone = () => {
      setEditingMessageId(null);
      setEditedText("");
    };

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
              layout
              className="flex flex-col gap-1"
            >
              <div className="group flex flex-col gap-1 max-w-[80%] self-end">
                <UserMessage
                  item={group.input}
                  isEditing={editingMessageId === group.input.message._id}
                  editedText={editedText}
                  setEditedText={setEditedText}
                />
                <motion.div 
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 0, y: 0 }}
                  whileHover={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <UtilsBar
                    item={group.input}
                    isEditing={editingMessageId === group.input.message._id}
                    setEditing={setEditingMessageId}
                    editedText={editedText}
                    onDone={onDone}
                    navigateBranch={navigateBranch!}
                  />
                </motion.div>
              </div>
              <div className="flex flex-col gap-1 group">
                {group.response.map((response, index) => {
                  return (
                    <motion.div
                      key={`${response.message._id}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, ...springTransition }}
                    >
                      <AiMessage item={response} />
                    </motion.div>
                  );
                })}
                {group.response.length > 0 && (
                  <motion.div 
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 0, y: 0 }}
                    whileHover={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <UtilsBar
                      item={group.input}
                      isAI={true}
                      navigateBranch={navigateBranch!}
                    />
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    );
  },
);

MessagesList.displayName = "MessagesList";
