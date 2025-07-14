import { DocumentList } from "./document-list";
import {
  AutosizeTextarea,
  type AutosizeTextAreaRef,
} from "@/components/ui/autosize-textarea";
import { ToolBar } from "./toolbar";
import { useHandleSubmit } from "@/hooks/chats/use-chats";
import { useAtom } from "jotai";
import { newChatDocumentsAtom, newChatTextAtom } from "@/store/chatStore";
import { api } from "../../../../convex/_generated/api";
import { useMutation } from "convex/react";
import { useRef, type RefObject } from "react";
import { useDebouncedCallback } from "use-debounce";
import { toast } from "sonner";
import { useParams } from "@tanstack/react-router";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useScroll } from "@/hooks/chats/use-scroll";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { smoothTransition } from "@/lib/motion";

export const ChatInput = () => {
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats">;
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const textareaRef = useRef<AutosizeTextAreaRef>(null);
  const handleSubmit = useHandleSubmit();
  const { scrollToBottom, isAtBottom } = useScroll();

  const [newChatText, setNewChatText] = useAtom(newChatTextAtom);
  const [newChatDocuments] = useAtom(newChatDocumentsAtom);

  const debouncedUpdateChatMutation = useDebouncedCallback((text: string) => {
    updateChatMutation({
      chatId,
      updates: { text },
    });
  }, 300);

  return (
    <div className="relative flex flex-col max-w-4xl w-full mx-auto bg-muted rounded-lg">
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
      <DocumentList documentIds={newChatDocuments} />

      {/* Input */}
      <div>
        <AutosizeTextarea
          key={chatId}
          maxHeight={192}
          minHeight={56}
          ref={textareaRef}
          defaultValue={newChatText}
          className="resize-none bg-transparent ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 border-none p-2"
          onChange={(e) => {
            if (chatId === undefined || chatId === null || chatId === "") {
              setNewChatText(e.target.value);
            } else {
              if (textareaRef?.current) {
                debouncedUpdateChatMutation(textareaRef.current.textArea.value);
              }
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();

              if (textareaRef?.current?.textArea.value.trim() === "") {
                toast.error("Please enter a message before sending");
                return;
              }
              handleSubmit(
                chatId,
                textareaRef as RefObject<AutosizeTextAreaRef>
              );
            }
          }}
          placeholder="Type a message..."
        />
      </div>

      <ToolBar textareaRef={textareaRef as RefObject<AutosizeTextAreaRef>} />
    </div>
  );
};
