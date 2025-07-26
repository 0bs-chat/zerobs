import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserMessage } from "./user-message";
import { UserUtilsBar } from "./utils-bar";
import {
  messageListVariants,
  chatMessageVariants,
  springTransition,
} from "@/lib/motion";
import { useAtomValue } from "jotai";
import { groupedMessagesAtom } from "@/store/chatStore";
import { AiResponseGroup } from "./ai-response-group";
import type { Id } from "../../../../convex/_generated/dataModel";

export const MessagesList = () => {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const [editedDocuments, setEditedDocuments] = useState<Id<"documents">[]>([]);
  const groupedMessages = useAtomValue(groupedMessagesAtom);

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
        const documentIds = Array.isArray(content)
          ? content
              .filter((c) => c.type === "file")
              .map((c) => (c as any).file.file_id as Id<"documents">)
          : [];
        setEditedText(textContent);
        setEditedDocuments(documentIds);
      }
    }
  }, [editingMessageId, groupedMessages]);

  const onDone = () => {
    setEditingMessageId(null);
    setEditedText("");
    setEditedDocuments([]);
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
            className="flex flex-col gap-1"
          >
            <div className="group flex flex-col gap-1 max-w-[80%] self-end">
              <UserMessage
                item={group.input}
                isEditing={editingMessageId === group.input.message._id}
                editedText={editedText}
                setEditedText={setEditedText}
                editedDocuments={editedDocuments}
                setEditedDocuments={setEditedDocuments}
              />
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <UserUtilsBar
                  input={group.input}
                  isEditing={editingMessageId === group.input.message._id}
                  setEditing={setEditingMessageId}
                  editedText={editedText}
                  editedDocuments={editedDocuments}
                  onDone={onDone}
                />
              </div>
            </div>
            <AiResponseGroup group={group} />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};
