import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

export type MCPFormState = Omit<
  Doc<"mcps">,
  "_id" | "_creationTime" | "userId" | "updatedAt" | "enabled"
>;

function validateMCP(mcp: MCPFormState): boolean {
  if (!mcp.name.trim()) {
    toast.error("MCP name is required");
    return false;
  }

  if (mcp.type === "stdio" && !mcp.command?.trim()) {
    toast.error("Command is required for STDIO type");
    return false;
  }

  if (mcp.type === "http" && !mcp.url?.trim()) {
    toast.error("URL is required for HTTP type");
    return false;
  }

  if (mcp.type === "docker") {
    if (!mcp.dockerImage?.trim()) {
      toast.error("Docker image is required for Docker type");
      return false;
    }
    if (!mcp.dockerPort || mcp.dockerPort <= 0) {
      toast.error("Valid Docker port is required for Docker type");
      return false;
    }
  }

  return true;
}

export function useMCPs() {
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
    newMCPData: MCPFormState,
    setMcpEditDialogOpen: (open: boolean) => void,
  ) => {
    if (!validateMCP(newMCPData)) return;
    try {
      const { command, url, dockerImage, dockerPort, env, ...rest } =
        newMCPData;

      const createParams: Parameters<typeof createMCP>[0] = {
        ...rest,
        command: command?.trim() || undefined,
        url: url?.trim() || undefined,
        dockerImage: dockerImage?.trim() || undefined,
        dockerPort: dockerPort,
        env: env && Object.keys(env).length > 0 ? env : undefined,
        enabled: true,
        status: "creating",
      };

      if (createParams.type !== "docker") {
        createParams.dockerPort = undefined;
      }

      await createMCP(createParams);

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
    validateMCP,
  };
}
