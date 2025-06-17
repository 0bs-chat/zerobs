import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { MCPData } from "@/components/chat/panels/mcp/types";
import { useMutation, useQuery } from "convex/react";

import { toast } from "sonner";
import { mcpAtom } from "@/store/chatStore";
import { useSetAtom } from "jotai";

export function useMCPs() {
  const setMcpAtom = useSetAtom(mcpAtom);
  const getAllMCPs = () => {
    const mcps = useQuery(api.mcps.queries.getAll, {
      paginationOpts: { numItems: 10, cursor: null },
    });

    if (!mcps) return null;

    return mcps;
  };

  const createMCP = useMutation(api.mcps.mutations.create);
  const updateMCP = useMutation(api.mcps.mutations.update);
  const removeMCP = useMutation(api.mcps.mutations.remove);
  const restartMutation = useMutation(api.mcps.mutations.restart);

  const handleCreate = async (
    newMCPData: MCPData,
    setMcpEditDialogOpen: (open: boolean) => void,
  ) => {
    try {
      // Filter out empty environment variables
      const env = Object.fromEntries(
        newMCPData.envVars
          .filter((envVar) => envVar.key.trim() && envVar.value.trim())
          .map((envVar) => [envVar.key.trim(), envVar.value.trim()]),
      );

      // Prepare the mutation parameters based on MCP type
      const createParams: Parameters<typeof createMCP>[0] = {
        name: newMCPData.name.trim(),
        enabled: true,
        restartOnNewChat: newMCPData.restartOnNewChat,
        env: Object.keys(env).length > 0 ? env : undefined,
      };

      // Add type-specific parameters
      if (newMCPData.type === "stdio") {
        createParams.command = newMCPData.command.trim();
      } else if (newMCPData.type === "sse") {
        createParams.url = newMCPData.url.trim();
      } else if (newMCPData.type === "docker") {
        createParams.dockerImage = newMCPData.dockerImage.trim();
        createParams.dockerPort = newMCPData.dockerPort;
      }

      await createMCP(createParams);

      // Reset the form
      setMcpAtom({
        name: "",
        command: "",
        url: "",
        dockerImage: "",
        dockerPort: 8000,
        type: "sse",
        envVars: [{ key: "", value: "" }],
        restartOnNewChat: false,
        enabled: false,
        status: "creating",
      });
      
      setMcpEditDialogOpen(false);
      toast.success("MCP created successfully");
    } catch (error) {
      console.error("Failed to create MCP:", error);
      toast.error("Failed to create MCP");
      throw error;
    }
  };

  const handleDelete = async (mcpId: Id<"mcps">) => {
    try {
      await removeMCP({ mcpId });
      toast.success("MCP deleted successfully");
    } catch (error) {
      console.error("Failed to delete MCP:", error);
      toast.error("Failed to delete MCP");
    }
  };

  const toggleMCP = async (mcpId: Id<"mcps">, enabled: boolean) => {
    try {
      await updateMCP({ mcpId, updates: { enabled: !enabled } });
      toast.success(enabled ? "MCP stopped" : "MCP started");
    } catch (error) {
      console.error("Failed to start/stop MCP:", error);
      toast.error("Failed to start/stop MCP");
    }
  };

  const restartMCP = async (mcpId: Id<"mcps">) => {
    try {
      await restartMutation({ mcpId });
      toast.success("MCP restarted successfully");
    } catch (error) {
      console.error("Failed to restart MCP:", error);
      toast.error("Failed to restart MCP");
    }
  };

  return {
    getAllMCPs,
    createMCP,
    updateMCP,
    removeMCP,
    handleCreate,
    toggleMCP,
    handleDelete,
    restartMCP,
  };
}
