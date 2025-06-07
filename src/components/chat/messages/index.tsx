import { useParams } from "@tanstack/react-router";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStream } from "@/lib/stream-helper";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useAction } from "convex/react";
import type { StateSnapshot } from "@langchain/langgraph";
import React, { useEffect, useState } from "react";

export const ChatMessages = React.memo(() => {
  const params = useParams({ from: "/chat_/$chatId/" });
  const stream = useStream(params.chatId as Id<"chats"> | "new");

  const getMessages = useAction(api.chats.actions.messages);

  const [messages, setMessages] = useState<StateSnapshot | undefined>(
    undefined
  );
  useEffect(() => {
    if (stream.status === "done" && params.chatId !== "new") {
      getMessages({ chatId: params.chatId as Id<"chats"> }).then((messages) => {
        setMessages(JSON.parse(messages) as StateSnapshot);
      });
    } else if (params.chatId === "new") {
      setMessages(undefined);
    }
  }, [stream.status, params.chatId]);

  return (
    <ScrollArea className="flex-1 overflow-hidden">
      <div className="flex-1 flex-col max-w-4xl mx-auto">
        {JSON.stringify(messages, null, 2)}
        {stream.status === "streaming" && (
          <div className="flex flex-col gap-2">
            {stream.chunks.map((chunk, index) => (
              <div key={`streamChunk-${index}`}>{JSON.stringify(chunk)}</div>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-2">
          {stream.status === "pending" && stream.chunks && stream.chunks.length != 0 ? (
            <div>Loading...</div>
          ) : null}
        </div>
      </div>
    </ScrollArea>
  );
});