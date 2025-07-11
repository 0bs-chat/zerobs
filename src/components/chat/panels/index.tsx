import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { selectedPanelTabAtom, selectedArtifactAtom } from "@/store/chatStore";
import { ProjectsPanel } from "./projects";
import { MCPPanel } from "./mcp/index";
import { ArtifactsPanel } from "./artifacts";
import { useAtomValue, useSetAtom } from "jotai";

export const Panel = () => {
  const activeTab = useAtomValue(selectedPanelTabAtom);
  const setActiveTab = useSetAtom(selectedPanelTabAtom);

  // If an artifact is currently selected, we're in "preview" mode
  const selectedArtifact = useAtomValue(selectedArtifactAtom);
  const hideTabHeader = Boolean(selectedArtifact);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value)}
      className="h-full bg-background w-full"
    >
      {!hideTabHeader && ( // Hide the tab list when previewing an artifact
        <div className="flex items-center justify-between gap-2 m-2.5 pr-13">
          <TabsList className="w-full flex justify-center h-10">
            <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="mcp">MCP</TabsTrigger>
          </TabsList>
        </div>
      )}

      <>
        <TabsContent
          value="artifacts"
          className={`h-full w-full ${hideTabHeader ? "px-0" : "px-2"}`}
        >
          <ArtifactsPanel />
        </TabsContent>

        <TabsContent value="projects" className="h-full w-full px-2">
          <ProjectsPanel />
        </TabsContent>

        <TabsContent value="mcp" className="h-full w-full px-2">
          <MCPPanel />
        </TabsContent>
      </>
    </Tabs>
  );
};
