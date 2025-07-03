import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Globe2Icon } from "lucide-react";
import { useChatState } from "@/hooks/chats/use-chats";

export const WebSearchToggle = ({ webSearch }: { webSearch?: boolean }) => {
  const { data, save } = useChatState();
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Toggle
          variant="outline"
          className={`hover:transition hover:duration-500 ${webSearch ? "bg-accent text-accent-foreground" : ""}`}
          aria-pressed={webSearch ?? false}
          pressed={webSearch ?? false}
          onPressedChange={() => {
            save({ webSearch: !data?.webSearch });
          }}
        >
          <Globe2Icon className="h-4 w-4" />
        </Toggle>
      </TooltipTrigger>
      <TooltipContent>
        <p>Search the web</p>
      </TooltipContent>
    </Tooltip>
  );
};
