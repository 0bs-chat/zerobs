import { DocumentList } from "./document-list";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { api } from "../../../../convex/_generated/api";
import { useParams } from "@tanstack/react-router";
import { useQuery, useMutation } from "convex/react";
import type { Id } from "convex/_generated/dataModel";
import { useDebouncedCallback } from "use-debounce";
import { ToolBar } from "./toolbar";
import { useHandleSubmit } from "@/hooks/chats/use-chats";
import { useAtom, useSetAtom } from "jotai";
import { chatInputTextAtom } from "@/store/chatStore";
import { useEffect, useRef } from "react";
import { chatProjectIdAtom } from "@/store/chatStore";

export const ChatInput = () => {
  const params = useParams({ from: "/chat_/$chatId/" });
  const chatId = params.chatId as Id<"chats"> | "new";
  const chatInput = useQuery(api.chatInputs.queries.get, { chatId });
  const updateChatInputMutation = useMutation(api.chatInputs.mutations.update);
  const handleSubmit = useHandleSubmit();
  const [chatInputText, setChatInputText] = useAtom(chatInputTextAtom);
  const loadedChatId = useRef<string | undefined>(undefined);
  const setChatProjectId = useSetAtom(chatProjectIdAtom);

  const debouncedUpdateChatInput = useDebouncedCallback(
    (text: string) => {
      updateChatInputMutation({ chatId, updates: { text } });
    },
    300,
    { leading: false }
  );

  useEffect(() => {
    if (
      (chatInput && loadedChatId.current !== chatId) ||
      chatInput?.text === ""
    ) {
      setChatInputText(chatInput.text ?? "");
      loadedChatId.current = chatId;
    }
  }, [chatId, chatInput, setChatInputText]);

  setChatProjectId(chatInput?.projectId ?? undefined);

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
        maxHeight={192}
        minHeight={56}
        value={chatInputText}
        className="resize-none bg-transparent ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 border-none p-2"
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
          setChatInputText(e.target.value);
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
