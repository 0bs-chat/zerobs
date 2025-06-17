import React from 'react';
import {
  FileIcon,
  CodeIcon,
  GlobeIcon,
  FileTextIcon,
  ImageIcon,
  BarChart3Icon,
  EyeIcon,
  CopyIcon,
  CheckIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCopy } from "@/hooks/use-copy";
import type { Artifact } from './utils';

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
      return "React Component";
    case "text/html":
      return "HTML Page";
    case "application/vnd.ant.code":
      return language ? `${language.toUpperCase()} Code` : "Code";
    case "text/markdown":
      return "Markdown Document";
    case "image/svg+xml":
      return "SVG Image";
    case "application/vnd.ant.mermaid":
      return "Mermaid Diagram";
    default:
      return "Artifact";
  }
};

interface ArtifactCardProps {
  artifact: Artifact;
  onView: (artifact: Artifact) => void;
}

export const ArtifactCard = React.memo(({ artifact, onView }: ArtifactCardProps) => {
  const { Icon, className } = getArtifactIcon(artifact.type, artifact.language);
  const { copy, copied } = useCopy({ duration: 2000 });
  
  const handleCopy = () => {
    copy(artifact.content);
  };

  const handleView = () => {
    onView(artifact);
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${className}`} />
            <CardTitle className="text-sm font-medium truncate">
              {artifact.title}
            </CardTitle>
          </div>
          <Badge variant="secondary" className="text-xs">
            {getTypeName(artifact.type, artifact.language)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            ID: {artifact.id}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleView}
              className="h-8 px-2"
            >
              <EyeIcon className="w-3 h-3 mr-1" />
              View
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-8 px-2"
            >
              {copied ? (
                <CheckIcon className="w-3 h-3" />
              ) : (
                <CopyIcon className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

ArtifactCard.displayName = "ArtifactCard"; 