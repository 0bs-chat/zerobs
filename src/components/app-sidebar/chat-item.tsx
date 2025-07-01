import * as React from "react";
import { PinIcon, PinOffIcon, TrashIcon } from "lucide-react";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import type { Doc } from "../../../convex/_generated/dataModel";
import { chatHandlers } from "@/hooks/chats/use-chats";
import { cn } from "@/lib/utils";
import { useParams } from "@tanstack/react-router";

interface ChatItemProps {
  chat: Doc<"chats">;
  isPinned: boolean;
}

export const ChatItem = React.forwardRef<HTMLDivElement, ChatItemProps>(
  function ChatItem({ chat, isPinned }) {
    const { handleNavigate, handlePin, handleUnpin, handleDelete, handleSelect } =
      chatHandlers();
    const params = useParams({ strict: false });
    const isSelected = params.chatId === chat._id;

    return (
      <SidebarMenuButton
        key={chat._id}
        className="py-2.5 group/item cursor-pointer w-full h-full"
        asChild
        onClick={() => {
          handleNavigate(chat._id);
          handleSelect(chat._id);
        }}
      >
        <div
          className={cn(
            "relative flex w-full items-center isolate justify-between overflow-hidden rounded-md",
            isSelected && "bg-secondary/50"
          )}
        >
          <span className="truncate">{chat.name}</span>
          <div className="absolute inset-y-0 right-0 z-10 flex items-center justify-end gap-2 bg-gradient-to-l from-background via-background/80 to-transparent pl-8 pr-1 text-muted-foreground transition-transform duration-200 group-hover/item:translate-x-0 translate-x-full">
            {isPinned ? (
              <PinOffIcon
                className="h-4 w-4 text-muted-foreground hover:cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnpin(chat._id);
                }}
              />
            ) : (
              <PinIcon
                className="h-4 hover:text-secondary-foreground w-4 text-muted-foreground hover:cursor-pointer z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePin(chat._id);
                }}
              />
            )}
            <TrashIcon
              className="h-4 hover:text-destructive w-4 text-muted-foreground hover:cursor-pointer z-10"
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(chat._id);
              }}
            />
          </div>
        </div>
      </SidebarMenuButton>
    );
  }
);