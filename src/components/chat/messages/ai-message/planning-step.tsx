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
  layoutTransition,
  slowTransition,
} from "@/lib/motion";

interface PlanningStepProps {
  message?: BaseMessage;
  messageId: string;
  isStreaming?: boolean;
}

export const PlanningStep = memo(
  ({ message, messageId, isStreaming }: PlanningStepProps) => {
    const [isMinimized, setIsMinimized] = useState(true);
    const [userHasScrolledSteps, setUserHasScrolledSteps] = useState(false);
    const [userHasScrolledMessages, setUserHasScrolledMessages] =
      useState(false);

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
        const isActive = isStreaming && index === pastStepsData.length - 1;
        return (
          <motion.div
            key={`${messageId}-past-step-${index}`}
            layout
            transition={layoutTransition}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-start gap-2"
          >
            <div
              className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-[0.125em] ${isActive ? "bg-primary/20" : "bg-input"}`}
            >
              {isActive ? (
                <motion.div
                  variants={iconSpinVariants}
                  animate="animate"
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                </motion.div>
              ) : (
                <Check className="w-4 h-4" />
              )}
            </div>
            <div
              className={`text-sm flex-1 min-w-0 break-all whitespace-pre-wrap ${isActive ? "text-foreground" : "text-muted-foreground"}`}
            >
              {step}
            </div>
          </motion.div>
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

    const currentText = isStreaming
      ? lastStep
      : "orchestrator has completed the process";

    const streamingContainerClasses = isStreaming
      ? "border bg-card ring-1 ring-ring/20"
      : "border bg-card";

    if (isMinimized) {
      return (
        <motion.div
          variants={scaleIn}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={slowTransition}
          className={`rounded-lg ${streamingContainerClasses}`}
          whileHover={{ y: -1 }}
        >
          <div className="rounded-lg p-[1em] bg-card/90">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className=" font-semibold tracking-wide opacity-80">
                  Orchestrator
                </div>
                <div className="mt-[0.25em] overflow-hidden">
                  <div className="flex items-center gap-2">
                    <div className="relative h-10 text-sm text-foreground/90 w-full overflow-hidden">
                      <AnimatePresence mode="popLayout" initial={false}>
                        <motion.div
                          key={currentText}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={slowTransition}
                          className="absolute bottom-0 w-full truncate"
                          title={currentText}
                        >
                          <span className="inline-flex items-center gap-2">
                            {isStreaming && (
                              <motion.span
                                className="inline-flex text-foreground/80"
                                variants={iconSpinVariants}
                                animate="animate"
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                              >
                                <Loader2 className="w-4 h-4" />
                              </motion.span>
                            )}
                            <span className="text-foreground/80">
                              {currentText}
                            </span>
                          </span>
                        </motion.div>
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </div>
              <motion.button
                onClick={() => setIsMinimized(false)}
                className="p-1 rounded-md cursor-pointer hover:bg-muted self-start"
                variants={buttonHover}
                initial="rest"
                aria-label="Expand planning steps"
                title="Expand planning steps"
                whileHover="hover"
                whileTap="tap"
              >
                <ChevronDown className="w-4 h-4 text-foreground/80" />
              </motion.button>
            </div>
          </div>
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
            <div className=" font-semibold">Orchestrator</div>
            <Separator className="my-2" />
            <div
              ref={stepsContainerRef}
              className="flex flex-col gap-1 pr-4 max-h-[36rem] overflow-y-auto"
              onScroll={handleStepsScroll}
            >
              <AnimatePresence initial={false}>{pastSteps}</AnimatePresence>
            </div>
          </motion.div>
          <div className="border-l" />
          <motion.div
            ref={scrollContainerRef}
            className="flex flex-col text-foreground/80 gap-1 w-2/3 pl-4 max-h-[36rem] overflow-y-auto"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            onScroll={handleMessagesScroll}
          >
            <AnimatePresence initial={false}>{stepMessages}</AnimatePresence>
          </motion.div>
        </div>
        <motion.button
          onClick={() => setIsMinimized(true)}
          className="absolute bottom-2 cursor-pointer right-2 p-1 rounded-md bg-card hover:bg-muted border"
          variants={buttonHover}
          aria-label="Minimize planning steps"
          title="Minimize planning steps"
          initial="rest"
          whileHover="hover"
          whileTap="tap"
        >
          <ChevronUp className="w-4 h-4 text-foreground/80" />
        </motion.button>
      </motion.div>
    );
  }
);

PlanningStep.displayName = "PlanningStep";
