import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Globe2Icon } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { newChatWebSearchAtom } from "@/store/chatStore";
import { useAtom } from "jotai";
import { motion } from "motion/react";
import { buttonHover, smoothTransition } from "@/lib/motion";
import React from "react";

export const WebSearchToggle = React.memo(
  ({ chatId }: { chatId: Id<"chats"> }) => {
    const updateChatMutation = useMutation(api.chats.mutations.update);
    const [newChatWebSearch, setNewChatWebSearch] =
      useAtom(newChatWebSearchAtom);

    const chat = useQuery(
      api.chats.queries.get,
      chatId !== undefined ? { chatId } : "skip"
    );

    return (
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <motion.div
            variants={buttonHover}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            transition={smoothTransition}
          >
            <Toggle
              variant="outline"
              className={`transition-all duration-300 ${newChatWebSearch ? "bg-accent text-accent-foreground" : ""}`}
              aria-pressed={chat?.webSearch ?? newChatWebSearch}
              pressed={chat?.webSearch ?? newChatWebSearch}
              onPressedChange={() => {
                if (
                  chat?._id === undefined ||
                  chat?._id === null ||
                  chat?._id === ""
                ) {
                  setNewChatWebSearch(!newChatWebSearch);
                } else {
                  updateChatMutation({
                    chatId: chat?._id,
                    updates: {
                      webSearch: !chat?.webSearch,
                    },
                  });
                }
              }}
            >
              <motion.div
                animate={{ rotate: newChatWebSearch ? 360 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <Globe2Icon className="h-4 w-4" />
              </motion.div>
            </Toggle>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Search the web</p>
        </TooltipContent>
      </Tooltip>
    );
  }
);
