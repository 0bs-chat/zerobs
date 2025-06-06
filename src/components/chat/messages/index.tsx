import { useParams } from "@tanstack/react-router";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStream } from "@/lib/stream_helper";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useAction, useQuery } from "convex/react";
import type { StateSnapshot } from "@langchain/langgraph";
import { useEffect, useState } from "react";

export const ChatMessages = () => {
  const params = useParams({ from: "/chat_/$chatId/" });
  const chatInput = useQuery(api.chatInput.queries.get, {
    chatId: params.chatId as Id<"chats"> | "new",
  });
  const stream = useStream(chatInput?.streamId);

  const getMessages = useAction(api.chats.actions.messages);

  const [messages, setMessages] = useState<StateSnapshot | undefined>(
    undefined
  );
  useEffect(() => {
    if (stream.status === "done" && params.chatId !== "new") {
      getMessages({ chatId: params.chatId as Id<"chats"> }).then((messages) => {
        setMessages(JSON.parse(messages) as StateSnapshot);
      });
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
          {stream.status === "pending" && stream.chunks.length != 0 ? (
            <div>Loading...</div>
          ) : null}
        </div>
      </div>
    </ScrollArea>
  );
};
