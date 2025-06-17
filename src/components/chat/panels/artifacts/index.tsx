import React, { useMemo } from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useCheckpointParser } from "@/hooks/use-chats";
import { AIMessage } from "@langchain/core/messages";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { useCopy } from "@/hooks/use-copy";
import { ArtifactViewer } from "./viewer";

// Define artifact types
export interface Artifact {
  id: string;
  type: string;
  title: string;
  content: string;
  language?: string;
  messageIndex: number;
  createdAt: Date;
}

// Parse artifacts from AI message content
const parseArtifacts = (content: string, messageIndex: number): Artifact[] => {
  const artifactRegex = /<artifact\s+id="([^"]+)"\s+type="([^"]+)"(?:\s+language="([^"]+)")?\s+title="([^"]+)"[^>]*>([\s\S]*?)<\/artifact>/g;
  const artifacts: Artifact[] = [];
  let match;

  while ((match = artifactRegex.exec(content)) !== null) {
    const [, id, type, language, title, artifactContent] = match;
    artifacts.push({
      id,
      type,
      language,
      title,
      content: artifactContent.trim(),
      messageIndex,
      createdAt: new Date(), // In a real app, this would come from message timestamp
    });
  }

  return artifacts;
};

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

const ArtifactCard = React.memo(({ artifact, onView }: ArtifactCardProps) => {
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

const ArtifactsList = ({ onSelectArtifact }: { onSelectArtifact: (artifact: Artifact) => void }) => {
  const params = useParams({
    from: "/chat_/$chatId/",
  });
  
  const checkpoint = useQuery(api.chats.queries.getCheckpoint, {
    chatId: params.chatId as Id<"chats"> | "new",
    paginationOpts: {
      numItems: 50, // Get more messages to find artifacts
      cursor: null,
    },
  });

  const parsedCheckpoint = useCheckpointParser({ checkpoint });

  // Extract all artifacts from AI messages
  const artifacts = useMemo(() => {
    if (!parsedCheckpoint?.messages) return [];

    const allArtifacts: Artifact[] = [];
    const seenIds = new Set<string>();

    parsedCheckpoint.messages.forEach((message, index) => {
      if (message instanceof AIMessage) {
        const content = typeof message.content === "string" 
          ? message.content 
          : Array.isArray(message.content)
            ? message.content.map((item: any) => 
                item.type === "text" ? item.text : ""
              ).join("")
            : String(message.content);

        const messageArtifacts = parseArtifacts(content, index);
        
        // Only add artifacts with unique IDs (latest version wins)
        messageArtifacts.forEach(artifact => {
          if (!seenIds.has(artifact.id)) {
            seenIds.add(artifact.id);
            allArtifacts.push(artifact);
          }
        });
      }
    });

    // Sort by message index (newest first)
    return allArtifacts.sort((a, b) => b.messageIndex - a.messageIndex);
  }, [parsedCheckpoint?.messages]);

  if (params.chatId === "new") {
    return (
      <div className="flex items-center justify-center h-32 text-center">
        <div className="text-sm text-muted-foreground">
          Start a conversation to see artifacts
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Artifacts</h3>
          <p className="text-xs text-muted-foreground">
            Interactive content from this conversation
          </p>
        </div>
        {artifacts.length > 0 && (
          <Badge variant="secondary">
            {artifacts.length}
          </Badge>
        )}
      </div>

      <Separator />

      <ScrollArea className="h-[400px]">
        {artifacts.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-center">
            <div className="text-sm text-muted-foreground">
              No artifacts found in this conversation
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {artifacts.map((artifact) => (
              <ArtifactCard
                key={`${artifact.id}-${artifact.messageIndex}`}
                artifact={artifact}
                onView={onSelectArtifact}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export const ArtifactsPanel = () => {
  const [selectedArtifact, setSelectedArtifact] = React.useState<Artifact | null>(null);

  const handleCloseViewer = () => {
    setSelectedArtifact(null);
  };

  // If an artifact is selected, show the viewer instead of the list
  if (selectedArtifact) {
    return (
      <ArtifactViewer
        artifact={selectedArtifact}
        onClose={handleCloseViewer}
      />
    );
  }

  // Otherwise show the artifacts list
  return <ArtifactsList onSelectArtifact={setSelectedArtifact} />;
}; 