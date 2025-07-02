import { Toggle } from "@/components/ui/toggle";
import { BrainIcon } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useAtom } from "jotai";
import { chatAtom } from "@/store/chatStore";

export const DeepSearchToggle = ({
  chatId,
  deepSearchMode,
  isNewChat,
}: {
  chatId: Id<"chats">;
  deepSearchMode?: boolean;
  isNewChat: boolean;
}) => {
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const [chatInput, setChatInput] = useAtom(chatAtom);
  return (
    <Toggle
      variant="outline"
      className="hover:transition hover:duration-500"
      pressed={deepSearchMode}
      onPressedChange={() => {
        if (isNewChat) {
          setChatInput({
            ...chatInput,
            deepSearchMode: !chatInput.deepSearchMode,
          });
        } else {
          updateChatMutation({
            chatId,
            updates: {
              deepSearchMode: !deepSearchMode,
            },
          });
        }
      }}
    >
      <BrainIcon className="h-4 w-4" />
      Smort
    </Toggle>
  );
};
