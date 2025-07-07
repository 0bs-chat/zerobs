import type { Id } from "../../../../convex/_generated/dataModel";
import { useParams } from "@tanstack/react-router";
import { useMessages } from "../../../hooks/chats/use-messages";
import { useStream } from "../../../hooks/chats/use-stream";
import {
  groupedMessagesAtom,
  lastChatMessageAtom,
  useStreamAtom,
} from "@/store/chatStore";
import { useSetAtom } from "jotai";
import { useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessagesList } from "./messages";
import { StreamingMessage } from "./streaming-message";
import { useScroll } from "@/hooks/chats/use-scroll";
import { type RefObject } from "react";

export const ChatMessages = ({
  scrollAreaRef,
}: {
  scrollAreaRef: RefObject<HTMLDivElement | null>;
}) => {
  const params = useParams({ from: "/chat_/$chatId/" });
  const chatId = params.chatId as Id<"chats">;
  const setGroupedMessagesAtom = useSetAtom(groupedMessagesAtom);
  const setLastChatMessageAtom = useSetAtom(lastChatMessageAtom);
  const setUseStreamAtom = useSetAtom(useStreamAtom);
  const { scrollToBottom } = useScroll(scrollAreaRef);

  const { groupedMessages, lastMessageId, navigateBranch, isLoading, isEmpty } =
    useMessages({ chatId });

  const streamData = useStream(chatId);

  setGroupedMessagesAtom(groupedMessages);
  setLastChatMessageAtom(lastMessageId);
  setUseStreamAtom(streamData);

  useEffect(() => {
    scrollToBottom("smooth");
  }, [groupedMessages.length, streamData.chunkGroups.length, scrollToBottom]);

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
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-1 p-1 max-w-4xl mx-auto">
          {groupedMessages.length > 0 && (
            <MessagesList navigateBranch={navigateBranch} />
          )}

          {streamData.chunkGroups.length > 0 && <StreamingMessage />}
          <div ref={scrollAreaRef} />
        </div>
      </ScrollArea>
    );
  }, [isLoading, isEmpty, groupedMessages, navigateBranch, streamData]);

  return mainContent;
};
