import { memo, useMemo, useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AiMessageContent } from "./ai-message";
import { mapStoredMessagesToChatMessages } from "@langchain/core/messages";
import type { BaseMessage } from "@langchain/core/messages";
import { Separator } from "@/components/ui/separator";
import { Check, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import {
  scaleIn,
  fadeInUp,
  staggerContainer,
  buttonHover,
  iconSpinVariants,
  smoothTransition,
} from "@/lib/motion";

interface PlanningStepProps {
  message?: BaseMessage;
  messageId: string;
  isStreaming?: boolean;
}

export const PlanningStep = memo(
  ({ message, messageId, isStreaming }: PlanningStepProps) => {
    const [isMinimized, setIsMinimized] = useState(false);
    const [userHasScrolledSteps, setUserHasScrolledSteps] = useState(false);
    const [userHasScrolledMessages, setUserHasScrolledMessages] =
      useState(false);

    // Debug log to check streaming state
    console.log(
      "PlanningStep - isStreaming:",
      isStreaming,
      "messageId:",
      messageId,
    );
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const stepsContainerRef = useRef<HTMLDivElement>(null);

    const pastStepsData = useMemo(() => {
      if (!message || !Array.isArray(message.additional_kwargs.pastSteps)) {
        return null;
      }
      const steps = message.additional_kwargs.pastSteps?.map((pastStep) => {
        if (!Array.isArray(pastStep) || pastStep.length === 0) {
          return null;
        }

        const [step, _storedMessages] = pastStep;
        return step;
      });
      return steps.length > 0
        ? (steps?.filter(Boolean) as string[])
        : ["Planning..."];
    }, [message]);

    const pastSteps = useMemo(() => {
      if (!pastStepsData) {
        return null;
      }
      return pastStepsData?.map((step, index) => {
        return (
          <div
            key={`${messageId}-past-step-${index}`}
            className="flex items-start gap-2"
          >
            <div className="flex-shrink-0 w-5 h-5 bg-input rounded-full flex items-center justify-center mt-0.5">
              {isStreaming && index === pastStepsData.length - 1 ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3 text-foreground-muted" />
              )}
            </div>
            <div className="text-sm text-muted-foreground flex-1 min-w-0 break-all whitespace-pre-wrap">
              {step}
            </div>
          </div>
        );
      });
    }, [pastStepsData, messageId, isStreaming]);

    const stepMessages = useMemo(() => {
      if (!message || !Array.isArray(message.additional_kwargs.pastSteps)) {
        return null;
      }
      const messages = message.additional_kwargs.pastSteps
        .map((pastStep) => {
          if (!Array.isArray(pastStep)) {
            return null;
          }
          const [_step, storedMessages] = pastStep;
          if (!Array.isArray(storedMessages)) {
            return null;
          }
          return mapStoredMessagesToChatMessages(storedMessages);
        })
        .flat()
        .filter((m): m is BaseMessage => !!m);

      return messages.map((pastStep, index) => {
        return (
          <AiMessageContent
            key={`${messageId}-step-${index}`}
            message={pastStep}
            messageId={`${messageId}-step-${index}`}
          />
        );
      });
    }, [message, messageId]);

    // Handle scroll events to detect user interaction
    const handleStepsScroll = () => {
      if (stepsContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } =
          stepsContainerRef.current;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5; // 5px tolerance
        setUserHasScrolledSteps(!isAtBottom);
      }
    };

    const handleMessagesScroll = () => {
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } =
          scrollContainerRef.current;
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5; // 5px tolerance
        setUserHasScrolledMessages(!isAtBottom);
      }
    };

    useEffect(() => {
      if (isStreaming && !isMinimized) {
        // Only auto-scroll if user hasn't manually scrolled away from bottom
        if (scrollContainerRef.current && !userHasScrolledMessages) {
          scrollContainerRef.current.scrollTop =
            scrollContainerRef.current.scrollHeight;
        }
        if (stepsContainerRef.current && !userHasScrolledSteps) {
          stepsContainerRef.current.scrollTop =
            stepsContainerRef.current.scrollHeight;
        }
      }
    }, [
      isStreaming,
      isMinimized,
      stepMessages,
      pastSteps,
      userHasScrolledSteps,
      userHasScrolledMessages,
    ]);

    // Reset scroll tracking when streaming stops
    useEffect(() => {
      if (!isStreaming) {
        setUserHasScrolledSteps(false);
        setUserHasScrolledMessages(false);
      }
    }, [isStreaming]);

    const lastStep =
      pastStepsData && pastStepsData.length > 0
        ? pastStepsData[pastStepsData.length - 1]
        : "Planning...";

    const streamingContainerClasses = isStreaming
      ? "bg-gradient-to-r from-indigo-500/30 via-purple-500/30 to-pink-500/30 p-0.5 pulsing-border-color"
      : "border bg-card";

    if (isMinimized) {
      return (
        <motion.div
          variants={scaleIn}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={smoothTransition}
          className={`rounded-lg p-4 flex justify-between items-center ${streamingContainerClasses}`}
        >
          <div className="text-sm font-semibold flex items-center gap-2">
            <div className="flex-shrink-0 w-5 h-5 bg-input rounded-full flex items-center justify-center">
              {isStreaming ? (
                <motion.div
                  variants={iconSpinVariants}
                  animate="animate"
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="w-3 h-3" />
                </motion.div>
              ) : (
                <Check className="w-3 h-3 text-foreground-muted" />
              )}
            </div>
            {lastStep}
          </div>
          <motion.button
            onClick={() => setIsMinimized(false)}
            className="p-1 rounded-md hover:bg-muted"
            variants={buttonHover}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
          >
            <ChevronDown className="w-4 h-4" />
          </motion.button>
        </motion.div>
      );
    }

    return (
      <motion.div
        className={`relative rounded-lg ${streamingContainerClasses}`}
        variants={fadeInUp}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={smoothTransition}
      >
        <div className={`rounded-[7px] p-4 flex flex-row bg-card`}>
          <motion.div
            className="flex flex-col w-1/3"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
          >
            <div className="text-sm font-semibold">Orchestrator</div>
            <Separator className="my-2" />
            <div
              ref={stepsContainerRef}
              className="flex flex-col gap-1 pr-4 max-h-[36rem] overflow-y-auto"
              onScroll={handleStepsScroll}
            >
              <AnimatePresence>{pastSteps}</AnimatePresence>
            </div>
          </motion.div>
          <div className="border-l" />
          <motion.div
            ref={scrollContainerRef}
            className="flex flex-col gap-1 w-2/3 pl-4 max-h-[36rem] overflow-y-auto"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            onScroll={handleMessagesScroll}
          >
            <AnimatePresence>{stepMessages}</AnimatePresence>
          </motion.div>
        </div>
        <motion.button
          onClick={() => setIsMinimized(true)}
          className="absolute bottom-2 left-2 p-1 rounded-md bg-card hover:bg-muted border"
          variants={buttonHover}
          initial="rest"
          whileHover="hover"
          whileTap="tap"
        >
          <ChevronUp className="w-4 h-4" />
        </motion.button>
      </motion.div>
    );
  },
);

PlanningStep.displayName = "PlanningStep";
