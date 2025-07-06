import { memo, useMemo } from "react";
import { PlanningStep } from "./planning-step";
import { AiMessageContent } from "./ai-message";
import type { MessageWithBranchInfo } from "../utils-bar/branch-navigation";

export const AiMessage = memo(({ item }: { item: MessageWithBranchInfo }) => {
  const msg = item.message.message;
  const type = msg?.getType?.();
  const pastSteps = msg?.additional_kwargs?.pastSteps as
    | Array<[string, any[]]>
    | undefined;

  // Check if this is a completed planner message
  const isCompletedPlanner = useMemo(() => {
    return type === "ai" && pastSteps && pastSteps.length > 0;
  }, [type, pastSteps]);

  // Memoize the message content based on type
  const messageContent = useMemo(() => {
    // If this is a completed planner message, show the PlanningStep component AND the regular content
    if (isCompletedPlanner) {
      return (
        <>
          <PlanningStep message={msg} messageId={item.message._id} />
          <AiMessageContent message={msg} messageId={item.message._id} />
        </>
      );
    }

    // Regular message (AI, tool, or unknown)
    return <AiMessageContent message={msg} messageId={item.message._id} />;
  }, [isCompletedPlanner, msg, item.message._id]);

  return <div className="flex flex-col gap-1">{messageContent}</div>;
});

AiMessage.displayName = "AiMessage";
