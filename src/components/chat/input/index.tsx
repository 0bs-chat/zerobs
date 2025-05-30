import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { useQuery } from "convex-helpers/react/cache";
import { api } from "../../../../convex/_generated/api";
import { useParams } from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useDebouncedCallback } from "use-debounce";
import { DocumentList } from "./document-list";
import { Toolbar } from "./toolbar";

export const ChatInput = () => {
  const params = useParams({ strict: false });
  const chatId: Id<"chats"> | "new" = params.chatId ? (params.chatId as Id<"chats">) : "new";

  const chatInput = useQuery(api.chatInput.queries.get, {
    chatId: chatId as Id<"chats"> | "new",
  });

  const updateChatInput = useMutation(api.chatInput.mutations.update);

  const debouncedUpdate = useDebouncedCallback((value: string) => {
    updateChatInput({
      chatId: chatId as Id<"chats"> | "new",
      updates: { text: value },
    });
  }, 500);

  const handleRemoveDocument = (documentId: Id<"documents">) => {
    if (!chatInput?.documents) return;
    updateChatInput({
      chatId: chatId as Id<"chats"> | "new",
      updates: {
        documents: chatInput.documents.filter((id) => id !== documentId),
      },
    });
  };

  return (
    <div className="flex flex-col max-w-4xl w-full mx-auto items-center bg-muted rounded-lg">
      {/* Document List (Shadcn Scroll Area) */}
      <DocumentList
        documentIds={chatInput?.documents}
        onRemove={handleRemoveDocument}
      />

      {/* Input */}
      <AutosizeTextarea
        minHeight={56}
        maxHeight={192}
        className="resize-none bg-transparent ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 border-none p-4"
        defaultValue={chatInput?.text}
        onChange={(e) => debouncedUpdate(e.target.value)}
        placeholder="Type a message..."
      />

      {/* Toolbar */}
      <Toolbar />
    </div>
  );
};
