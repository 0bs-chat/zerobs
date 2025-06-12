import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { MCPData } from "@/components/chat/panel/mcp/types";
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

  const handleCreate = async (
    newMCPData: MCPData,
    setMcpEditDialogOpen: (open: boolean) => void
  ) => {
    try {
      const env =
        newMCPData.type === "stdio"
          ? Object.fromEntries(
              newMCPData.envVars
                .filter((env) => env.key && env.value)
                .map((env) => [env.key, env.value])
            )
          : {};

      await createMCP({
        name: newMCPData.name,
        command:
          newMCPData.type === "stdio" ? newMCPData.command : newMCPData.url,
        env,
        enabled: true,
      });

      setMcpAtom((prev) => ({
        ...prev,
        name: "",
        command: "",
        url: "",
        type: "stdio",
        envVars: [{ key: "", value: "" }],
      }));
      setMcpEditDialogOpen(false);
      toast.success("MCP created");
    } catch (error) {
      console.error("Failed to create MCP:", error);
    }
  };

  const handleDelete = async (mcpId: Id<"mcps">) => {
    try {
      await removeMCP({ mcpId });
    } catch (error) {
      console.error("Failed to delete MCP:", error);
    }
  };

  const toggleMCP = async (mcpId: Id<"mcps">, enabled: boolean) => {
    try {
      await updateMCP({ mcpId, updates: { enabled: !enabled } });
      toast.success(enabled ? "MCP stopped" : "MCP started");
    } catch (error) {
      console.error("Failed to start/stop MCP:", error);
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
  };
}
