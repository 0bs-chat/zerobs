import React, { useState } from "react";
import { useParams } from "@tanstack/react-router";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  PlanningSteps,
} from ".";
import { useCheckpointParser } from "@/hooks/chats/use-chats";
import { useStream } from "@/hooks/chats/use-stream";
import { AIToolUtilsBar, UserUtilsBar } from "./UtilsBar";
import { useStreamAtom, useCheckpointParserAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";

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
    (message) => getGroupType(message) !== "other"
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

const MessageGroup = React.memo(
  ({
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
    const [editingMessageIndex, setEditingMessageIndex] = useState<
      number | null
    >(null);
    const removeMessageGroup = useAction(api.chats.actions.removeMessageGroup);
    const regenerate = useAction(api.chats.actions.regenerate);
    const regenerateFromUser = useAction(api.chats.actions.regenerateFromUser);

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

    const handleUserRegenerate = async () => {
      if (chatId === "new" || !isUserGroup) return;

      try {
        await regenerateFromUser({
          chatId: chatId as Id<"chats">,
          startIndex: firstMessageIndex,
          count: messages.length,
        });
      } catch (error) {
        console.error("Failed to regenerate from user message:", error);
      }
    };

    const handleEditMessage = (messageIndex: number) => {
      setEditingMessageIndex(messageIndex);
    };

    const handleCancelEdit = () => {
      setEditingMessageIndex(null);
    };

    const handleSaveEdit = () => {
      setEditingMessageIndex(null);
    };

    const renderMessage = (message: BaseMessage, index: number) => {
      const messageId = message.id ?? `msg-${index}`;
      const absoluteMessageIndex = firstMessageIndex + index;
      const isEditing = editingMessageIndex === absoluteMessageIndex;

      if (message instanceof HumanMessage) {
        return (
          <UserMessageComponent
            key={messageId}
            message={message}
            isEditing={isEditing}
            onCancelEdit={handleCancelEdit}
            onSaveEdit={handleSaveEdit}
            messageIndex={absoluteMessageIndex}
            chatId={chatId}
          />
        );
      } else if (message instanceof AIMessage) {
        return (
          <AIMessageComponent
            key={messageId}
            message={message}
            messageIndex={absoluteMessageIndex}
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
              onRegenerate={handleUserRegenerate}
              onEditMessage={() => handleEditMessage(firstMessageIndex)}
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
  }
);

MessageGroup.displayName = "MessageGroup";

export const ChatMessages = React.memo(() => {
  const params = useParams({
    from: "/chat_/$chatId/",
  });
  const chatId = params.chatId as Id<"chats"> | "new";

  // now returns chunkGroups directly
  const stream = useStream(chatId);

  const checkpoint = useQuery(api.chats.queries.getCheckpoint, {
    chatId,
    paginationOpts: { numItems: 20, cursor: null },
  });
  const parsedCheckpoint = useCheckpointParser({ checkpoint });

  const setStream = useSetAtom(useStreamAtom);
  const setCheckpointParser = useSetAtom(useCheckpointParserAtom);

  setStream(stream);
  setCheckpointParser(parsedCheckpoint);

  const messageGroups = parsedCheckpoint?.messages
    ? groupMessages(parsedCheckpoint.messages)
    : [];

  const lastMessage =
    parsedCheckpoint?.messages?.[parsedCheckpoint.messages.length - 1];

  const lastMessageHasPastSteps =
    lastMessage instanceof AIMessage &&
    !!lastMessage.additional_kwargs?.past_steps;

  const messageGroupsWithIndices: {
    group: BaseMessage[];
    firstMessageIndex: number;
  }[] = [];
  let currentIndex = 0;
  for (const group of messageGroups) {
    messageGroupsWithIndices.push({ group, firstMessageIndex: currentIndex });
    currentIndex += group.length;
  }

  return (
    <ScrollArea className="overflow-hidden w-full h-full">
      <div className="flex flex-col max-w-4xl mx-auto p-1 gap-1">
        {/* render existing message groups */}
        {messageGroupsWithIndices.map(({ group, firstMessageIndex }, i) => (
          <MessageGroup
            key={i}
            messages={group}
            firstMessageIndex={firstMessageIndex}
            chatId={chatId}
          />
        ))}

        {/* render planning steps */}
        {parsedCheckpoint?.pastSteps && !lastMessageHasPastSteps && (
          <PlanningSteps pastSteps={parsedCheckpoint.pastSteps} />
        )}

        {/* render live stream */}
        {stream?.chunkGroups.length > 0 && (
          <div className="flex flex-col w-full gap-1">
            {stream?.chunkGroups.map((cg, idx) => {
              if (cg.type === "ai") {
                const msg = new AIMessage({
                  content: cg.content,
                  additional_kwargs: cg.reasoning
                    ? { reasoning_content: cg.reasoning }
                    : {},
                });
                return (
                  <AIMessageComponent
                    key={`stream-ai-${idx}`}
                    message={msg}
                    messageIndex={parsedCheckpoint?.messages.length ?? -1}
                  />
                );
              } else {
                const msg = new ToolMessage({
                  content: cg.output ? JSON.stringify(cg.output) : "",
                  tool_call_id: `stream-tool-${idx}`,
                  name: cg.toolName,
                });
                return (
                  <ToolMessageComponent
                    key={`stream-tool-${idx}`}
                    message={msg}
                    isStreaming
                  />
                );
              }
            })}
          </div>
        )}
      </div>
    </ScrollArea>
  );
});
