import type { Id } from "../../../../convex/_generated/dataModel";
import { useParams } from "@tanstack/react-router";
import { useMessages, type MessageWithBranchInfo } from "../../../hooks/chats/use-messages";
import { useStream } from "../../../hooks/chats/use-stream";
import { groupedMessagesAtom, useStreamAtom, lastChatMessageAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";
import { useEffect, useRef, useMemo, useCallback, memo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserMessage, type MessageBranchNavigation } from "./user-message";
import { AiMessage } from "./ai-message";
import { StreamingMessage } from "./streaming-message";

// Memoized message group component to prevent unnecessary re-renders
const MessageGroup = memo(({ group, navigateBranch }: {
  group: {
    human: MessageWithBranchInfo;
    responses: MessageWithBranchInfo[];
  };
  navigateBranch: MessageBranchNavigation;
}) => (
  <div key={group.human.message._id} className="flex flex-col gap-2">
    <UserMessage item={group.human} navigateBranch={navigateBranch} />
    {group.responses.map((response) => (
      <AiMessage
        key={response.message._id}
        item={response}
        navigateBranch={navigateBranch}
      />
    ))}
  </div>
));

MessageGroup.displayName = "MessageGroup";

// Memoized messages list component
const MessagesList = memo(({ 
  groupedMessages, 
  navigateBranch, 
  stream 
}: {
  groupedMessages: Array<{
    human: MessageWithBranchInfo;
    responses: MessageWithBranchInfo[];
  }>;
  navigateBranch: MessageBranchNavigation;
  stream: ReturnType<typeof useStream>;
}) => (
  <>
    {groupedMessages.map((group) => (
      <MessageGroup 
        key={group.human.message._id} 
        group={group} 
        navigateBranch={navigateBranch} 
      />
    ))}
    <StreamingMessage stream={stream} />
  </>
));

MessagesList.displayName = "MessagesList";

// Memoized loading component
const LoadingState = memo(() => (
  <div className="flex items-center justify-center h-full">
    <div className="text-muted-foreground">Loading messages...</div>
  </div>
));

LoadingState.displayName = "LoadingState";

// Memoized empty state component
const EmptyState = memo(() => (
  <div className="flex items-center justify-center h-full">
    <div className="text-muted-foreground">No messages</div>
  </div>
));

EmptyState.displayName = "EmptyState";

export const ChatMessages = () => {
  const params = useParams({ from: "/chat_/$chatId/" });
  const chatId = params.chatId as Id<"chats">;
  const setStreamAtom = useSetAtom(useStreamAtom);
  const setGroupedMessagesAtom = useSetAtom(groupedMessagesAtom);
  const setLastChatMessageAtom = useSetAtom(lastChatMessageAtom);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const {
    groupedMessages,
    lastMessageId,
    navigateBranch,
    isLoading,
    isEmpty
  } = useMessages({ chatId });

  const stream = useStream(chatId);

  // Memoize the navigation function to prevent child re-renders
  const memoizedNavigateBranch = useCallback(
    (depth: number, direction: 'prev' | 'next') => {
      navigateBranch(depth, direction);
    },
    [navigateBranch]
  );

  // Memoize stream status and chunk length for scroll trigger optimization
  const streamScrollTriggers = useMemo(() => ({
    status: stream?.status,
    chunkGroupsLength: stream?.chunkGroups?.length || 0
  }), [stream?.status, stream?.chunkGroups?.length]);

  // Memoize the messages length to optimize scroll triggers
  const messagesLength = useMemo(() => groupedMessages.length, [groupedMessages.length]);

  useEffect(() => {
    setStreamAtom(stream);
    setGroupedMessagesAtom(groupedMessages);
    setLastChatMessageAtom(lastMessageId);
  }, [stream, groupedMessages, lastMessageId, setStreamAtom, setGroupedMessagesAtom, setLastChatMessageAtom]);

  // Optimized auto-scroll with memoized dependencies
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, []);

  // Auto-scroll to bottom when new messages arrive or when streaming
  useEffect(() => {
    scrollToBottom("smooth");
  }, [messagesLength, streamScrollTriggers.status, streamScrollTriggers.chunkGroupsLength, scrollToBottom]);

  // Auto-scroll to bottom when component first loads with messages
  useEffect(() => {
    if (!isEmpty && !isLoading) {
      scrollToBottom("auto");
    }
  }, [isEmpty, isLoading, scrollToBottom]);

  // Memoize the main content to prevent unnecessary re-renders
  const mainContent = useMemo(() => {
    if (isLoading) {
      return <LoadingState />;
    }

    if (isEmpty) {
      return <EmptyState />;
    }

    return (
      <ScrollArea ref={scrollAreaRef} className="overflow-hidden h-full w-full">
        <div className="flex flex-col gap-4 p-1 max-w-4xl mx-auto">
          {groupedMessages.length > 0 ? (
            <MessagesList
              groupedMessages={groupedMessages}
              navigateBranch={memoizedNavigateBranch}
              stream={stream}
            />
          ) : (
            <div className="text-center text-muted-foreground">No messages</div>
          )}
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
    );
  }, [isLoading, isEmpty, groupedMessages, memoizedNavigateBranch, stream]);

  return mainContent;
};