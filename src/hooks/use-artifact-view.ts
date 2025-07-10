import { useSetAtom } from "jotai";
import {
  selectedArtifactAtom,
  selectedPanelTabAtom,
  resizePanelOpenAtom,
} from "@/store/chatStore";
import type { Artifact } from "@/components/artifacts/utils";

export const useArtifactView = () => {
  const setSelectedPanelTab = useSetAtom(selectedPanelTabAtom);
  const setResizePanelOpen = useSetAtom(resizePanelOpenAtom);
  const setSelectedArtifact = useSetAtom(selectedArtifactAtom);

  const viewArtifact = (artifact: Artifact) => {
    setResizePanelOpen(true);
    setSelectedPanelTab("artifacts");
    setSelectedArtifact(artifact);
  };

  return { viewArtifact };
}; 