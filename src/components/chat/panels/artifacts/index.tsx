import React from "react";
import { useAtom, useAtomValue } from "jotai";
import {
  selectedArtifactAtom,
  useCheckpointParserAtom,
  useStreamAtom,
} from "@/store/chatStore";
import { ScrollArea } from "@/components/ui/scroll-area";
// import { Badge } from "@/components/ui/badge";
// import { Separator } from "@/components/ui/separator";
import { ArtifactViewer } from "./viewer";
import type { Artifact } from "../../artifacts/utils";
import { parseArtifacts } from "../../artifacts/utils";
import { ArtifactCard } from "../../artifacts/card";

const ArtifactsList = ({
  artifacts,
  onSelectArtifact,
}: {
  artifacts: Artifact[];
  onSelectArtifact: (artifact: Artifact) => void;
}) => {
  if (artifacts.length === 0) {
    return (
      <div className="flex items-center justify-center text-center h-32">
        <div className="text-sm text-muted-foreground">
          No artifacts found in this conversation
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Artifacts</h3>
          <p className="text-xs text-muted-foreground">
            Interactive content from this conversation
          </p>
        </div>
      </div> */}

      {/* <Separator /> */}

      <ScrollArea
        type="always"
        className="flex-grow h-[calc(100vh-10rem)] pr-3"
      >
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
  const setSelectedArtifactId = useSetAtom(selectedArtifactIdAtom);
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
                    .map((item: any) => (item.type === "text" ? item.text : ""))
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
      const streamingArtifacts = parseArtifacts(
        streamingContent,
        parsedCheckpoint?.messages.length ?? 0
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
    setSelectedArtifactId(null);
  };

  if (artifactToView) {
    return (
      <ArtifactViewer artifact={artifactToView} onClose={handleCloseViewer} />
    );
  }

  return (
    <ArtifactsList
      artifacts={allArtifacts}
      onSelectArtifact={setSelectedArtifact}
    />
  );
};
