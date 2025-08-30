import { api } from "../../../convex/_generated/api";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useAtom } from "jotai";
import { mcpsAtom } from "@/store/chatStore";
import { useEffect } from "react";

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

export function useMCPsData() {
  const [mcps, setMcps] = useAtom(mcpsAtom);
  
  const { data: fetchedMcps } = useQuery({
    ...convexQuery(api.mcps.queries.getAll, {
      paginationOpts: { numItems: 10, cursor: null },
    }),
  });

  // Update atom when data is fetched
  useEffect(() => {
    if (fetchedMcps) {
      setMcps(fetchedMcps.page);
    }
  }, [fetchedMcps, setMcps]);

  return { mcps, setMcps };
}

export function useMCPMutations() {
  const updateMCP = useConvexMutation(api.mcps.mutations.update);
  const removeMCP = useConvexMutation(api.mcps.mutations.remove);
  const createMCP = useConvexMutation(api.mcps.mutations.create);

  const handleToggleMCP = async (mcpId: Id<"mcps">, enabled: boolean) => {
    try {
      await updateMCP({ mcpId, updates: { enabled: !enabled } });
      // The cache will be updated when the query refetches
    } catch (error) {
      console.error("Failed to start/stop MCP:", error);
    }
  };

  const handleDeleteMCP = async (mcpId: Id<"mcps">) => {
    try {
      await removeMCP({ mcpId });
      // The cache will be updated when the query refetches
    } catch (error) {
      console.error("Failed to delete MCP:", error);
    }
  };

  const handleCreateMCP = async (
    newMCPData: MCPFormState,
    setMcpEditDialogOpen: (open: boolean) => void,
  ): Promise<void> => {
    if (!validateMCP(newMCPData)) return;
    
    try {
      const { command, url, dockerImage, dockerPort, env, ...rest } = newMCPData;

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

  return { 
    updateMCP, 
    removeMCP, 
    createMCP,
    handleToggleMCP, 
    handleDeleteMCP,
    handleCreateMCP
  };
}

export { validateMCP };
