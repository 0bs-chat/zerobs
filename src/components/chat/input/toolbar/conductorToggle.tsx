import { Toggle } from "@/components/ui/toggle";
import { Network } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useSetAtom } from "jotai";
import { chatAtom } from "@/store/chatStore";

export const ConductorToggle = ({
  isNewChat,
  chatId,
  conductorMode,
}: {
  chatId: Id<"chats">;
  isNewChat: boolean;
  conductorMode: boolean;
}) => {
  const setNewChat = useSetAtom(chatAtom);
  const updateChatMutation = useMutation(api.chats.mutations.update);

  return (
    <Toggle
      variant="outline"
      className="hover:transition hover:duration-500"
      pressed={conductorMode}
      onPressedChange={() => {
        if (chatId === "new") {
          setNewChat((prev: any) => ({
            ...prev,
            conductorMode: !prev.conductorMode,
          }));
        } else {
          updateChatMutation({
            chatId,
            updates: { conductorMode: !conductorMode },
          });
        }
      }}
    >
      <Network className="h-4 w-4" />
      Conductor
    </Toggle>
  );
};
