import React, { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStream } from "@/hooks/use-stream";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery, useAction } from "convex/react";
import {
  HumanMessage,
  AIMessage,
  ToolMessage,
  BaseMessage,
} from "@langchain/core/messages";
import {
  UserMessageComponent,
  AIMessageComponent,
  ToolMessageComponent,
} from ".";
import { useCheckpointParser } from "@/hooks/use-chats";
import { useStreamProcessor } from "@/hooks/use-stream";
import { AIToolUtilsBar, UserUtilsBar } from "./UtilsBar";

const groupMessages = (messages: BaseMessage[]): BaseMessage[][] => {
  if (messages.length === 0) return [];

  const grouped: BaseMessage[][] = [];
  let currentGroup: BaseMessage[] = [];

  const getGroupType = (message: BaseMessage) => {
    if (message instanceof HumanMessage) return "user";
    if (message instanceof AIMessage || message instanceof ToolMessage)
      return "ai/tool";
    return "other";
  };

  const validMessages = messages.filter(
    (message) => getGroupType(message) !== "other",
  );

  for (const message of validMessages) {
    const messageType = getGroupType(message);

    if (currentGroup.length === 0) {
      currentGroup.push(message);
    } else {
      const currentGroupType = getGroupType(currentGroup[0]);
      if (messageType === currentGroupType) {
        currentGroup.push(message);
      } else {
        grouped.push(currentGroup);
        currentGroup = [message];
      }
    }
  }

  if (currentGroup.length > 0) {
    grouped.push(currentGroup);
  }

  return grouped;
};

