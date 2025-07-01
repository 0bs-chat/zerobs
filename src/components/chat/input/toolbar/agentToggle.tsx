import { Toggle } from "@/components/ui/toggle";
import { BotIcon } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useAtom } from "jotai";
import { chatAtom } from "@/store/chatStore";

export const AgentToggle = ({
  chatId,
  agentMode,
  isNewChat,
}: {
  chatId: Id<"chats">;
  agentMode: boolean;
  isNewChat: boolean;
}) => {
  const [chatInput, setChatInput] = useAtom(chatAtom);
  const updateChatMutation = useMutation(api.chats.mutations.update);

  return (
    <Toggle
      variant="outline"
      className="hover:transition hover:duration-500"
      pressed={agentMode}
      onPressedChange={() => {
        if (isNewChat) {
          setChatInput({ ...chatInput, agentMode: !chatInput.agentMode });
        } else {
          updateChatMutation({
            chatId,
            updates: { agentMode: !agentMode },
          });
        }
      }}
    >
      <BotIcon className="h-4 w-4" />
      Agent
    </Toggle>
  );
};
