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

export const ChatInput = () => {
  const params = useParams({ from: "/chat_/$chatId/" });
  const chatId = params.chatId as Id<"chats">;
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const textareaRef = useRef<AutosizeTextAreaRef>(null);
  const [newChat, setNewChat] = useAtom(newChatAtom);
  const handleSubmit = useHandleSubmit();
  const setSelectedProjectId = useSetAtom(selectedProjectIdAtom);

  const chat =
    useQuery(api.chats.queries.get, chatId !== "new" ? { chatId } : "skip") ??
    newChat;

  setSelectedProjectId(chat.projectId ?? undefined);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.textArea.value = chat.text;
      textareaRef.current.textArea.focus();
    }
  }, [chatId]);

  // Debounced draft saving (separate from UI updates)
  const debouncedSaveDraft = useDebouncedCallback((text: string) => {
    updateChatMutation({
      chatId,
      updates: { text },
    });
  }, 300);

  useEffect(() => {
    setNewChat((prev) => ({
      ...prev,
      text: chat.text,
    }));
  }, [chatId]);

  return (
    <div className="flex flex-col max-w-4xl w-full mx-auto bg-muted rounded-lg">
      {/* Document List */}
      <DocumentList documentIds={chat.documents} model={chat.model} />

      {/* Input */}
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

            if (textareaRef.current) {
              textareaRef.current.textArea.value = "";
            }
            handleSubmit(chat);
          }
        }}
        placeholder="Type a message..."
      />

      <ToolBar chat={chat} />
    </div>
  );
};
