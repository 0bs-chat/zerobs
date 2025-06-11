import React from "react";
import { useParams } from "@tanstack/react-router";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStream } from "@/lib/stream-helper";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import {
  HumanMessage,
  AIMessage,
  ToolMessage,
} from "@langchain/core/messages";
import { 
  UserMessage, 
  AIMessageComponent, 
  ToolMessage as ToolMessageComponent,
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

  const { streamingElements, toolStreamEvents } = useStreamProcessor({
    streamChunks: stream?.chunks,
    parsedCheckpoint,
  });

  return (
    <ScrollArea className="overflow-hidden w-full h-full">
      <div className="flex flex-col max-w-4xl mx-auto p-1 gap-1">
        {parsedCheckpoint?.messages?.map(
          (message, index) => {
            if (
              message instanceof HumanMessage
            ) {
              return (
                <UserMessage
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
                  isStreaming={index === streamingElements.length - 1}
                />
              );
            } else if (
              message instanceof ToolMessage
            ) {
              return (
                <ToolMessageComponent
                  key={index}
                  message={message}
                  streamEvents={toolStreamEvents}
                />
              );
            }
            return null;
          }
        )}
        {streamingElements.map((element, index) => {
          if (element.type === "tool" && element.toolCall) {
            return (
              <ToolMessageComponent
                key={`stream-tool-${index}`}
                message={element.toolCall}
                streamEvents={toolStreamEvents}
              />
            );
          }
          if (
            element.type === "text" &&
            (element.content || element.reasoning)
          ) {
            const message = new AIMessage({
              content: element.content || "",
              additional_kwargs: {
                reasoning_content:
                  element.reasoning,
              },
            });
            return (
              <AIMessageComponent
                key={`stream-text-${index}`}
                message={message}
                isStreaming={index === streamingElements.length - 1}
              />
            );
          }
          return null;
        })}
      </div>
    </ScrollArea>
  );
});