const MessageGroup = ({ 
  messages, 
  firstMessageIndex,
  chatId,
}: { 
  messages: BaseMessage[];
  firstMessageIndex: number;
  chatId: Id<"chats"> | "new";
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const removeMessageGroup = useAction(api.chats.actions.removeMessageGroup);
  const regenerate = useAction(api.chats.actions.regenerate);

  if (messages.length === 0) return null;

  const firstMessage = messages[0];
  const isUserGroup = firstMessage instanceof HumanMessage;

  const handleCopyText = () => {
    const textToCopy = messages
      .map((m) => m.content)
      .map((content) => {
        if (typeof content !== "string") {
          try {
            return JSON.stringify(content, null, 2);
          } catch {
            return String(content);
          }
        }
        return content;
      })
      .join("\n\n");
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteMessage = async () => {
    if (chatId === "new") return;
    
    try {
      await removeMessageGroup({
        chatId: chatId as Id<"chats">,
        startIndex: firstMessageIndex,
        count: messages.length,
        cascade: false,
      });
    } catch (error) {
      console.error("Failed to delete message group:", error);
    }
  };

  const handleDeleteCascading = async () => {
    if (chatId === "new") return;
    
    try {
      await removeMessageGroup({
        chatId: chatId as Id<"chats">,
        startIndex: firstMessageIndex,
        count: messages.length,
        cascade: true,
      });
    } catch (error) {
      console.error("Failed to delete cascading messages:", error);
    }
  };

  const handleRegenerate = async () => {
    if (chatId === "new" || isUserGroup) return;
    
    try {
      await regenerate({
        chatId: chatId as Id<"chats">,
        startIndex: firstMessageIndex,
        count: messages.length,
      });
    } catch (error) {
      console.error("Failed to regenerate message:", error);
    }
  };

  const renderMessage = (message: BaseMessage, index: number) => {
    const messageId = message.id ?? `msg-${index}`;

    if (message instanceof HumanMessage) {
      return <UserMessageComponent key={messageId} message={message} />;
    } else if (message instanceof AIMessage) {
      return (
        <AIMessageComponent
          key={messageId}
          message={message}
          messageId={messageId as string}
        />
      );
    } else if (message instanceof ToolMessage) {
      return <ToolMessageComponent key={messageId} message={message} />;
    }
    return null;
  };

  return (
    <div
      className={`flex flex-col w-full gap-1 group ${isUserGroup ? "items-end" : ""}`}
    >
      {messages.map(renderMessage)}
      <div className="flex flex-row items-center justify-start">
        {isUserGroup ? (
          <UserUtilsBar
            isDropdownOpen={isDropdownOpen}
            setIsDropdownOpen={setIsDropdownOpen}
            handleCopyText={handleCopyText}
            copied={copied}
            onDeleteMessage={handleDeleteMessage}
            onDeleteCascading={handleDeleteCascading}
          />
        ) : (
          <AIToolUtilsBar
            isDropdownOpen={isDropdownOpen}
            setIsDropdownOpen={setIsDropdownOpen}
            handleCopyText={handleCopyText}
            copied={copied}
            onDeleteMessage={handleDeleteMessage}
            onDeleteCascading={handleDeleteCascading}
            onRegenerate={handleRegenerate}
          />
        )}
      </div>
    </div>
  );
};

MessageGroup.displayName = "MessageGroup";

export const ChatMessages = React.memo(() => {
  const params = useParams({
    from: "/chat_/$chatId/",
  });
  const stream = useStream(params.chatId as Id<"chats"> | "new");
  const checkpoint = useQuery(api.chats.queries.getCheckpoint, {
    chatId: params.chatId as Id<"chats"> | "new",
    paginationOpts: {
      numItems: 20,
      cursor: null,
    },
  });

  const parsedCheckpoint = useCheckpointParser({ checkpoint });
  const { chunkGroups } = useStreamProcessor({ streamChunks: stream?.chunks });

  const messageGroups = parsedCheckpoint?.messages
    ? groupMessages(parsedCheckpoint.messages)
    : [];

  // Calculate the first message index for each group by flattening and tracking position
  const messageGroupsWithIndices = messageGroups.map((group, groupIndex) => {
    // Calculate the first message index by summing all previous group lengths
    const firstMessageIndex = messageGroups
      .slice(0, groupIndex)
      .reduce((sum, prevGroup) => sum + prevGroup.length, 0);
    
    return { group, firstMessageIndex };
  });

  return (
    <ScrollArea className="overflow-hidden w-full h-full">
      <div className="flex flex-col max-w-4xl mx-auto p-1 gap-1">
        {messageGroupsWithIndices.map(({ group, firstMessageIndex }, groupIndex) => (
          <MessageGroup 
            key={groupIndex} 
            messages={group} 
            firstMessageIndex={firstMessageIndex}
            chatId={params.chatId as Id<"chats"> | "new"}
          />
        ))}

        {/* Handle streaming messages */}
        {chunkGroups.length > 0 && (
          <div className="flex flex-col w-full gap-1">
            {chunkGroups.map((chunkGroup, index) => {
              if (chunkGroup.type === "ai") {
                // Create a mock AIMessage for streaming content
                const streamingMessage = new AIMessage({
                  content: chunkGroup.content,
                  additional_kwargs: chunkGroup.reasoning
                    ? {
                        reasoning_content: chunkGroup.reasoning,
                      }
                    : {},
                });

                return (
                  <AIMessageComponent
                    key={`stream-ai-${index}`}
                    message={streamingMessage}
                    messageId={`stream-ai-${index}`}
                  />
                );
              } else if (chunkGroup.type === "tool") {
                // Create a mock ToolMessage for streaming tool calls
                const streamingToolMessage = new ToolMessage({
                  content: chunkGroup.output
                    ? JSON.stringify(chunkGroup.output)
                    : "",
                  tool_call_id: `stream-tool-${index}`,
                  name: chunkGroup.toolName,
                });

                return (
                  <ToolMessageComponent
                    key={`stream-tool-${index}`}
                    message={streamingToolMessage}
                    isStreaming={true}
                  />
                );
              }
              return null;
            })}
          </div>
        )}
      </div>
    </ScrollArea>
  );
});
