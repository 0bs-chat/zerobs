import { DocumentList } from "./document-list";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { api } from "../../../../convex/_generated/api";
import { useParams } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import type { Id } from "convex/_generated/dataModel";
import { useDebouncedCallback } from "use-debounce";
import { ToolBar } from "./toolbar";
import { useHandleSubmit } from "@/hooks/use-chats";

export const ChatInput = () => {
  const params = useParams({ from: "/chat_/$chatId/" });
  const chatId = params.chatId as Id<"chats"> | "new";
  const chatInput = useQuery(api.chatInputs.queries.get, { chatId });
  const updateChatInputMutation = useMutation(api.chatInputs.mutations.update);
  const handleSubmit = useHandleSubmit();

  const debouncedUpdateChatInput = useDebouncedCallback((text: string) => {
    if (text.trim() === "" || text === undefined) return;
    updateChatInputMutation({
      chatId: chatId,
      updates: {
        text: text,
      },
    });
  }, 300);

  return (
    <div className="flex flex-col max-w-4xl w-full mx-auto bg-muted rounded-lg">
      {/* Document List */}
      <DocumentList
        documentIds={chatInput?.documents}
        model={chatInput?.model ?? ""}
      />

      {/* Input */}
      <AutosizeTextarea
        id="chatInputText"
        minHeight={56}
        maxHeight={192}
        className="resize-none bg-transparent ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 border-none p-2"
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          debouncedUpdateChatInput(e.target.value);
        }}
        onKeyDown={async (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            await handleSubmit();
          }
        }}
        placeholder="Type a message..."
      />

      <ToolBar chatInput={chatInput} />
    </div>
  );
};
