import { DocumentList } from "./document-list";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { ToolBar } from "./toolbar";
import { useHandleSubmit } from "@/hooks/chats/use-chats";
import { useAtom } from "jotai";
import { chatInputAtom, type ChatInputState } from "@/store/chatStore";
import { api } from "convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import type { Id } from "convex/_generated/dataModel";
import { useCallback, useState, useEffect, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";
import { toast } from "sonner";

type ChatInputProps = {
  isNewChat: boolean;
  chatId: Id<"chats">;
};

export const ChatInput = ({ isNewChat, chatId }: ChatInputProps) => {
  const [chatInput] = useAtom(chatInputAtom);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const updateChatInputMutation = useMutation(api.chatInputs.mutations.update);

  const existingChatInput = useQuery(
    api.chatInputs.queries.get,
    !isNewChat && chatId ? { chatId } : "skip"
  );

  const chatInputData: ChatInputState =
    isNewChat || !existingChatInput
      ? chatInput
      : (existingChatInput as ChatInputState);

  // Load initial text including any saved draft
  useEffect(() => {
    if (textareaRef.current) {
      const newText =
        isNewChat || !existingChatInput
          ? chatInput.text
          : (existingChatInput?.text ?? "");
      textareaRef.current.value = newText;
    }
  }, [chatId, isNewChat, chatInput.text, existingChatInput?.text]);

  // Debounced draft saving (separate from UI updates)
  const debouncedSaveDraft = useDebouncedCallback((text: string) => {
    if (!isNewChat && chatId) {
      updateChatInputMutation({
        chatId,
        updates: { text },
      });
    }
  }, 1000);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    debouncedSaveDraft(e.target.value);
  };

  const handleSubmit = useHandleSubmit(isNewChat, chatId);

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();

        const enteredText = textareaRef.current?.value;

        if (!enteredText || enteredText.trim() === "") {
          toast.error("Please enter a message");
          return;
        }

        handleSubmit(enteredText);

        if (textareaRef.current) {
          textareaRef.current.value = "";
        }
      }
    },
    [handleSubmit]
  );

  return (
    <div className="flex flex-col max-w-4xl w-full mx-auto bg-muted rounded-lg">
      {/* Document List */}
      <DocumentList
        documentIds={
          isNewChat ? chatInput.documents : (existingChatInput?.documents ?? [])
        }
        model={isNewChat ? chatInput.model : (existingChatInput?.model ?? "")}
      />

      {/* Input */}
      <AutosizeTextarea
        id="chatInputText"
        maxHeight={192}
        minHeight={56}
        defaultValue={
          isNewChat ? chatInput.text : (existingChatInput?.text ?? "")
        }
        ref={textareaRef}
        className="resize-none bg-transparent ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 border-none p-2"
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
      />

      <ToolBar isNewChat={isNewChat} chatInputData={chatInputData} />
    </div>
  );
};
