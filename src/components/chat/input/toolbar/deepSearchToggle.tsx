import { Toggle } from "@/components/ui/toggle";
import { Binoculars } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useSetAtom } from "jotai";
import { newChatAtom } from "@/store/chatStore";

export const DeepSearchToggle = ({
  chatId,
  deepSearchMode,
}: {
  chatId: Id<"chats">;
  deepSearchMode?: boolean;
}) => {
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const setNewChat = useSetAtom(newChatAtom);
  return (
    <Toggle
      variant="outline"
      className="hover:transition hover:duration-500"
      pressed={deepSearchMode}
      onPressedChange={() => {
        if (chatId === "new") {
          setNewChat((prev) => ({ ...prev, deepSearchMode: !prev.deepSearchMode }));
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
      <Binoculars className="h-4 w-4" />
      DeepSearch
    </Toggle>
  );
}; 