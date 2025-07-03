import { Toggle } from "@/components/ui/toggle";
import { Network } from "lucide-react";
import { useChatState } from "@/hooks/chats/use-chats";

export const ConductorToggle = () => {
  const { save, data } = useChatState();

  return (
    <Toggle
      variant="outline"
      className="hover:transition hover:duration-500"
      pressed={data?.conductorMode ?? false}
      onPressedChange={() => {
        save({ conductorMode: !(data?.conductorMode ?? false) });
      }}
    >
      <Network className="h-4 w-4" />
      Conductor Mode
    </Toggle>
  );
};
