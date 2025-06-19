import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rightPanelActiveTabAtom } from "@/store/chatStore";
import { ProjectsPanel } from "./projects";
import { MCPPanel } from "./mcp/index";
import { ArtifactsPanel } from "./artifacts";
import { useAtomValue, useSetAtom } from "jotai";
import { EyeIcon, CodeIcon } from "lucide-react";

export const Panel = () => {
  const activeTab = useAtomValue(rightPanelActiveTabAtom);
  const setActiveTab = useSetAtom(rightPanelActiveTabAtom);

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value)}
      className="py-2 px-4 overflow-hidden h-full"
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
          <TabsList className=" flex justify-between items-center sticky top-0 right-0 w-32 ">
            <TabsTrigger value="preview">
              <EyeIcon className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="source">
              <CodeIcon className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>
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
