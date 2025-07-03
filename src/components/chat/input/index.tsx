import { DocumentList } from "./document-list";
import { AutosizeTextarea } from "@/components/ui/autosize-textarea";
import { ToolBar } from "./toolbar";
import { useChatState, useHandleSubmit } from "@/hooks/chats/use-chats";
import { useRef } from "react";
import { useDebouncedCallback } from "use-debounce";
import { toast } from "sonner";

export const ChatInput = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const handleSubmit = useHandleSubmit();
  const { data, save } = useChatState();

  const debouncedSaveDraft = useDebouncedCallback((text: string) => {
    if (data) {
      save({ text });
    }
  }, 300);

  return (
    <div className="flex flex-col max-w-4xl w-full mx-auto bg-muted rounded-lg">
      {/* Document List */}
      <DocumentList documentIds={data?.documents} />

      {/* Input */}
      <AutosizeTextarea
        id="chatInputText"
        defaultValue={data?.text}
        minHeight={56}
        maxHeight={192}
        ref={textareaRef}
        className="resize-none bg-transparent  ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 border-none p-2"
        onChange={(e) => {
          debouncedSaveDraft(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();

            const enteredText = textareaRef.current?.value;

            if (!enteredText || enteredText.trim() === "") {
              toast.error("Please enter a message");
              return;
            }
            handleSubmit();
            if (textareaRef.current) {
              textareaRef.current.value = "";
            }
          }
        }}
        placeholder="Type a message..."
      />

      <ToolBar />
    </div>
  );
};
