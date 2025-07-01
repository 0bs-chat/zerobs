import { Toggle } from "@/components/ui/toggle";
import { BrainIcon } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useSetAtom } from "jotai";
import { newChatAtom } from "@/store/chatStore";

export const PlannerToggle = ({
  chatId,
  plannerMode,
}: {
  chatId: Id<"chats">;
  plannerMode?: boolean;
}) => {
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const setNewChat = useSetAtom(newChatAtom);
  return (
    <Toggle
      variant="outline"
      className="hover:transition hover:duration-500"
      pressed={plannerMode}
      onPressedChange={() => {
        if (chatId === "new") {
          setNewChat((prev) => ({ ...prev, plannerMode: !prev.plannerMode }));
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
