import React from "react";
import { useAtom } from "jotai";
import { selectedArtifactAtom } from "@/store/chatStore";
import { ScrollArea } from "@/components/ui/scroll-area";
// import { Badge } from "@/components/ui/badge";
// import { Separator } from "@/components/ui/separator";
import { ArtifactViewer } from "./viewer";
import type { Artifact } from "../../artifacts/utils";
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

  const allArtifacts = React.useMemo(() => {
    // For now, return empty array since we removed streaming
    // This can be populated with artifacts from completed messages
    return [] as Artifact[];
  }, []);

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

  return (
    <ArtifactsList
      artifacts={allArtifacts}
      onSelectArtifact={setSelectedArtifact}
    />
  );
};
