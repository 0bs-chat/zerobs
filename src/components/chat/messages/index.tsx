import { useParams } from "@tanstack/react-router";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStream } from "@/lib/stream_helper";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { useQuery } from "convex/react";

export const ChatMessages = () => {
  const params = useParams({ from: "/chat_/$chatId/" });
  const chatInput = useQuery(api.chatInput.queries.get, {
    chatId: params.chatId as Id<"chats"> | "new",
  });
  const stream = useStream(chatInput?.streamId);

  return (
    <ScrollArea className="flex-1 overflow-hidden">
      <div className="flex flex-col max-w-4xl mx-auto">
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
