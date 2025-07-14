import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AiMessageContent } from "./ai-message/ai-message";
import { ToolMessage } from "./ai-message/tool-message";
import { PlanningStep } from "./ai-message/planning-step";
import { useAtomValue } from "jotai";
import { useStreamAtom } from "@/store/chatStore";
import { streamingVariants, springTransition } from "@/lib/motion";

export const StreamingMessage = memo(() => {
  const streamData = useAtomValue(useStreamAtom);
  const messageId = "streaming-message";

  const planningSteps = useMemo(() => {
    if (!streamData?.planningStepsMessage) return null;

    return (
      <PlanningStep
        message={streamData.planningStepsMessage}
        isStreaming={streamData.isStreaming}
        messageId={messageId}
      />
    );
  }, [streamData?.planningStepsMessage, streamData?.isStreaming, messageId]);

  // Regular streaming display (no planning mode)
  const regularContent = useMemo(() => {
    if (!streamData?.langchainMessages) return [];

    return streamData.langchainMessages.map((message, index) => {
      const isLastAiMessage =
        index === streamData.langchainMessages!.length - 1 && message?.getType() === "ai";

      // Use message.id if available, otherwise fallback to type+index
      const key = message.id || `${message?.getType?.() ?? "msg"}-${index}`;

      return (
        <motion.div
          key={key}
          variants={streamingVariants}
          initial="initial"
          animate="animate"
          transition={{ delay: index * 0.1, ...springTransition }}
        >
          {message?.getType() === "ai" ? (
            <AiMessageContent
              message={message}
              messageId={`${messageId}-${index}`}
              isStreaming={isLastAiMessage}
            />
          ) : (
            <ToolMessage message={message!} />
          )}
        </motion.div>
      );
    });
  }, [streamData?.langchainMessages, messageId, streamData?.isStreaming]);

  if (!streamData?.chunkGroups || streamData.chunkGroups.length === 0) return null;

  return (
    <motion.div
      className="flex flex-col gap-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={springTransition}
    >
      <AnimatePresence>{planningSteps || regularContent}</AnimatePresence>
    </motion.div>
  );
});

StreamingMessage.displayName = "StreamingMessage";
