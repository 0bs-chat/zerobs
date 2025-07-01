import { Toggle } from "@/components/ui/toggle";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { FileIcon } from "lucide-react";

export const ArtifactsToggle = ({
  chatId,
  artifacts,
}: {
  chatId: Id<"chats">;
  artifacts?: boolean;
}) => {
  const updateChatMutation = useMutation(api.chats.mutations.update);

  return (
    <Toggle
      variant="outline"
      className="hover:transition hover:duration-500"
      pressed={artifacts ?? false}
      onPressedChange={() => {
        updateChatMutation({
          chatId,
          updates: {
            artifacts: !artifacts,
          },
        });
      }}
    >
      <FileIcon className="h-4 w-4" />
      Artifacts
    </Toggle>
  );
};
