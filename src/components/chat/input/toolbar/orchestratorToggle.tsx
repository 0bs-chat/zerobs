import { Toggle } from "@/components/ui/toggle";
import { Binoculars } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useSetAtom } from "jotai";
import { newChatAtom } from "@/store/chatStore";

export const OrchestratorToggle = ({
  chatId,
  orchestratorMode,
}: {
  chatId: Id<"chats">;
  orchestratorMode?: boolean;
}) => {
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const setNewChat = useSetAtom(newChatAtom);
  return (
    <Toggle
      variant="outline"
      className="hover:transition hover:duration-500"
      pressed={orchestratorMode}
      onPressedChange={() => {
        if (chatId === "new") {
          setNewChat((prev) => ({
            ...prev,
            orchestratorMode: !prev.orchestratorMode,
          }));
        } else {
          updateChatMutation({
            chatId,
            updates: {
              orchestratorMode: !orchestratorMode,
            },
          });
        }
      }}
    >
      <Binoculars className="h-4 w-4" />
      Orchestrator
    </Toggle>
  );
};
