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
      className="py-2 px-4 overflow-hidden h-full bg-background w-full"
    >
      {!hideTabHeader && ( // Hide the tab list when previewing an artifact
        <div className="flex items-center justify-between gap-2 pr-10">
          <TabsList className="w-full flex justify-center h-10">
            <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="mcp">MCP</TabsTrigger>
          </TabsList>
        </div>
      )}

      <div className="flex flex-col gap-2 flex-1 h-full">
        <TabsContent value="artifacts" className="h-full w-full">
          <ArtifactsPanel />
        </TabsContent>

        <TabsContent value="projects" className="h-full w-full">
          <ProjectsPanel />
        </TabsContent>

        <TabsContent value="mcp" className="h-full w-full">
          <MCPPanel />
        </TabsContent>
      </div>
    </Tabs>
  );
};
