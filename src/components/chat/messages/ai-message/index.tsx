import { memo, useMemo } from "react";
import { PlanningStep } from "./planning-step";
import { AiMessageContent } from "./ai-message-content";
import type { MessageBranchNavigation } from "../user-message";
import type { MessageWithBranchInfo } from "../../../../hooks/chats/use-messages";

interface AiMessageProps {
  item: MessageWithBranchInfo;
  navigateBranch: MessageBranchNavigation;
}

export const AiMessage = memo(({ item, navigateBranch }: AiMessageProps) => {
  const msg = item.message.message;
  const type = msg?.getType?.();
  const pastSteps = msg?.additional_kwargs?.pastSteps as Array<[string, any[]]> | undefined;

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
          <PlanningStep
            message={msg}
            messageId={item.message._id}
          />
          <AiMessageContent
            message={msg}
            messageId={item.message._id}
            showReasoning={true}
          />
        </>
      );
    }

    // Regular message (AI, tool, or unknown)
    return (
      <AiMessageContent
        message={msg}
        messageId={item.message._id}
        showReasoning={true}
      />
    );
  }, [isCompletedPlanner, msg, item.message._id]);

  // Memoize branch navigation buttons to prevent unnecessary re-renders
  const branchNavigation = useMemo(() => {
    if (item.totalBranches <= 1) return null;

    return (
      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
        <span>
          Branch: {item.branchIndex}/{item.totalBranches}
        </span>
        <button
          onClick={() => navigateBranch(item.depth, "prev")}
          className="px-2 py-1 rounded border hover:bg-accent transition-colors"
          aria-label="Previous branch"
        >
          ←
        </button>
        <button
          onClick={() => navigateBranch(item.depth, "next")}
          className="px-2 py-1 rounded border hover:bg-accent transition-colors"
          aria-label="Next branch"
        >
          →
        </button>
      </div>
    );
  }, [item.totalBranches, item.branchIndex, item.depth, navigateBranch]);

  return (
    <div>
      {messageContent}
      {branchNavigation}
    </div>
  );
});

AiMessage.displayName = "AiMessage";
