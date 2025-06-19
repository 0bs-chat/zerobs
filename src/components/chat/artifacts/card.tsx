import React from "react";
import {
  FileIcon,
  CodeIcon,
  GlobeIcon,
  FileTextIcon,
  ImageIcon,
  BarChart3Icon,
  EyeIcon,
  CopyIcon,
  CheckIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCopy } from "@/hooks/use-copy";
import type { Artifact } from "./utils";
import { useAtomValue } from "jotai";
import { selectedArtifactIdAtom } from "@/store/chatStore";

// Get appropriate icon for artifact type
const getArtifactIcon = (type: string, language?: string) => {
  switch (type) {
    case "application/vnd.ant.react":
      return { Icon: CodeIcon, className: "text-blue-500" };
    case "text/html":
      return { Icon: GlobeIcon, className: "text-orange-500" };
    case "application/vnd.ant.code":
      return { Icon: CodeIcon, className: "text-green-500" };
    case "text/markdown":
      return { Icon: FileTextIcon, className: "text-purple-500" };
    case "image/svg+xml":
      return { Icon: ImageIcon, className: "text-pink-500" };
    case "application/vnd.ant.mermaid":
      return { Icon: BarChart3Icon, className: "text-indigo-500" };
    default:
      return { Icon: FileIcon, className: "text-gray-500" };
  }
};

// Get human-readable type name
const getTypeName = (type: string, language?: string): string => {
  switch (type) {
    case "application/vnd.ant.react":
      return "React";
    case "text/html":
      return "HTML";
    case "application/vnd.ant.code":
      return language ? `${language.toUpperCase()}` : "Code";
    case "text/markdown":
      return "Markdown";
    case "image/svg+xml":
      return "SVG";
    case "application/vnd.ant.mermaid":
      return "Mermaid";
    default:
      return "Artifact";
  }
};

interface ArtifactCardProps {
  artifact: Artifact;
  onView: (artifact: Artifact) => void;
}

export const ArtifactCard = React.memo(
  ({ artifact, onView }: ArtifactCardProps) => {
    const selectedArtifactId = useAtomValue(selectedArtifactIdAtom);
    const { Icon, className } = getArtifactIcon(
      artifact.type,
      artifact.language
    );
    const { copy, copied } = useCopy({ duration: 2000 });

    const handleCopy = () => {
      copy(artifact.content);
    };

    const handleView = () => {
      onView(artifact);
    };

    return (
      <Card
        className={`hover:shadow-md transition-shadow border-2 border-transparent ${
          selectedArtifactId === artifact.id
            ? "border-2  border-primary/50 "
            : ""
        }`}
      >
        <CardHeader className="py-1.5">
          <div className="flex items-center justify-between gap-2 max-w-full">
            <div className="flex items-center gap-2 min-w-1/2 flex-1">
              <Icon className={`w-5 h-5 ${className} flex-shrink-0`} />
              <CardTitle className="text-lg font-medium truncate">
                {artifact.title}
              </CardTitle>
            </div>
            <Badge
              variant="default"
              className="text-sm flex-shrink-0 max-w-[6rem] truncate"
            >
              {getTypeName(artifact.type, artifact.language)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleView}
              className="h-10 flex-1"
            >
              <EyeIcon className="w-3 h-3 mr-1" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-10 flex-1"
            >
              {copied ? (
                <CheckIcon className="w-3 h-3 mr-1" />
              ) : (
                <CopyIcon className="w-3 h-3 mr-1" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
);

ArtifactCard.displayName = "ArtifactCard";
