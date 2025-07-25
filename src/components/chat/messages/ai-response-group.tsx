import { motion, AnimatePresence } from "motion/react";
import { AiMessage } from "./ai-message";
import { UtilsBar } from "./utils-bar";
import { ChevronUp, ChevronDown, Loader2 } from "lucide-react";
import { springTransition } from "@/lib/motion";
import type { MessageGroup } from "../../../../convex/chatMessages/helpers";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";

interface AiResponseGroupProps {
  group: MessageGroup;
  groupedMessages: MessageGroup[];
}

export const AiResponseGroup = (props: AiResponseGroupProps) => {
  const { group, groupedMessages } = props;
  const minimized = group.input.message.minimized ?? false;
  const [loading, setLoading] = useState(false);
  const toggleMinimized = useMutation(api.chatMessages.mutations.toggleMinimized);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await toggleMinimized({ id: group.input.message._id });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col gap-1 group relative${!minimized ? '' : ' opacity-50'}`}>
      <button
        type="button"
        onClick={handleToggle}
        className={`z-10 p-1 bg-background/80 rounded-full hover:bg-accent transition-colors
          absolute top-0 left-0 transform -translate-x-[2rem] ${!minimized ? 'opacity-0' : 'opacity-100'}
          group-hover:opacity-100
          group-hover:bg-background/80
          group-hover:hover:bg-accent
          group-hover:hover:bg-accent
          `}
        aria-label={!minimized ? "Collapse" : "Expand"}
        disabled={loading}
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : !minimized ? (
          <ChevronUp size={18} />
        ) : (
          <ChevronDown size={18} />
        )}
      </button>
      <AnimatePresence initial={false}>
        {!minimized && (
          <motion.div
            key="ai-group"
            data-slot="ai-response-group"
            initial="collapsed"
            animate="open"
            exit="collapsed"
            variants={{
              open: { opacity: 1, height: "auto" },
              collapsed: { opacity: 0, height: 0 },
            }}
            transition={{ duration: 0.2, ease: [0.04, 0.62, 0.23, 0.98] }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-1">
              {group.response.map((response, index) => {
                return (
                  <motion.div
                    key={`${response.message._id}-${index}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1, ...springTransition }}
                  >
                    <AiMessage item={response} />
                  </motion.div>
                );
              })}
              {group.response.length > 0 && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <UtilsBar
                    item={group.input}
                    isAI={true}
                    groupedMessages={groupedMessages}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};