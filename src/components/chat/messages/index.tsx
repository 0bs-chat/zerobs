import { useParams } from "@tanstack/react-router";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStream } from "@/lib/stream-helper";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";
import React from "react";

export const ChatMessages = React.memo(() => {
  const params = useParams({ from: "/chat_/$chatId/" });
  const stream = useStream(params.chatId as Id<"chats"> | "new");

  const messages = useQuery(api.chats.queries.getMessages, {
    chatId: params.chatId as Id<"chats"> | "new",
  });

  return (
    <ScrollArea className="flex-1 overflow-hidden">
      <div className="flex-1 flex-col max-w-4xl mx-auto">
        {messages?.page && messages?.page.length > 0 && JSON.stringify(messages?.page, null, 2)}
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