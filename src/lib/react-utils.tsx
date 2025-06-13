import { FileTextIcon, ImageIcon, AudioLinesIcon, VideoIcon, FileIcon, Loader2Icon, LinkIcon, GlobeIcon, YoutubeIcon } from "lucide-react";
import type { Doc } from "convex/_generated/dataModel";

export const getTagInfo = (tag: string, status?: Doc<"documents">["status"], supportedModalities: string[] = []) => {
  if (status && status === "processing" && !supportedModalities.includes(tag)) {
    return {
      icon: Loader2Icon,
      className: "text-gray-500 animate-spin",
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