import { useState, useEffect, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserMessage } from "./user-message";
import { AiMessage } from "./ai-message";
import { UtilsBar } from "./utils-bar";
import type { NavigateBranch } from "@/hooks/chats/use-messages";
import type { groupMessages } from "../../../../convex/chatMessages/helpers";
import {
  messageListVariants,
  chatMessageVariants,
  springTransition,
} from "@/lib/motion";
import { useAtomValue } from "jotai";
import { userMessageModelPopoverOpenAtom } from "@/store/chatStore";

type MessageGroup = ReturnType<typeof groupMessages>[0];

export const MessagesList = memo(
  ({
    navigateBranch,
    groupedMessages,
  }: {
    navigateBranch: NavigateBranch;
    groupedMessages: MessageGroup[];
  }) => {
    const [editingMessageId, setEditingMessageId] = useState<string | null>(
      null
    );
    const [editedText, setEditedText] = useState("");
    const userMessageModelPopoverOpen = useAtomValue(
      userMessageModelPopoverOpenAtom
    );

    useEffect(() => {
      if (editingMessageId) {
        const messageToEdit = groupedMessages?.find(
          (g) => g.input.message._id === editingMessageId
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
                <div
                  className={`opacity-0 group-hover:opacity-100 transition-opacity ${
                    userMessageModelPopoverOpen ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <UtilsBar
                    item={group.input}
                    isEditing={editingMessageId === group.input.message._id}
                    setEditing={setEditingMessageId}
                    editedText={editedText}
                    onDone={onDone}
                    navigateBranch={navigateBranch!}
                    groupedMessages={groupedMessages}
                  />
                </div>
              </div>
              <div className="group flex flex-col gap-1">
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
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <UtilsBar
                      item={group.input}
                      isAI={true}
                      navigateBranch={navigateBranch!}
                      groupedMessages={groupedMessages}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    );
  }
);

MessagesList.displayName = "MessagesList";
