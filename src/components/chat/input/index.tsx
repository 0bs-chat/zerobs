import { DocumentList } from "./document-list";
import {
  AutosizeTextarea,
} from "@/components/ui/autosize-textarea";
import { ToolBar } from "./toolbar";
import { useHandleSubmit } from "@/hooks/chats/use-chats";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { newChatAtom, selectedProjectIdAtom, chatAtom, chatIdAtom } from "@/store/chatStore";
import { api } from "../../../../convex/_generated/api";
import { useMutation } from "convex/react";
import { useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";
import { toast } from "sonner";
import { useScroll } from "@/hooks/chats/use-scroll";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { fadeInUp, smoothTransition } from "@/lib/motion";
import { useTextAreaRef } from "@/hooks/chats/use-textarea";

export const ChatInput = () => {
  const chatId = useAtomValue(chatIdAtom);
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const [newChat, setNewChat] = useAtom(newChatAtom);
  const chat = (useAtomValue(chatAtom))!;
  const handleSubmit = useHandleSubmit();
  const setSelectedProjectId = useSetAtom(selectedProjectIdAtom);
  const { scrollToBottom, isAtBottom } = useScroll();
  const { ref: textareaRef, setRef, focus, setValue } = useTextAreaRef();
  setSelectedProjectId(chat.projectId ?? undefined);

  useEffect(() => {
    if (textareaRef?.current) {
      focus();
      setValue(chat.text ?? "");
    }
  }, [chat._id, focus, setValue]);

  const handleChange = useDebouncedCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setNewChat((prev) => ({
        ...prev,
        text: e.target.value,
      }));
      if (chatId !== "new") {
        updateChatMutation({
          chatId,
          updates: { text: e.target.value },
        });
      }
    },
    300,
  );

  return (
    <motion.div
      className="relative flex flex-col max-w-4xl w-full mx-auto bg-muted rounded-lg"
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      transition={smoothTransition}
    >
      <AnimatePresence>
        {!isAtBottom && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={smoothTransition}
            className="absolute top-0 right-1/2 -translate-y-10 translate-x-1/2"
          >
            <Button
              onClick={() => scrollToBottom("smooth")}
              variant="outline"
              size="sm"
              className="text-xs text-muted-foreground rounded-full"
            >
              <ArrowDown className="w-4 h-4" />
              Scroll to bottom
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document List */}
      <DocumentList documentIds={chat.documents} model={chat.model} />

      {/* Input */}
      <motion.div whileFocus={{ scale: 1.02 }} transition={smoothTransition}>
        <AutosizeTextarea
          key={chatId}
          maxHeight={192}
          minHeight={56}
          ref={setRef}
          defaultValue={chat.text}
          className="resize-none bg-transparent ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 border-none p-2"
          onChange={(e) => {
            handleChange(e);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();

              if (
                (!newChat.text || newChat.text.trim() === "") &&
                chat.documents.length === 0
              ) {
                toast.error("Please enter a message");
                return;
              }
              if (e.currentTarget.value.trim() === "") {
                toast.error("Please enter a message before sending");
                return;
              }

              if (textareaRef?.current) {
                handleSubmit(chat);
              }
            }
          }}
          placeholder="Type a message..."
        />
      </motion.div>

      <ToolBar />
    </motion.div>
  );
};
