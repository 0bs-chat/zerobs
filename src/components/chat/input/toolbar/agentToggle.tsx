import { Toggle } from "@/components/ui/toggle";
import { BotIcon } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useAtom } from "jotai";
import { newChatAtom } from "@/store/chatStore";

export const AgentToggle = ({
  chatId,
  agentMode,
}: {
  chatId: Id<"chats">;
  agentMode: boolean;
}) => {
  const [newChat, setNewChat] = useAtom(newChatAtom);
  const updateChatMutation = useMutation(api.chats.mutations.update);

  return (
    <Toggle
      variant="outline"
      className="hover:transition hover:duration-500"
      pressed={agentMode}
      onPressedChange={() => {
        if (chatId === "new") {
          setNewChat({ ...newChat, agentMode: !newChat.agentMode });
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
