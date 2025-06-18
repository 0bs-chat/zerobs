import React from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  selectedArtifactAtom,
  useCheckpointParserAtom,
  useStreamAtom,
} from "@/store/chatStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArtifactViewer } from "./viewer";
import type { Artifact } from "../../artifacts/utils";
import { parseArtifacts } from "../../artifacts/utils";
import { ArtifactCard } from "../../artifacts/card";

const parseStreamingArtifacts = (
  streamingContent: string,
  baseMessageIndex: number,
): Artifact[] => {
  const artifacts: Artifact[] = [];
  if (!streamingContent) return artifacts;

  const chunks = streamingContent.split(/<artifact/);

  for (let i = 1; i < chunks.length; i++) {
    const fullChunk = "<artifact" + chunks[i];
    const headerRegex =
      /<artifact\s+id="([^"]+)"\s+type="([^"]+)"(?:\s+language="([^"]+)")?\s+title="([^"]+)"[^>]*>/;
    const headerMatch = fullChunk.match(headerRegex);

    if (headerMatch) {
      const [, id, type, language, title] = headerMatch;
      const header = headerMatch[0];
      let artifactContent = fullChunk.substring(header.length);

      const endTag = "</artifact>";
      const endTagIndex = artifactContent.indexOf(endTag);
      if (endTagIndex !== -1) {
        artifactContent = artifactContent.substring(0, endTagIndex);
      }

      artifacts.push({
        id,
        type,
        language,
        title,
        content: artifactContent.trimStart(),
        messageIndex: baseMessageIndex,
        createdAt: new Date(),
      });
    }
  }
  return artifacts;
};

const ArtifactsList = ({
  artifacts,
  onSelectArtifact,
}: {
  artifacts: Artifact[];
  onSelectArtifact: (artifact: Artifact) => void;
}) => {
  if (artifacts.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-center">
        <div className="text-sm text-muted-foreground">
          No artifacts found in this conversation
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Artifacts</h3>
          <p className="text-xs text-muted-foreground">
            Interactive content from this conversation
          </p>
        </div>
        {artifacts.length > 0 && (
          <Badge variant="secondary">{artifacts.length}</Badge>
        )}
      </div>

      <Separator />

      <ScrollArea type="always" className="flex-grow h-[calc(100vh-10rem)] pr-3">
        <div className="flex flex-col gap-3">
          {artifacts.map((artifact) => (
            <ArtifactCard
              key={`${artifact.id}-${artifact.messageIndex}`}
              artifact={artifact}
              onView={onSelectArtifact}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export const ArtifactsPanel = () => {
  const [selectedArtifact, setSelectedArtifact] = useAtom(selectedArtifactAtom);
  const parsedCheckpoint = useAtomValue(useCheckpointParserAtom);
  const stream = useAtomValue(useStreamAtom);

  const allArtifacts = React.useMemo(() => {
    const artifactMap = new Map<string, Artifact>();

    // 1. Get artifacts from completed messages
    if (parsedCheckpoint?.messages) {
      parsedCheckpoint.messages.forEach((message, index) => {
        if (message.content) {
          const content =
            typeof message.content === "string"
              ? message.content
              : Array.isArray(message.content)
                ? message.content
                    .map((item: any) =>
                      item.type === "text" ? item.text : "",
                    )
                    .join("")
                : String(message.content);

          const messageArtifacts = parseArtifacts(content, index);
          messageArtifacts.forEach((artifact) => {
            artifactMap.set(artifact.id, artifact);
          });
        }
      });
    }

    // 2. Get artifacts from stream and overwrite
    const streamingContent =
      stream?.chunkGroups
        .filter((cg) => cg.type === "ai")
        .map((cg) => cg.content)
        .join("") ?? "";

    if (streamingContent) {
      const streamingArtifacts = parseStreamingArtifacts(
        streamingContent,
        parsedCheckpoint?.messages.length ?? 0,
      );
      streamingArtifacts.forEach((artifact) => {
        artifactMap.set(artifact.id, artifact);
      });
    }

    const allArtifacts = Array.from(artifactMap.values());
    return allArtifacts.sort((a, b) => b.messageIndex - a.messageIndex);
  }, [parsedCheckpoint?.messages, stream]);

  const artifactToView = React.useMemo(() => {
    if (!selectedArtifact) return null;
    return (
      allArtifacts.find((a) => a.id === selectedArtifact.id) || selectedArtifact
    );
  }, [selectedArtifact, allArtifacts]);

  const handleCloseViewer = () => {
    setSelectedArtifact(null);
  };

  if (artifactToView) {
    return (
      <ArtifactViewer artifact={artifactToView} onClose={handleCloseViewer} />
    );
  }

  return <ArtifactsList artifacts={allArtifacts} onSelectArtifact={setSelectedArtifact} />;
}; 