import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AiMessageContent } from "./ai-message/ai-message";
import { ToolMessage } from "./ai-message/tool-message";
import { PlanningStep } from "./ai-message/planning-step";
import {
  AIMessage,
  ToolMessage as LangChainToolMessage,
  mapChatMessagesToStoredMessages,
} from "@langchain/core/messages";
import { useAtomValue } from "jotai";
import { useStreamAtom } from "@/store/chatStore";
import { streamingVariants, springTransition } from "@/lib/motion";

export const StreamingMessage = memo(() => {
  const streamData = useAtomValue(useStreamAtom);
  const messageId = "streaming-message";

  const langchainMessages = useMemo(() => {
    return streamData?.chunkGroups
      .map((chunk, index, array) => {
        if (chunk?.type === "ai") {
          return new AIMessage({
            content: chunk.content,
            additional_kwargs: chunk.reasoning
              ? { reasoning_content: chunk.reasoning }
              : {},
          });
        }
        if (chunk?.type === "tool") {
          if (chunk.isComplete) {
            return new LangChainToolMessage({
              content: chunk.output as string,
              name: chunk.toolName,
              tool_call_id: `streaming-tool-${chunk.toolName}`,
              additional_kwargs: {
                input:
                  array[index - 1]?.type === "tool" &&
                  (array[index - 1] as any).input
                    ? JSON.parse(
                        JSON.stringify((array[index - 1] as any).input),
                      )
                    : undefined,
              },
            });
          } else {
            // return new AIMessage({
            //   content: "",
            //   tool_calls: [
            //     {
            //       id: `streaming-tool-${chunk.toolName}`,
            //       type: "tool_call",
            //       name: chunk.toolName,
            //       args: JSON.parse(JSON.stringify(chunk.input)),
            //     },
            //   ],
            // });
          }
        }
        return null;
      })
      .filter((m): m is AIMessage | LangChainToolMessage => !!m);
  }, [streamData?.chunkGroups]);

  const planningSteps = useMemo(() => {
    if (!streamData?.completedSteps || streamData.completedSteps.length === 0)
      return null;
    const message = new AIMessage({
      content: "",
      additional_kwargs: {
        pastSteps: [
          [
            streamData.completedSteps[0],
            mapChatMessagesToStoredMessages(langchainMessages!),
          ],
          ...streamData.completedSteps.slice(1).map((step) => [step, []]),
        ],
      },
    });
    return (
      <PlanningStep
        message={message}
        isStreaming={streamData?.status === "streaming"}
        messageId={messageId}
      />
    );
  }, [
    streamData?.completedSteps,
    langchainMessages,
    messageId,
    streamData?.status,
  ]);

  // Regular streaming display (no planning mode)
  const regularContent = useMemo(() => {
    return langchainMessages?.map((message, index) => {
      const isLastAiMessage = index === langchainMessages.length - 1 && message?.getType() === "ai";
      
      return (
        <motion.div
          key={index}
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
  }, [langchainMessages, messageId, streamData?.status]);

  if (streamData?.chunkGroups.length === 0) return null;

  return (
    <motion.div
      className="flex flex-col gap-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={springTransition}
    >
      <AnimatePresence>
        {planningSteps || regularContent}
      </AnimatePresence>
    </motion.div>
  );
});

StreamingMessage.displayName = "StreamingMessage";
