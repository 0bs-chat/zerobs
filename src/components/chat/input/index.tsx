import { DocumentList } from "./document-list";
import {
  AutosizeTextarea,
  type AutosizeTextAreaRef,
} from "@/components/ui/autosize-textarea";
import { ToolBar } from "./toolbar";
import { useHandleSubmit } from "@/hooks/chats/use-chats";
import { useAtom, useSetAtom } from "jotai";
import { newChatAtom, selectedProjectIdAtom } from "@/store/chatStore";
import { api } from "../../../../convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import { useEffect, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";
import { toast } from "sonner";
import { useParams } from "@tanstack/react-router";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useScroll } from "@/hooks/chats/use-scroll";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { fadeInUp, smoothTransition } from "@/lib/motion";

export const ChatInput = () => {
  const params = useParams({ from: "/chat/$chatId/" });
  const chatId = params.chatId as Id<"chats">;
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const textareaRef = useRef<AutosizeTextAreaRef>(null);
  const [newChat, setNewChat] = useAtom(newChatAtom);
  const handleSubmit = useHandleSubmit();
  const setSelectedProjectId = useSetAtom(selectedProjectIdAtom);
  const { scrollToBottom, isAtBottom } = useScroll();

  const chat =
    useQuery(api.chats.queries.get, chatId !== "new" ? { chatId } : "skip") ??
    newChat;

  setSelectedProjectId(chat.projectId ?? undefined);

  useEffect(() => {
    textareaRef?.current?.textArea.focus();
  }, [chatId]);

  // Debounced draft saving (separate from UI updates)
  const debouncedSaveDraft = useDebouncedCallback((text: string) => {
    updateChatMutation({
      chatId,
      updates: { text },
    });
  }, 300);

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
          id="chatInputText"
          maxHeight={192}
          minHeight={56}
          ref={textareaRef}
          defaultValue={chat.text}
          className="resize-none bg-transparent ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 border-none p-2"
          onChange={(e) => {
            setNewChat((prev) => ({
              ...prev,
              text: e.target.value,
            }));
            if (chatId !== "new") {
              debouncedSaveDraft(e.target.value);
            }
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

              if (textareaRef?.current) {
                handleSubmit(chat, textareaRef);
              }
            }
          }}
          placeholder="Type a message..."
        />
      </motion.div>

      <ToolBar chat={chat} textareaRef={textareaRef} />
    </motion.div>
  );
};
