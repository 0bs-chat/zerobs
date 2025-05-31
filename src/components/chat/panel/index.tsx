import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChat } from "@/store/use-chat";
import { ProjectsPanel } from "./projects";
import { MCPPanel } from "./mcp/index";

type TabValue = "artifacts" | "projects" | "settings" | "mcp";

export const Panel = () => {
  const { resizablePanelTab, setResizablePanelTab } = useChat();

  return (
    <Tabs
      value={resizablePanelTab}
      onValueChange={(value) => setResizablePanelTab(value as TabValue)}
      className="py-2 px-4 "
    >
      <div className="flex items-center justify-between gap-2 pr-10">
        <TabsList className="w-full flex justify-center ">
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="mcp">MCP</TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="artifacts">Artifacts</TabsContent>

      <TabsContent value="projects">
        <ProjectsPanel />
      </TabsContent>

      <TabsContent value="settings">Settings</TabsContent>

      <TabsContent value="mcp">
        <MCPPanel />
      </TabsContent>
    </Tabs>
  );
};
