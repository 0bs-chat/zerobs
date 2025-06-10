import { useParams } from "@tanstack/react-router";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStream } from "@/lib/stream-helper";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import React from "react";
import {
  Card,
  CardContent
} from "@/components/ui/card"
import { coerceMessageLikeToMessage, type BaseMessage, HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";

const UserMessageComponent = ({ message }: { message: HumanMessage }) => {
  const text = Array.isArray(message.content) ?
    message.content.map((item) => item.type === "text" ? item.text : null).join("") : message.content;
  const fileIds = Array.isArray(message.content) ?
    message.content.map((item) => item.type === "file" && 'file' in item ? item.file.file_id : null).filter(Boolean) : [];
  const documents = useQuery(api.documents.queries.getMultiple, {
    documentIds: fileIds as Id<"documents">[]
  });

  return (
    <div className="bg-card text-card-foreground flex flex-col rounded-xl border shadow-sm p-3 max-w-[70%] self-end mb-4">
      <span className="text-md">{text}{JSON.stringify(documents)}</span>
    </div>
  );
};

const AIMessageComponent = ({ message }: { message: Record<string, any> }) => {

  return (
    <Card className="max-w-[80%] w-fit self-start mb-4">
      <CardContent className="p-3">
        {JSON.stringify(message.content)}
      </CardContent>
    </Card>
  )
};

const ToolMessageComponent = ({ message }: { message: Record<string, any> }) => {
  
  return (
    <Card className="max-w-[80%] w-fit self-start mb-4">
      <CardContent className="p-3">
        {JSON.stringify(message.content)}
      </CardContent>
    </Card>
  )
};

const StreamMessage = ({ message }: { message: string }) => {
  return (
    <div className="mb-4 p-4 rounded-lg bg-accent/50 max-w-[80%] w-fit self-start">
      <div className="text-sm text-foreground">{message}</div>
    </div>
  );
};

const StreamToolMessage = ({ toolName, status, input, output }: { toolName: string; status: 'starting' | 'ended'; input?: any; output?: any }) => {
  return (
    <div className="mb-4 p-4 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 max-w-[80%] w-fit self-start">
      <div className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-2">
        {status === 'starting' ? '⚡ Starting Tool:' : '✅ Tool Completed:'} {toolName}
      </div>
      {input && (
        <div className="mb-2">
          <div className="text-xs font-medium text-muted-foreground mb-1">Input:</div>
          <div className="text-sm text-foreground bg-background/50 p-2 rounded border">
            {typeof input === 'string' ? input : JSON.stringify(input, null, 2)}
          </div>
        </div>
      )}
      {output && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1">Output:</div>
          <div className="text-sm text-foreground bg-background/50 p-2 rounded border whitespace-pre-wrap">
            {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
          </div>
        </div>
      )}
    </div>
  );
};

export const ChatMessages = React.memo(() => {
  const params = useParams({ from: "/chat_/$chatId/" });
  const stream = useStream(params.chatId as Id<"chats"> | "new");

  const checkpoint = useQuery(api.chats.queries.getCheckpoint, {
    chatId: params.chatId as Id<"chats"> | "new",
  });
  
  const parsedCheckpoint = React.useMemo(() => {
    if (!checkpoint?.page) return null;
    const parsed = JSON.parse(checkpoint.page) as Record<string, any> & { messages: BaseMessage[] };
    return {
      ...parsed,
      messages: parsed.messages.map((msg) => coerceMessageLikeToMessage(msg)),
    };
  }, [checkpoint?.page]);

  const streamEvents = React.useMemo(() => {
    if (!stream?.chunks) return [];
    
    return stream.chunks.map((chunk, index) => {
      if (chunk.event === "on_chat_model_stream" && chunk.metadata.langgraph_node === "agent") {
        return {
          type: 'chat' as const,
          content: chunk.data.chunk.kwargs.content,
          id: `stream-${index}`
        };
      }
      if (chunk.event === "on_tool_start") {
        return {
          type: 'tool_start' as const,
          toolName: chunk.name || "Tool",
          input: chunk.data?.input,
          id: `stream-${index}`
        };
      }
      if (chunk.event === "on_tool_end") {
        return {
          type: 'tool_end' as const,
          toolName: chunk.name || "Tool",
          output: chunk.data?.output,
          id: `stream-${index}`
        };
      }
      return null;
    }).filter(Boolean);
  }, [stream?.chunks]);

  return (
    <ScrollArea className="overflow-hidden w-full">
      <div className="flex flex-col max-w-4xl mx-auto p-4 space-y-0">
        {parsedCheckpoint?.messages?.map((message, index) => {
          if (message instanceof HumanMessage) {
            return <UserMessageComponent key={index} message={message} />;
          } else if (message instanceof AIMessage) {
            return <AIMessageComponent key={index} message={message} />;
          } else if (message instanceof ToolMessage) {
             return (
               <ToolMessageComponent
                 key={index}
                 message={message}
               />
             );
           }
        })}
        
        {streamEvents.map((event) => {
          if (!event) return null;
          
          if (event.type === 'chat' && event.content) {
            return <StreamMessage key={event.id} message={event.content} />;
          }
          if (event.type === 'tool_start') {
            return (
              <StreamToolMessage 
                key={event.id}
                toolName={event.toolName}
                status="starting"
                input={event.input}
              />
            );
          }
          if (event.type === 'tool_end') {
            return (
              <StreamToolMessage 
                key={event.id}
                toolName={event.toolName}
                status="ended"
                output={event.output}
              />
            );
          }
          return null;
        })}
      </div>
    </ScrollArea>
  );
});
