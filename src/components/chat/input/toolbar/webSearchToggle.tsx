import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Globe2Icon } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { newChatAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";

export const WebSearchToggle = ({
  chatId,
  webSearch,
}: {
  chatId: Id<"chats">;
  webSearch?: boolean;
}) => {
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const setNewChat = useSetAtom(newChatAtom);
  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <Toggle
          variant="outline"
          className={`hover:transition hover:duration-500 ${webSearch ? "bg-accent text-accent-foreground" : ""}`}
          aria-pressed={webSearch ?? false}
          pressed={webSearch ?? false}
          onPressedChange={() => {
            if (chatId === "new") {
              setNewChat((prev) => ({ ...prev, webSearch: !prev.webSearch }));
            } else {
              updateChatMutation({
                chatId,
                updates: {
                  webSearch: !webSearch,
                },
              });
            }
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
