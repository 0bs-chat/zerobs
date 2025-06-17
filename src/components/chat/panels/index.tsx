import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rightPanelActiveTabAtom } from "@/store/chatStore";
import { ProjectsPanel } from "./projects";
import { MCPPanel } from "./mcp/index";
import { ArtifactsPanel } from "./artifacts";
import { useAtomValue, useSetAtom } from "jotai";

export const Panel = () => {
  const activeTab = useAtomValue(rightPanelActiveTabAtom);
  const setActiveTab = useSetAtom(rightPanelActiveTabAtom);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value)}
      className="py-2 px-4"
    >
      <div className="flex items-center justify-between gap-2 pr-10">
        <TabsList className="w-full flex justify-center ">
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="mcp">MCP</TabsTrigger>
        </TabsList>
      </div>
      <div className="flex flex-col gap-2 pt-3">
        <TabsContent value="artifacts">
          <ArtifactsPanel />
        </TabsContent>

        <TabsContent value="projects">
          <ProjectsPanel />
        </TabsContent>

        <TabsContent value="mcp">
          <MCPPanel />
        </TabsContent>
      </div>
    </Tabs>
  );
};
