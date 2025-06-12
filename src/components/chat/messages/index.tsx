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
} from "@langchain/core/messages";
import { 
  UserMessageComponent,
  AIMessageComponent, 
  ToolMessageComponent,
  useCheckpointParser,
  useStreamProcessor 
} from "./components";

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
      chatId:
        params.chatId as Id<"chats"> | "new",
    }
  );
  
  const parsedCheckpoint = useCheckpointParser({ checkpoint });
  console.log(parsedCheckpoint)
  const { chunkGroups } = useStreamProcessor({ streamChunks: stream?.chunks });

  return (
    <ScrollArea className="overflow-hidden w-full h-full">
      <div className="flex flex-col max-w-4xl mx-auto p-1 gap-1">
        {parsedCheckpoint?.messages?.map(
          (message, index) => {
            if (
              message instanceof HumanMessage
            ) {
              return (
                <UserMessageComponent
                  key={index}
                  message={message}
                />
              );
            } else if (
              message instanceof AIMessage &&
              message.content.length > 0
            ) {
              return (
                <AIMessageComponent
                  key={index}
                  message={message}
                />
              );
            } else if (
              message instanceof ToolMessage
            ) {
              return (
                <ToolMessageComponent
                  key={index}
                  message={message}
                />
              );
            }
            return null;
          }
        )}
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
    </ScrollArea>
  );
});