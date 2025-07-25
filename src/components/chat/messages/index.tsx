import { useMessages } from "../../../hooks/chats/use-messages";
import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessagesList } from "./messages";
import { StreamingMessage } from "./streaming-message";
import { TriangleAlertIcon } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { streamStatusAtom } from "@/store/chatStore";
import { useAtomValue } from "jotai";

export const ChatMessages = ({ chatId }: { chatId: Id<"chats"> | "new" }) => {
  const user = useQuery(api.auth.getUser);
  const { isLoading, isEmpty } = useMessages({ chatId });

  const streamStatus = useAtomValue(streamStatusAtom);

  const mainContent = useMemo(() => {
    if (chatId === "new") {
      return (
        <div className="flex items-center justify-center h-full flex-col gap-4 -translate-y-30">
          <div
            className="flex flex-col items-center gap-2 text-5xl font-semibold text-muted-foreground/40"
            style={{
              fontFamily: "Rubik",
            }}
          >
            how can i help you
            <br />
            {user?.name} ?
          </div>
        </div>
      );
    }

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
      <ScrollArea className="h-full">
        <div className="flex flex-col gap-1 p-1 max-w-4xl mx-auto">
          <MessagesList />

          {streamStatus === "streaming" && <StreamingMessage />}
          {["streaming", "pending"].includes(streamStatus ?? "") && (
            <div className="flex items-center gap-1">
              <span className="inline-block w-2 h-4 bg-current animate-pulse" />
            </div>
          )}
          {["cancelled", "error"].includes(streamStatus ?? "") && (
            <div
              className={`flex flex-row gap-2 items-center justify-start p-2 rounded-lg ${streamStatus === "cancelled" ? "bg-yellow-500/10" : "bg-red-500/10"}`}
            >
              <TriangleAlertIcon className="w-4 h-4" />
              <div className="text-muted-foreground">
                {streamStatus === "cancelled"
                  ? "Stream cancelled"
                  : "Stream error"}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    );
  }, [isLoading, isEmpty, streamStatus, chatId]);

  return mainContent;
};
