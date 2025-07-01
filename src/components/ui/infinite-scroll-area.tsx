import * as React from "react";
import { PinIcon, PinOffIcon, TrashIcon, Loader2 } from "lucide-react";
import { SidebarMenuButton } from "@/components/ui/sidebar";

import type { Doc } from "convex/_generated/dataModel";

import { useVirtualizer } from "@tanstack/react-virtual";
import { chatHandlers } from "@/hooks/chats/use-chats";
import { cn } from "@/lib/utils";
import { useAtomValue } from "jotai";
import { selectedChatIdAtom } from "@/store/chatStore";
import type { BaseMessage } from "@langchain/core/messages";

export function InfiniteScrollArea({
  data,
  error,
  isFetching,
  isFetchingNextPage,
  fetchNextPage,
  className,
  hasNextPage,
}: {
  data: Doc<"chats">[];
  error: Error | null;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  className?: string;
}) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: hasNextPage ? data.length + 1 : data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 20,
    overscan: 5,
  });

  React.useEffect(() => {
    const [lastItem] = [...rowVirtualizer.getVirtualItems()].reverse();

    if (!lastItem) {
      return;
    }

    if (
      lastItem.index >= data.length - 1 &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage();
    }
  }, [
    hasNextPage,
    fetchNextPage,
    data.length,
    isFetchingNextPage,
    rowVirtualizer.getVirtualItems(),
  ]);

  // Only show loading when we have no data AND are fetching
  if (isFetching && data.length === 0) {
    return (
      <div className="text-muted-foreground animate-in fade-in duration-300 px-4 flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-destructive animate-in fade-in duration-300 px-4">
        Error occurred while fetching chats
      </div>
    );
  }

  // Show message when no chats exist
  if (!isFetching && data.length === 0) {
    return (
      <div className="text-sm text-muted-foreground animate-in fade-in duration-300 px-4">
        No chats found
      </div>
    );
  }

  return (
    <div className={cn("h-full flex flex-col", className)} ref={parentRef}>
      <div
        className="relative w-full flex flex-col gap-0.5"
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const isLoaderRow = virtualRow.index > data.length - 1;
          const chat = data[virtualRow.index];

          return (
            <div
              key={virtualRow.index}
              className=" w-full h-full flex flex-col"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {isLoaderRow ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  {isFetchingNextPage
                    ? "Loading more..."
                    : hasNextPage
                      ? "Load more"
                      : "No more chats"}
                </div>
              ) : (
                <ChatItem chat={chat} isPinned={chat.pinned} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// the chat item in the sidebar

const ChatItem = React.forwardRef<
  HTMLDivElement,
  {
    chat: Doc<"chats">;
    isPinned: boolean;
    className?: string;
    // selected: boolean;
    style?: React.CSSProperties;
    children?: React.ReactNode;
  }
>(function ChatItem({ chat, isPinned, className }, ref) {
  const { handleNavigate, handlePin, handleUnpin, handleDelete, handleSelect } =
    chatHandlers();

  const selectedChatId = useAtomValue(selectedChatIdAtom);
  const isSelected = selectedChatId === chat._id;

  return (
    <div ref={ref} className={className}>
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
                onClick={() => {
                  handleUnpin(chat._id);
                }}
              />
            ) : (
              <PinIcon
                className="h-4 hover:text-secondary-foreground w-4 text-muted-foreground hover:cursor-pointer z-10"
                onClick={() => {
                  handlePin(chat._id);
                }}
              />
            )}
            <TrashIcon
              className="h-4 hover:text-destructive w-4 text-muted-foreground hover:cursor-pointer z-10"
              onClick={() => {
                handleDelete(chat._id);
              }}
            />
          </div>
        </div>
      </SidebarMenuButton>
    </div>
  );
});

// export const MessageItem = React.forwardRef<
//   HTMLDivElement,
//   {
//     message: BaseMessage;
//     className?: string;
//   }
// >(function MessageItem({ message, className }, ref) {
//   return (
//     <div ref={ref} className={className}>
//       {message.content.map((content) => {
//         if (content.type === "text") {
//           return <div key={content.text}>{content.text}</div>;
//         }
//       })}
//     </div>
//   );
// });
