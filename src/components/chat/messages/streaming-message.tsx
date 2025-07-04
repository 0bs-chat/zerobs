import { memo, useMemo } from "react";
import { PlanningStep } from "./ai-message/planning-step";
import { ChunkRenderer } from "./chunk-renderer";
import type { useStream } from "@/hooks/chats/use-stream";
import { AIMessage, type StoredMessage } from "@langchain/core/messages";

export const StreamingMessage = memo(({ stream }: { stream: ReturnType<typeof useStream> }) => {
  // Early return if no streaming data
  const shouldRender = useMemo(() => {
    return stream && stream.status === "streaming" && stream.chunkGroups?.length;
  }, [stream?.status, stream?.chunkGroups?.length]);

  // Check if plannerAgent is currently active by examining recent chunks
  const isPlannerActive = useMemo(() => {
    if (!stream?.streamState) return false;
    
    // Check if we have plan data or completed steps, which indicates planner mode
    return stream.streamState.plan?.length > 0 || stream.streamState.completedSteps?.length > 0;
  }, [stream?.streamState]);

  // Memoize the chunk groups using the reusable renderer
  const renderedChunks = useMemo(() => {
    if (!stream?.chunkGroups?.length) return null;
    
    return (
      <ChunkRenderer
        chunkGroups={stream.chunkGroups}
        showTypingIndicator={true}
        messageIdPrefix="streaming"
      />
    );
  }, [stream?.chunkGroups]);

  // Render planner step component when planner is active
  const plannerComponent = useMemo(() => {
    if (!isPlannerActive || !stream?.streamState) return null;
    
    // Construct pastSteps properly
    const pastSteps = [
      // Add completed steps
      ...stream.streamState.completedSteps.map((pastStep) => {
        // Check if pastStep is already an array or needs parsing
        if (Array.isArray(pastStep)) {
          return [pastStep[0], []];
        } else {
          try {
            const [step, _storedMessages] = JSON.parse(pastStep) as [string, StoredMessage[]];
            return [step, []];
          } catch (e) {
            // If parsing fails, treat it as a simple string step
            return [pastStep, []];
          }
        }
      }),
      // Add current plan steps (if any)
      ...[(stream.streamState.plan?.flat() || []).map((step) => [step, []])[0]]
    ];
    
    console.log(pastSteps);
    return (
      <PlanningStep
        messageId={`streaming-${stream.streamState.plan?.length || 0}`}
        message={new AIMessage({
          content: "",
          additional_kwargs: {
            pastSteps,
            chunkGroups: stream.chunkGroups || [],
          }
        })}
      />
    );
  }, [isPlannerActive, stream?.streamState, stream?.chunkGroups]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div>
      {isPlannerActive ? (
        // When planner is active, show everything inside the planning component
        plannerComponent
      ) : (
        // Normal streaming - show chunks normally
        renderedChunks
      )}
    </div>
  );
});

StreamingMessage.displayName = "StreamingMessage";
