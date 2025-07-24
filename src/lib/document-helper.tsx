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
} from "lucide-react";
import type { Doc } from "../../convex/_generated/dataModel";
import mime from "mime";

export const getTagInfo = (
  document: Doc<"documents">,
  supportedModalities: string[] = [],
): {
  icon: React.ElementType;
  className: string;
  parentClassName?: string;
  tag: string;
} => {
  if (document.status === "processing" && !supportedModalities.includes(document.type)) {
    return {
      icon: Loader2Icon,
      className: "text-gray-500 animate-spin",
      tag: "processing",
    };
  }

  if (document.status === "error") {
    return {
      icon: AlertCircleIcon,
      className: "text-red-500",
      tag: "error",
    };
  }

  switch (document.type) {
    case "text":
      return {
        icon: FileTextIcon, // Keeping FileTextIcon as it's a text document icon, not FileIcon
        className: "text-blue-500",
        parentClassName: "bg-blue-100/20 backdrop-blur-sm",
        tag: "text"
      };
    case "file":
      const mimeType = mime.getType(document.name) || "";
      if (mimeType.startsWith("image/")) {
        return { icon: ImageIcon, className: "text-green-500", parentClassName: "bg-green-100/20 backdrop-blur-sm", tag: "image" };
      } else if (mimeType.startsWith("video/")) {
        return { icon: VideoIcon, className: "text-red-500", parentClassName: "bg-red-100/20 backdrop-blur-sm", tag: "video" };
      } else if (mimeType.startsWith("audio/")) {
        return { icon: AudioLinesIcon, className: "text-purple-500", parentClassName: "bg-purple-100/20 backdrop-blur-sm", tag: "audio" };
      } else if (mimeType.startsWith("text/")) {
        return { icon: FileTextIcon, className: "text-blue-500", parentClassName: "bg-blue-100/20 backdrop-blur-sm", tag: "text" };
      } else if (mimeType.startsWith("application/pdf")) {
        return { icon: FileIcon, className: "text-orange-500", parentClassName: "bg-orange-100/20 backdrop-blur-sm", tag: "pdf" };
      } else {
        return { icon: FileIcon, className: "text-yellow-500", parentClassName: "bg-yellow-100/20 backdrop-blur-sm", tag: "file" };
      }
    case "url":
      return { icon: LinkIcon, className: "text-blue-500", parentClassName: "bg-blue-100/20 backdrop-blur-sm", tag: "url" };
    case "site":
      return { icon: GlobeIcon, className: "text-green-500", parentClassName: "bg-green-100/20 backdrop-blur-sm", tag: "site" };
    case "youtube":
      return { icon: YoutubeIcon, className: "text-red-500", parentClassName: "bg-red-100/20 backdrop-blur-sm", tag: "youtube" };
    case "github":
      return { icon: GithubIcon, className: "text-gray-500", parentClassName: "bg-gray-100/20 backdrop-blur-sm", tag: "github" };
    default:
      return { icon: FileIcon, className: "text-gray-500", parentClassName: "bg-gray-100/20 backdrop-blur-sm", tag: "file" };
  }
};

// Hammer tag info for tool support
export const hammerTagInfo = {
  icon: <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Hammer_and_sickle_red_on_transparent.svg/250px-Hammer_and_sickle_red_on_transparent.svg.png" alt="hammer" className="w-4 h-4" />,
  className: "text-amber-500",
  parentClassName: "bg-amber-100/20 backdrop-blur-sm",
};

export const thinkingTagInfo = {
  icon: Brain,
  className: "text-amber-500",
  parentClassName: "bg-amber-100/20 backdrop-blur-sm",
};
