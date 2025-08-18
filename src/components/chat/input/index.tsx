import { DocumentList } from "./document-list";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { ToolBar } from "./toolbar";
import { useHandleSubmit } from "@/hooks/chats/use-chats";
import { useSetAtom, useAtomValue } from "jotai";
import {
  newChatAtom,
  selectedProjectIdAtom,
  chatAtom,
  chatIdAtom,
} from "@/store/chatStore";
import { api } from "../../../../convex/_generated/api";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { useEffect } from "react";
import { useDebouncedCallback } from "use-debounce";
import { toast } from "sonner";
import { useScroll } from "@/hooks/chats/use-scroll";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { smoothTransition } from "@/lib/motion";
import { useTextAreaRef } from "@/hooks/chats/use-textarea";
import { useUploadDocuments } from "@/hooks/chats/use-documents";
import { useState, useCallback } from "react";

export const ChatInput = () => {
  const chatId = useAtomValue(chatIdAtom);
  const { mutate: updateChatMutation } = useMutation({
    mutationFn: useConvexMutation(api.chats.mutations.update),
  });
  const setNewChat = useSetAtom(newChatAtom);
  const chat = useAtomValue(chatAtom);
  const handleSubmit = useHandleSubmit();
  const setSelectedProjectId = useSetAtom(selectedProjectIdAtom);
  const { scrollToBottom, isAtBottom } = useScroll();
  const { ref: textareaRef, setRef, focus } = useTextAreaRef();
  const [isDragActive, setIsDragActive] = useState(false);
  const handleFileUpload = useUploadDocuments({ type: "file", chat });

  useEffect(() => {
    if (chat) {
      setSelectedProjectId(chat.projectId ?? undefined);
    }
  }, [chat, setSelectedProjectId]);

  useEffect(() => {
    if (textareaRef?.current) {
      focus();
    }
  }, [chatId, focus]);

  const handleChange = useDebouncedCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (chatId !== "new") {
        updateChatMutation({
          chatId,
          updates: { text: e.target.value },
        });
      } else {
        setNewChat((prev) => ({
          ...prev,
          text: e.target.value,
        }));
      }
    },
    300,
  );

  // Handle paste events for images
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const items = e.clipboardData.items;
      const imageFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();

        // Create a FileList from the image files
        const dataTransfer = new DataTransfer();
        imageFiles.forEach((file) => dataTransfer.items.add(file));
        const fileList = dataTransfer.files;

        await handleFileUpload(fileList);
        toast.success(
          `${imageFiles.length} image${imageFiles.length > 1 ? "s" : ""} pasted and uploaded`,
        );
      }
    },
    [handleFileUpload],
  );

  // Handle drag and drop
  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragActive(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        await handleFileUpload(e.dataTransfer.files);
      }
    },
    [handleFileUpload],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!isDragActive) setIsDragActive(true);
    },
    [isDragActive],
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  return (
    <div
      className={`relative flex flex-col max-w-4xl w-full mx-auto bg-background shadow-sm outline-1 outline-border rounded-lg ${isDragActive ? "ring-2 ring-primary/60" : ""}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drag overlay */}
      {isDragActive && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 pointer-events-none rounded-lg">
          <span className="text-lg font-semibold text-white">
            Drop files to upload
          </span>
        </div>
      )}
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
      {chat && <DocumentList documentIds={chat.documents} model={chat.model} />}

      {/* Input */}
      <AutosizeTextarea
        key={chatId}
        maxHeight={192}
        minHeight={56}
        ref={setRef}
        defaultValue={chat?.text}
        className="resize-none bg-transparent ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 border-none p-2"
        onChange={(e) => {
          handleChange(e);
        }}
        onPaste={handlePaste}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();

            if (
              e.currentTarget.value.trim() === "" &&
              chat?.documents.length === 0
            ) {
              toast.error("Please enter a message before sending");
              return;
            }

            if (textareaRef?.current && chat) {
              handleSubmit(chat);
            }
          }
        }}
        placeholder="Type a message..."
      />

      {chat && <ToolBar />}
    </div>
  );
};
