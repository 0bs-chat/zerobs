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
  Brain,
  GithubIcon,
  Hammer,
} from "lucide-react";
import type { Doc } from "../../convex/_generated/dataModel";
import mime from "mime";

export const getTagInfo = (
  tag: string,
): {
  icon: React.ElementType;
  className: string;
  parentClassName?: string;
  tag: string;
} => {
  switch (tag) {
    case "text":
      return {
        icon: FileTextIcon, // Keeping FileTextIcon as it's a text document icon, not FileIcon
        className: "text-blue-500",
        parentClassName: "bg-blue-100/20 backdrop-blur-sm",
        tag: "text"
      };
    case "image":
      return { icon: ImageIcon, className: "text-green-500", parentClassName: "bg-green-300/20 backdrop-blur-sm", tag: "image" };
    case "video":
      return { icon: VideoIcon, className: "text-red-500", parentClassName: "bg-red-300/20 backdrop-blur-sm", tag: "video" };
    case "audio":
      return { icon: AudioLinesIcon, className: "text-purple-500", parentClassName: "bg-purple-300/20 backdrop-blur-sm", tag: "audio" };
    case "pdf":
      return { icon: FileIcon, className: "text-orange-500", parentClassName: "bg-orange-300/20 backdrop-blur-sm", tag: "pdf" };
    case "url":
      return { icon: LinkIcon, className: "text-blue-500", parentClassName: "bg-blue-300/20 backdrop-blur-sm", tag: "url" };
    case "site":
      return { icon: GlobeIcon, className: "text-green-500", parentClassName: "bg-green-300/20 backdrop-blur-sm", tag: "site" };
    case "youtube":
      return { icon: YoutubeIcon, className: "text-red-500", parentClassName: "bg-red-300/20 backdrop-blur-sm", tag: "youtube" };
    case "github":
      return { icon: GithubIcon, className: "text-gray-500", parentClassName: "bg-gray-300/20 backdrop-blur-sm", tag: "github" };
    case "error":
      return { icon: AlertCircleIcon, className: "text-red-500", parentClassName: "bg-red-300/20 backdrop-blur-sm", tag: "error" };
    case "processing":
      return { icon: Loader2Icon, className: "text-gray-500 animate-spin", parentClassName: "bg-gray-300/20 backdrop-blur-sm", tag: "processing" };
    case "toolSupport":
      return { icon: Hammer, className: "text-blue-500", parentClassName: "bg-blue-300/20 backdrop-blur-sm", tag: "toolSupport" };
    case "thinking":
      return { icon: Brain, className: "text-purple-500", parentClassName: "bg-purple-300/20 backdrop-blur-sm", tag: "thinking" };
    case "file":
      return { icon: FileIcon, className: "text-gray-500", parentClassName: "bg-gray-300/20 backdrop-blur-sm", tag: "file" };
    default:
      return { icon: FileIcon, className: "text-gray-500", parentClassName: "bg-gray-300/20 backdrop-blur-sm", tag: "file" };
  }
};

export const getDocTagInfo = (
  document: Doc<"documents">,
  supportedModalities: string[] = [],
): {
  icon: React.ElementType;
  className: string;
  parentClassName?: string;
  tag: string;
} => {
  const mimeType = mime.getType(document.name) || "";
  let modality: string;
  if (mimeType.startsWith("image/")) {
    modality = "image";
  } else if (mimeType.startsWith("video/")) {
    modality = "video";
  } else if (mimeType.startsWith("audio/")) {
    modality = "audio";
  } else if (mimeType.startsWith("text/")) {
    modality = "text";
  } else if (mimeType.startsWith("application/pdf")) {
    modality = "pdf";
  } else {
    modality = "file";
  }
  if (document.status === "processing" && !supportedModalities.includes(modality)) {
    return getTagInfo("processing");
  }
  if (document.status === "error") {
    return getTagInfo("error");
  }
  return getTagInfo(modality);
};
