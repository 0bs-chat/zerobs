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
  HammerIcon,
} from "lucide-react";
import type { Doc } from "../../convex/_generated/dataModel";

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
        className: "text-blue-500 ",
      };
    case "image":
      return {
        icon: ImageIcon,
        className: "text-green-500 ",
      };
    case "audio":
      return {
        icon: AudioLinesIcon,
        className: "text-purple-500  ",
      };
    case "video":
      return { icon: VideoIcon, className: "text-red-500" };
    case "pdf":
      return {
        icon: FileIcon,
        className: "text-orange-500 bg-orange-500/30",
      };
    case "file":
      return {
        icon: FileIcon,
        className: "text-yellow-500 ",
      };
    case "url":
      return {
        icon: LinkIcon,
        className: "text-blue-500 ",
      };
    case "site":
      return {
        icon: GlobeIcon,
        className: "text-green-500 ",
      };
    case "youtube":
      return { icon: YoutubeIcon, className: "text-red-500" };
    default:
      return { icon: FileIcon, className: "text-gray-500" };
  }
};

export const getModalityIcon = (modality: string) => {
  switch (modality) {
    case "text":
      return {
        icon: FileTextIcon,
        className: "text-blue-500 ",
      };
    case "image":
      return {
        icon: ImageIcon,
        className: "text-green-500 ",
      };
    case "pdf":
      return {
        icon: FileIcon,
        className: "text-purple-500",
      };
    case "tools":
      return {
        icon: HammerIcon,
        className: "text-gray-500",
      };
    default:
      return {
        icon: FileIcon,
        className: "text-gray-500",
      };
  }
};
