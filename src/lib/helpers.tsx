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
  Hammer,
} from "lucide-react";
import type { Doc } from "../../convex/_generated/dataModel";

export const getTagInfo = (
  tag: string,
  status?: Doc<"documents">["status"],
  supportedModalities: string[] = [],
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
        icon: FileTextIcon, // Keeping FileTextIcon as it's a text document icon, not FileIcon
        className: "text-blue-500/60",
        parentClassName: "bg-blue-100/20 backdrop-blur-sm",
      };
    case "image":
      return { icon: ImageIcon, className: "text-green-400/40", parentClassName: "bg-green-100/20 backdrop-blur-sm" };
    case "audio":
      return {
        icon: AudioLinesIcon,
        className: "text-purple-400/40",
        parentClassName: "bg-purple-100/20 backdrop-blur-sm",
      };
    case "video":
      return { icon: VideoIcon, className: "text-red-400/40", parentClassName: "bg-red-100/20 backdrop-blur-sm" };
    case "pdf":
      return { icon: FileIcon, className: "text-orange-400/40", parentClassName: "bg-orange-100/20 backdrop-blur-sm" };
    case "file":
      return { icon: FileIcon, className: "text-yellow-400/40", parentClassName: "bg-yellow-100/20 backdrop-blur-sm" };
    case "url":
      return { icon: LinkIcon, className: "text-blue-400/40", parentClassName: "bg-blue-100/20 backdrop-blur-sm" };
    case "site":
      return { icon: GlobeIcon, className: "text-green-400/40", parentClassName: "bg-green-100/20 backdrop-blur-sm" };
    case "youtube":
      return { icon: YoutubeIcon, className: "text-red-400/40", parentClassName: "bg-red-100/20 backdrop-blur-sm" };
    default:
      return { icon: FileIcon, className: "text-gray-400/40", parentClassName: "bg-gray-100/20 backdrop-blur-sm" };
  }
};

// Hammer tag info for tool support
export const hammerTagInfo = {
  icon: Hammer,
  className: "text-amber-500/60",
  parentClassName: "bg-amber-100/20 backdrop-blur-sm",
};
