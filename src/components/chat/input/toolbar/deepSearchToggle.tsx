import { Toggle } from "@/components/ui/toggle";
import { BrainIcon } from "lucide-react";
import { useChatState } from "@/hooks/chats/use-chats";

export const DeepSearchToggle = () => {
  const { save, data } = useChatState();

  return (
    <Toggle
      variant="outline"
      className="hover:transition hover:duration-500"
      pressed={data?.deepSearchMode ?? false}
      onPressedChange={() => {
        save({ deepSearchMode: !(data?.deepSearchMode ?? false) });
      }}
    >
      <BrainIcon className="h-4 w-4" />
      Deep Search
    </Toggle>
  );
};
