import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { UserMessage } from "./user-message";
import { AiMessage } from "./ai-message";
import { UtilsBar } from "./utils-bar";
import {
  messageListVariants,
  chatMessageVariants,
  springTransition,
} from "@/lib/motion";
import { useAtomValue } from "jotai";
import { groupedMessagesAtom } from "@/store/chatStore";
import { ChevronUp, ChevronDown } from "lucide-react";

export const MessagesList = () => {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(
    null,
  );
  const [editedText, setEditedText] = useState("");
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
            className="flex flex-col gap-1"
          >
            <div className="group flex flex-col gap-1 max-w-[80%] self-end">
              <UserMessage
                item={group.input}
                isEditing={editingMessageId === group.input.message._id}
                editedText={editedText}
                setEditedText={setEditedText}
              />
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <UtilsBar
                  item={group.input}
                  isEditing={editingMessageId === group.input.message._id}
                  setEditing={setEditingMessageId}
                  editedText={editedText}
                  onDone={onDone}
                  groupedMessages={groupedMessages}
                />
              </div>
            </div>
            {/* Add open/closed state for AI response group */}
            {(() => {
              const [open, setOpen] = useState(true);
              return (
                <div className={`flex flex-col gap-1 group relative${open ? '' : ' opacity-50'}`}>
                  {/* Chevron toggle button at top left, outside the animated group */}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setOpen(prev => !prev);
                    }}
                    className={`z-10 p-1 bg-background/80 rounded-full hover:bg-accent transition-colors
                      absolute top-0 left-0 transform -translate-x-[2rem] ${open ? 'opacity-0' : 'opacity-100'}
                      group-hover:opacity-100
                      group-hover:bg-background/80
                      group-hover:hover:bg-accent
                      group-hover:hover:bg-accent
                      `}
                    aria-label={open ? "Collapse" : "Expand"}
                  >
                    {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        key="ai-group"
                        data-slot="ai-response-group"
                        initial="collapsed"
                        animate="open"
                        exit="collapsed"
                        variants={{
                          open: { opacity: 1, height: "auto" },
                          collapsed: { opacity: 0, height: 0 },
                        }}
                        transition={{ duration: 0.2, ease: [0.04, 0.62, 0.23, 0.98] }}
                        className="overflow-hidden"
                      >
                        <div className="flex flex-col gap-1">
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
                                groupedMessages={groupedMessages}
                              />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })()}
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};
