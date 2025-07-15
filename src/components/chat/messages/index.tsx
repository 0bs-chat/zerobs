import type { Id } from "../../../../convex/_generated/dataModel";
import { useParams } from "@tanstack/react-router";
import { useMessages } from "../../../hooks/chats/use-messages";
import { useEffect, useMemo, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessagesList } from "./messages";
import { StreamingMessage } from "./streaming-message";
import { useScroll } from "@/hooks/chats/use-scroll";
import { TriangleAlertIcon } from "lucide-react";

export const ChatMessages = () => {
  const params = useParams({ strict: false });
  const chatId = params.chatId as Id<"chats">;
  const { scrollToBottom, shouldAutoScroll } = useScroll();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { groupedMessages, streamData, navigateBranch, isLoading, isEmpty } =
    useMessages({ chatId });

  // Auto-scroll during streaming only if user hasn't scrolled away
  useEffect(() => {
    if (shouldAutoScroll && streamData.chunkGroups.length > 0) {
      scrollToBottom("smooth");
    }
  }, [streamData.chunkGroups.length, shouldAutoScroll, scrollToBottom]);

  // Auto-scroll when new messages arrive (non-streaming)
  useEffect(() => {
    if (shouldAutoScroll && groupedMessages.length > 0) {
      scrollToBottom("smooth");
    }
  }, [groupedMessages.length, shouldAutoScroll, scrollToBottom]);

  // Initial scroll to bottom when chat loads
  useEffect(() => {
    if (!isEmpty && !isLoading) {
      scrollToBottom("auto");
    }
  }, [isEmpty, isLoading, scrollToBottom]);

  const mainContent = useMemo(() => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading messages...</div>
        </div>
      );
    }

    if (isEmpty && !streamData.chunkGroups.length) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">No messages</div>
        </div>
      );
    }

    return (
      <ScrollArea className="h-full chat-messages-scroll-area">
        <div className="flex flex-col gap-1 p-1 max-w-4xl mx-auto">
          {groupedMessages.length > 0 && (
            <MessagesList
              navigateBranch={navigateBranch}
              groupedMessages={groupedMessages}
            />
          )}

          {streamData.chunkGroups.length > 0 && <StreamingMessage />}
          {["streaming", "pending"].includes(streamData?.status ?? "") && (
            <div className="flex items-center gap-1">
              <span className="inline-block w-2 h-4 bg-current animate-pulse" />
            </div>
          )}
          {["cancelled", "error"].includes(streamData.status ?? "") && (
            <div
              className={`flex flex-row gap-2 items-center justify-start p-2 rounded-lg ${streamData.status === "cancelled" ? "bg-yellow-500/10" : "bg-red-500/10"}`}
            >
              <TriangleAlertIcon className="w-4 h-4" />
              <div className="text-muted-foreground">
                {streamData.status === "cancelled"
                  ? "Stream cancelled"
                  : "Stream error"}
              </div>
            </div>
          )}
          <div ref={scrollAreaRef} />
        </div>
      </ScrollArea>
    );
  }, [isLoading, isEmpty, groupedMessages, navigateBranch, streamData]);

  return mainContent;
};
