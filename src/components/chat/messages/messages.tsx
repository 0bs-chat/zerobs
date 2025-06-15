import React from "react";
import { useParams } from "@tanstack/react-router";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStream } from "@/hooks/use-stream";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
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
import { Button } from "@/components/ui/button";
import {
  MoreHorizontalIcon,
  TrashIcon,
  GitBranchIcon,
  CopyIcon,
  RefreshCcwIcon,
  PencilIcon,
  CheckIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Group messages into conversation groups
const groupMessages = (messages: BaseMessage[]) => {
  const groups: BaseMessage[][] = [];
  let currentGroup: BaseMessage[] = [];

  for (const message of messages) {
    if (message instanceof HumanMessage) {
      // If we have a current group, push it to groups
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
        currentGroup = [];
      }
      // Start a new group with the human message
      currentGroup = [message];
    } else if (message instanceof AIMessage || message instanceof ToolMessage) {
      // Add AI/Tool messages to the current group
      currentGroup.push(message);
    }
  }

  // Don't forget the last group
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  return groups;
};

// Component for rendering a group of messages with actions at the end
const MessageGroup = React.memo(({ messages, groupIndex }: { messages: BaseMessage[]; groupIndex: number }) => {
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Get all AI message content for copying
  const getAllAIContent = () => {
    return messages
      .filter(msg => msg instanceof AIMessage)
      .map(msg => {
        const content = typeof msg.content === "string"
          ? msg.content
          : Array.isArray(msg.content)
          ? msg.content
              .map((item: any) => (item.type === "text" ? item.text : ""))
              .join("")
          : String(msg.content);
        return content;
      })
      .join("\n\n");
  };

  const handleCopyText = async () => {
    try {
      const content = getAllAIContent();
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  // Check if this group has AI/Tool messages (not just human message)
  const hasAIOrToolMessages = messages.some(msg => 
    msg instanceof AIMessage || msg instanceof ToolMessage
  );

  return (
    <div className="flex flex-col w-full gap-1 group">
      {messages.map((message, index) => {
        const messageId = `group-${groupIndex}-message-${index}`;
        
        if (message instanceof HumanMessage) {
          return (
            <UserMessageComponent
              key={messageId}
              message={message}
              messageId={messageId}
            />
          );
        } else if (message instanceof AIMessage && message.content.length > 0) {
          return (
            <AIMessageComponent
              key={messageId}
              message={message}
              messageId={messageId}
            />
          );
        } else if (message instanceof ToolMessage) {
          return (
            <ToolMessageComponent
              key={messageId}
              message={message}
            />
          );
        }
        return null;
      })}
      
      {/* Show actions only at the end of AI/Tool message groups */}
      {hasAIOrToolMessages && (
        <div
          className={`flex flex-row items-center justify-start ${
            isDropdownOpen
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100"
          } transition-opacity duration-100 gap-1`}
        >
          <Button variant="ghost" size="icon">
            <RefreshCcwIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopyText}
            className={copied ? "text-green-500" : ""}
          >
            {copied ? (
              <CheckIcon className="w-4 h-4" />
            ) : (
              <CopyIcon className="w-4 h-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon">
            <GitBranchIcon className="w-4 h-4" />
          </Button>
          <DropdownMenu onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontalIcon className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem>
                <PencilIcon className="w-4 h-4 mr-2" />
                Edit message
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <TrashIcon className="w-4 h-4 mr-2" />
                Delete message
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
});

MessageGroup.displayName = "MessageGroup";

export const ChatMessages = React.memo(() => {
  const params = useParams({
    from: "/chat_/$chatId/",
  });
  const stream = useStream(
    params.chatId as Id<"chats"> | "new"
  );
  const checkpoint = useQuery(
    api.chats.queries.getCheckpoint,
    {
      chatId: params.chatId as Id<"chats"> | "new",
    }
  );
  
  const parsedCheckpoint = useCheckpointParser({ checkpoint });
  const { chunkGroups } = useStreamProcessor({ streamChunks: stream?.chunks });

  // Group the messages
  const messageGroups = parsedCheckpoint?.messages ? groupMessages(parsedCheckpoint.messages) : [];

  return (
    <ScrollArea className="overflow-hidden w-full h-full">
      <div className="flex flex-col max-w-4xl mx-auto p-1 gap-4">
        {messageGroups.map((group, groupIndex) => (
          <MessageGroup key={groupIndex} messages={group} groupIndex={groupIndex} />
        ))}
        
        {/* Handle streaming messages */}
        {chunkGroups.length > 0 && (
          <div className="flex flex-col w-full gap-1">
            {chunkGroups.map((chunkGroup, index) => {
              if (chunkGroup.type === "ai") {
                // Create a mock AIMessage for streaming content
                const streamingMessage = new AIMessage({
                  content: chunkGroup.content,
                  additional_kwargs: chunkGroup.reasoning ? {
                    reasoning_content: chunkGroup.reasoning
                  } : {}
                });
                
                return (
                  <AIMessageComponent
                    key={`stream-ai-${index}`}
                    message={streamingMessage}
                    isStreaming={true}
                    messageId={`stream-ai-${index}`}
                  />
                );
              } else if (chunkGroup.type === "tool") {
                // Create a mock ToolMessage for streaming tool calls
                const streamingToolMessage = new ToolMessage({
                  content: chunkGroup.output ? JSON.stringify(chunkGroup.output) : "",
                  tool_call_id: `stream-tool-${index}`,
                  name: chunkGroup.toolName
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