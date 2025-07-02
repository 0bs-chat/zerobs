import type { Id } from "../../../../convex/_generated/dataModel";
import { useParams } from "@tanstack/react-router";
import { useMessages } from "../../../hooks/chats/use-messages";
import { useStream } from "../../../hooks/chats/use-stream";
import { useStreamAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";
import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

export const ChatMessages = () => {
  const params = useParams({ from: "/chat_/$chatId/" });
  const chatId = params.chatId as Id<"chats">;
  const setStreamAtom = useSetAtom(useStreamAtom);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    currentThread,
    navigateBranch,
    isLoading,
    isEmpty
  } = useMessages({ chatId });

  const stream = useStream(chatId);

  useEffect(() => {
    setStreamAtom(stream);
  }, [stream]);

  // Auto-scroll to bottom when new messages arrive or when streaming
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentThread.length, stream?.status]);

  // Auto-scroll to bottom when component first loads with messages
  useEffect(() => {
    if (!isEmpty && !isLoading && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [isEmpty, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading messages...</div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">No messages</div>
      </div>
    );
  }

  return (
    <ScrollArea 
        ref={scrollAreaRef}
        className="overflow-hidden h-full w-full"
      >
        <div className="flex flex-col gap-1 p-1 max-w-4xl mx-auto">
          {currentThread.length > 0 ? (
            <>
              {currentThread.map((item) => (
                <div 
                  key={item.message._id}
                >
                  {/* Branch navigation info */}
                  {item.totalBranches > 1 && (
                    <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                      <span>Branch: {item.branchIndex}/{item.totalBranches}</span>
                      <button 
                        onClick={() => navigateBranch(item.depth, 'prev')}
                        className="px-2 py-1 rounded border hover:bg-accent transition-colors"
                        aria-label="Previous branch"
                      >
                        ←
                      </button>
                      <button 
                        onClick={() => navigateBranch(item.depth, 'next')}
                        className="px-2 py-1 rounded border hover:bg-accent transition-colors"
                        aria-label="Next branch"
                      >
                        →
                      </button>
                    </div>
                  )}
                  
                  {/* Message content */}
                  <div className="bg-red-500">
                    <div className="text-xs text-muted-foreground">
                      {new Date(item.message._creationTime).toLocaleString()}
                    </div>
                    <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-3 rounded">
                      {JSON.stringify({
                        id: item.message._id,
                        hasChildren: (item.message.children?.length || 0) > 0,
                        childrenCount: item.message.children?.length || 0,
                        parentId: item.message.parentId,
                        branchInfo: `${item.branchIndex}/${item.totalBranches}`,
                        depth: item.depth,
                        message: item.message.message
                      }, null, 2)}
                    </pre>
                  </div>
                </div>
              ))}
              {/* Stream status display */}
              {stream && (
                <div className="rounded-lg border bg-muted/50 p-3">
                  <div className="text-xs text-muted-foreground">
                    Stream Status: {stream.status}
                  </div>
                  <pre className="text-xs mt-2 whitespace-pre-wrap">
                    {JSON.stringify(stream, null, 2)}
                  </pre>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-muted-foreground">No messages</div>
          )}
          {/* Invisible element to scroll to */}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
  );
};