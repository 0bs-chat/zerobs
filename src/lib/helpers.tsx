import {
  FileTextIcon,
  ImageIcon,
  AudioLinesIcon,
  VideoIcon,
  FileIcon,
  Loader2Icon,
  LinkIcon,
  GlobeIcon,
  YoutubeIcon,
  AlertCircleIcon,
} from "lucide-react";
import type { Doc } from "convex/_generated/dataModel";
import {
  BaseMessage,
  HumanMessage,
  AIMessage,
  ToolMessage,
} from "@langchain/core/messages";

export const getTagInfo = (
  tag: string,
  status?: Doc<"documents">["status"],
  supportedModalities: string[] = []
) => {
  if (status && status === "processing" && !supportedModalities.includes(tag)) {
    return {
      icon: Loader2Icon,
      className: "text-gray-500 animate-spin",
    };
  }

  if (status && status === "error") {
    return {
      icon: AlertCircleIcon,
      className: "text-red-500",
    };
  }

  switch (tag) {
    case "text":
      return {
        icon: FileTextIcon,
        className: "text-blue-500/40",
      };
    case "image":
      return { icon: ImageIcon, className: "text-green-500/40" };
    case "audio":
      return {
        icon: AudioLinesIcon,
        className: "text-purple-500/40",
      };
    case "video":
      return { icon: VideoIcon, className: "text-red-500/40" };
    case "pdf":
      return { icon: FileIcon, className: "text-orange-500/40" };
    case "file":
      return { icon: FileIcon, className: "text-yellow-500/40" };
    case "url":
      return { icon: LinkIcon, className: "text-blue-500/40" };
    case "site":
      return { icon: GlobeIcon, className: "text-green-500/40" };
    case "youtube":
      return { icon: YoutubeIcon, className: "text-red-500/40" };
    default:
      return { icon: FileIcon, className: "text-gray-500/40" };
  }
};

// Convert Convex chatMessage document to LangChain BaseMessage
export function convexMessageToLangChain(
  convexMessage: Doc<"chatMessages">
): BaseMessage {
  try {
    // Parse the stored message JSON
    const parsedMessage = JSON.parse(convexMessage.message);

    // Reconstruct the appropriate LangChain message type based on the parsed data
    if (parsedMessage._getType) {
      switch (parsedMessage._getType()) {
        case "human":
          return new HumanMessage({
            content: parsedMessage.content,
            id: convexMessage._id,
            additional_kwargs: parsedMessage.additional_kwargs || {},
          });
        case "ai":
          return new AIMessage({
            content: parsedMessage.content,
            id: convexMessage._id,
            additional_kwargs: parsedMessage.additional_kwargs || {},
          });
        case "tool":
          return new ToolMessage({
            content: parsedMessage.content,
            tool_call_id: parsedMessage.tool_call_id || "",
            name: parsedMessage.name || "",
            id: convexMessage._id,
            additional_kwargs: parsedMessage.additional_kwargs || {},
          });
        default:
          // Fallback to HumanMessage for unknown types
          return new HumanMessage({
            content:
              typeof parsedMessage.content === "string"
                ? parsedMessage.content
                : JSON.stringify(parsedMessage.content),
            id: convexMessage._id,
          });
      }
    }

    // If no _getType method, try to infer from content structure
    if (parsedMessage.tool_call_id || parsedMessage.name) {
      return new ToolMessage({
        content: parsedMessage.content || "",
        tool_call_id: parsedMessage.tool_call_id || "",
        name: parsedMessage.name || "",
        id: convexMessage._id,
      });
    }

    // Default to HumanMessage if we can't determine the type
    return new HumanMessage({
      content: parsedMessage.content || "",
      id: convexMessage._id,
    });
  } catch (error) {
    console.error("Failed to parse Convex message:", error);
    // Fallback: treat as plain text HumanMessage
    return new HumanMessage({
      content: convexMessage.message,
      id: convexMessage._id,
    });
  }
}

// Convert array of Convex messages to LangChain messages
export function convexMessagesToLangChain(
  convexMessages: Doc<"chatMessages">[]
): BaseMessage[] {
  return convexMessages.map(convexMessageToLangChain);
}

// Group LangChain messages by consecutive message types
export function groupLangChainMessages(
  messages: BaseMessage[]
): BaseMessage[][] {
  if (messages.length === 0) return [];

  const grouped: BaseMessage[][] = [];
  let currentGroup: BaseMessage[] = [];

  const getGroupType = (message: BaseMessage) => {
    if (message instanceof HumanMessage) return "user";
    if (message instanceof AIMessage || message instanceof ToolMessage)
      return "ai/tool";
    return "other";
  };

  const validMessages = messages.filter(
    (message) => getGroupType(message) !== "other"
  );

  for (const message of validMessages) {
    const messageType = getGroupType(message);

    if (currentGroup.length === 0) {
      currentGroup.push(message);
    } else {
      const currentGroupType = getGroupType(currentGroup[0]);
      if (messageType === currentGroupType) {
        currentGroup.push(message);
      } else {
        grouped.push(currentGroup);
        currentGroup = [message];
      }
    }
  }

  if (currentGroup.length > 0) {
    grouped.push(currentGroup);
  }

  return grouped;
}

// Convert backend pastSteps format to CompletedStep format
export function convertPastStepsToCompletedSteps(
  pastSteps: { step: string; message: string }[]
): any[] {
  return pastSteps.map((stepData) => {
    try {
      // Try to parse the message as a LangChain message
      const parsedMessage = JSON.parse(stepData.message);

      // Create a simple step object and message
      const step = stepData.step;
      const message = new AIMessage({
        content:
          typeof parsedMessage.content === "string"
            ? parsedMessage.content
            : JSON.stringify(parsedMessage.content),
        additional_kwargs: parsedMessage.additional_kwargs || {},
      });

      return [step, message];
    } catch (error) {
      // If parsing fails, create a simple structure
      console.warn("Failed to parse past step message:", error);
      return [
        stepData.step,
        new AIMessage({
          content: stepData.message,
        }),
      ];
    }
  });
}
