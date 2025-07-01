import { DocumentList } from "./document-list";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { ToolBar } from "./toolbar";
import { useHandleSubmit } from "@/hooks/chats/use-chats";
import { useAtom } from "jotai";
import { newChatAtom } from "@/store/chatStore";
import { api } from "../../../../convex/_generated/api";
import { useQuery, useMutation } from "convex/react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useEffect, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";
import { toast } from "sonner";

type ChatProps = {
  chatId?: Id<"chats">;
};

export const ChatInput = ({ chatId }: ChatProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const [newChat, setNewChat] = useAtom(newChatAtom);

  const chat = useQuery(
    api.chats.queries.get,
    chatId ? { chatId } : "skip"
  ) ?? newChat;

  // Load initial text including any saved draft
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value = chat.text;
    }
  }, [chatId, chat.text]);

  // Debounced draft saving (separate from UI updates)
  const debouncedSaveDraft = useDebouncedCallback((text: string) => {
    if (chatId) {
      updateChatMutation({
        chatId,
        updates: { text },
      });
    } else {
      setNewChat((prev) => ({
        ...prev,
        text,
      }));
    }
  }, 300);


  return (
    <div className="flex flex-col max-w-4xl w-full mx-auto bg-muted rounded-lg">
      {/* Document List */}
      <DocumentList
        documentIds={chat.documents}
        model={chat.model}
      />

      {/* Input */}
      <AutosizeTextarea
        id="chatInputText"
        maxHeight={192}
        minHeight={56}
        defaultValue={chat.text}
        ref={textareaRef}
        className="resize-none bg-transparent ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 border-none p-2"
        onChange={(e) => debouncedSaveDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
    
            const enteredText = textareaRef.current?.value;
    
            if (!enteredText || enteredText.trim() === "") {
              toast.error("Please enter a message");
              return;
            }
    
            useHandleSubmit(chatId!);
    
            if (textareaRef.current) {
              textareaRef.current.value = "";
            }
          }
        }}
        placeholder="Type a message..."
      />

      <ToolBar
        chat={chat}
      />
    </div>
  );
};
