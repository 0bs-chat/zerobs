import { Toggle } from "@/components/ui/toggle";
import { FileIcon } from "lucide-react";
import { useChatState } from "@/hooks/chats/use-chats";

export const ArtifactsToggle = () => {
  const { save, data } = useChatState();

  return (
    <Toggle
      variant="outline"
      className="hover:transition hover:duration-500"
      pressed={data?.artifacts ?? false}
      onPressedChange={() => {
        save({ artifacts: !data?.artifacts });
      }}
    >
      <FileIcon className="h-4 w-4" />
      Artifacts
    </Toggle>
  );
};
