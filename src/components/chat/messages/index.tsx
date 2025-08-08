import { useMessages } from "../../../hooks/chats/use-messages";
import { ErrorState } from "@/components/ui/error-state";
import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessagesList } from "./messages";
import { StreamingMessage } from "./streaming-message";
import { TriangleAlertIcon } from "lucide-react";
import type { Id } from "../../../../convex/_generated/dataModel";
import { streamStatusAtom, userLoadableAtom } from "@/store/chatStore";
import { useAtomValue } from "jotai";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export const ChatMessages = ({ chatId }: { chatId: Id<"chats"> | "new" }) => {
  const userLoadable = useAtomValue(userLoadableAtom);
  const { isLoading, isEmpty, isError, error, isStreamError, streamError } =
    useMessages({ chatId });

  const streamStatus = useAtomValue(streamStatusAtom);

  const mainContent = useMemo(() => {
    if (chatId === "new") {
      // Get user name from loadable state
      const userName =
        userLoadable.state === "hasData" ? userLoadable.data?.name : "";

      return (
        <div className="flex items-center justify-center h-full flex-col gap-4 -translate-y-30">
          <div
            className="flex items-center gap-2 text-5xl font-semibold text-primary/50"
            style={{
              fontFamily: "Rubik",
            }}
          >
            how can i help you,
            <span className="text-primary/50">{userName} ?</span>
          </div>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner />
          <div className="text-muted-foreground">Loading messages...</div>
        </div>
      );
    }

    if (isError || error) {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <ErrorState
            className="max-w-4xl"
            title="Failed to load messages"
            error={error}
            description="Please try again later."
            density="comfy"
          />
        </div>
      );
    }

    if (isStreamError || streamError) {
      return (
        <div className="flex items-center justify-center w-full h-full">
          <ErrorState
            className="max-w-4xl"
            density="comfy"
            description="Unable to load messages, this might be due to either a network issue or a server error."
            title="Error loading messages"
            error={streamError}
            showIcon={false}
          />
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
  }, [isLoading, isEmpty, streamStatus, chatId, userLoadable]);

  return mainContent;
};
