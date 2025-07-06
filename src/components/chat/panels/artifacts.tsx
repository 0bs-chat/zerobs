import React from "react";
import { useAtom, useAtomValue } from "jotai";
import { parsedArtifactsContentAtom, selectedArtifactAtom } from "@/store/chatStore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArtifactViewer } from "../../artifacts/viewer";
import type { Artifact, ContentPart } from "../../artifacts/utils";
import { ArtifactCard } from "../../artifacts/card";

const ArtifactsList = ({
  artifacts,
}: {
  artifacts: Artifact[];
}) => {
  if (!artifacts || artifacts.length === 0) {
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
      <ScrollArea
        type="always"
        className="flex-grow h-[calc(100vh-10rem)] pr-3"
      >
        <div className="flex flex-col gap-3">
          {artifacts.map((artifact) => (
            <ArtifactCard
              key={`${artifact.id}-${artifact.messageIndex}`}
              artifact={artifact}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export const ArtifactsPanel = () => {
  const [selectedArtifact, setSelectedArtifact] = useAtom(selectedArtifactAtom);
  const parsedArtifactsContent = useAtomValue(parsedArtifactsContentAtom);
  const allArtifacts = React.useMemo(() => {
    if (!parsedArtifactsContent) return [];
    return parsedArtifactsContent
      .filter(
        (part): part is Extract<ContentPart, { type: "artifact" }> =>
          part.type === "artifact",
      )
      .map((part) => part.artifact);
  }, [parsedArtifactsContent]);

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

  return <ArtifactsList artifacts={allArtifacts} />;
};
