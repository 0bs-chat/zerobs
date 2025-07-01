import { Toggle } from "@/components/ui/toggle";
import { BrainIcon } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useAtom } from "jotai";
import { chatAtom } from "@/store/chatStore";

export const PlannerToggle = ({
  chatId,
  plannerMode,
  isNewChat,
}: {
  chatId: Id<"chats">;
  plannerMode?: boolean;
  isNewChat: boolean;
}) => {
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const [chatInput, setChatInput] = useAtom(chatAtom);
  return (
    <Toggle
      variant="outline"
      className="hover:transition hover:duration-500"
      pressed={plannerMode}
      onPressedChange={() => {
        if (isNewChat) {
          setChatInput({ ...chatInput, plannerMode: !chatInput.plannerMode });
        } else {
          updateChatMutation({
            chatId,
            updates: {
              plannerMode: !plannerMode,
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
