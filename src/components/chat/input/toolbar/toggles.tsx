import { Toggle } from "@/components/ui/toggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { FileIcon, Globe2Icon, Network, Binoculars } from "lucide-react";
import { newChatAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";
import { motion } from "motion/react";
import { buttonHover, smoothTransition } from "@/lib/motion";
import type { ReactNode } from "react";

// Generic toggle component
interface ToggleProps {
  chatId: Id<"chats">;
  pressed: boolean;
  onPressedChange: () => void;
  icon: ReactNode;
  label: string;
  tooltip?: string;
  className?: string;
  animation?: "scale" | "rotate" | "none";
}

const GenericToggle = ({
  pressed,
  onPressedChange,
  icon,
  label,
  tooltip,
  className = "",
  animation = "scale",
}: ToggleProps) => {
  const getAnimationProps = () => {
    switch (animation) {
      case "scale":
        return {
          scale: pressed ? 1.1 : 1,
          y: pressed ? -2 : 0,
        };
      case "rotate":
        return {
          rotate: pressed ? 360 : 0,
        };
      default:
        return {};
    }
  };

  const getAnimationDuration = () => {
    switch (animation) {
      case "scale":
        return { duration: 0.2 };
      case "rotate":
        return { duration: 0.3 };
      default:
        return { duration: 0.2 };
    }
  };

  const toggleContent = (
    <motion.div
      variants={buttonHover}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      transition={smoothTransition}
    >
      <Toggle
        variant="outline"
        className={`transition-all duration-300 ${className}`}
        pressed={pressed}
        onPressedChange={onPressedChange}
      >
        <motion.div
          animate={getAnimationProps()}
          transition={getAnimationDuration()}
        >
          {icon}
        </motion.div>
        {label}
      </Toggle>
    </motion.div>
  );

  if (tooltip) {
    return (
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>{toggleContent}</TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return toggleContent;
};

// Artifacts Toggle
export const ArtifactsToggle = ({
  chatId,
  artifacts,
}: {
  chatId: Id<"chats">;
  artifacts?: boolean;
}) => {
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const setNewChat = useSetAtom(newChatAtom);

  const handleToggle = () => {
    if (chatId === "new") {
      setNewChat((prev) => ({ ...prev, artifacts: !prev.artifacts }));
    } else {
      updateChatMutation({
        chatId,
        updates: {
          artifacts: !artifacts,
        },
      });
    }
  };

  return (
    <GenericToggle
      chatId={chatId}
      pressed={artifacts ?? false}
      onPressedChange={handleToggle}
      icon={<FileIcon className="h-4 w-4" />}
      label="Artifacts"
      animation="scale"
    />
  );
};

// Web Search Toggle
export const WebSearchToggle = ({
  chatId,
  webSearch,
}: {
  chatId: Id<"chats">;
  webSearch?: boolean;
}) => {
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const setNewChat = useSetAtom(newChatAtom);

  const handleToggle = () => {
    if (chatId === "new") {
      setNewChat((prev) => ({ ...prev, webSearch: !prev.webSearch }));
    } else {
      updateChatMutation({
        chatId,
        updates: {
          webSearch: !webSearch,
        },
      });
    }
  };

  return (
    <GenericToggle
      chatId={chatId}
      pressed={webSearch ?? false}
      onPressedChange={handleToggle}
      icon={<Globe2Icon className="h-4 w-4" />}
      label=""
      tooltip="Search the web"
      className={webSearch ? "bg-accent text-accent-foreground" : ""}
      animation="rotate"
    />
  );
};

// Conductor Toggle
export const ConductorToggle = ({
  chatId,
  conductorMode,
}: {
  chatId: Id<"chats">;
  conductorMode: boolean;
}) => {
  const setNewChat = useSetAtom(newChatAtom);
  const updateChatMutation = useMutation(api.chats.mutations.update);

  const handleToggle = () => {
    if (chatId === "new") {
      setNewChat((prev) => ({
        ...prev,
        conductorMode: !prev.conductorMode,
      }));
    } else {
      updateChatMutation({
        chatId,
        updates: { conductorMode: !conductorMode },
      });
    }
  };

  return (
    <GenericToggle
      chatId={chatId}
      pressed={conductorMode}
      onPressedChange={handleToggle}
      icon={<Network className="h-4 w-4" />}
      label="Conductor"
      animation="scale"
    />
  );
};

// Orchestrator Toggle
export const OrchestratorToggle = ({
  chatId,
  orchestratorMode,
}: {
  chatId: Id<"chats">;
  orchestratorMode?: boolean;
}) => {
  const updateChatMutation = useMutation(api.chats.mutations.update);
  const setNewChat = useSetAtom(newChatAtom);

  const handleToggle = () => {
    if (chatId === "new") {
      setNewChat((prev) => ({
        ...prev,
        orchestratorMode: !prev.orchestratorMode,
      }));
    } else {
      updateChatMutation({
        chatId,
        updates: {
          orchestratorMode: !orchestratorMode,
        },
      });
    }
  };

  return (
    <GenericToggle
      chatId={chatId}
      pressed={orchestratorMode ?? false}
      onPressedChange={handleToggle}
      icon={<Binoculars className="h-4 w-4" />}
      label="Orchestrator"
      animation="scale"
    />
  );
}; 