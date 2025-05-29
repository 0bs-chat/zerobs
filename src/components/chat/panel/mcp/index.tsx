import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import type { NewMCPData } from "./types";
import { CreateDialog } from "./create-dialog";
import { MCPCard } from "./mcp-card";
import { toast } from "sonner";

export const MCPPanel = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const mcps = useQuery(api.mcps.queries.getAll, {
    paginationOpts: { numItems: 100, cursor: null },
  });

  const createMCP = useMutation(api.mcps.mutations.create);
  const removeMCP = useMutation(api.mcps.mutations.remove);
  const updateMCP = useMutation(api.mcps.mutations.update);

  const handleCreate = async (newMCPData: NewMCPData) => {
    try {
      const env =
        newMCPData.type === "stdio"
          ? Object.fromEntries(
              newMCPData.envVars
                .filter((env) => env.key && env.value)
                .map((env) => [env.key, env.value]),
            )
          : {};

      await createMCP({
        name: newMCPData.name,
        command:
          newMCPData.type === "stdio" ? newMCPData.command : newMCPData.url,
        env,
        enabled: false,
      });

      setIsCreateOpen(false);
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

  const handleStartStop = async (mcpId: Id<"mcps">, enabled: boolean) => {
    try {
      const mcp = await updateMCP({ mcpId, updates: { enabled } });
      toast.success(enabled ? "MCP started" : "MCP stopped");
    } catch (error) {
      console.error("Failed to start/stop MCP:", error);
    }
  };

  return (
    <div className="space-y-4 mt-2">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">MCPs</h2>
        <CreateDialog
          isOpen={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          onCreate={handleCreate}
        />
      </div>

      <div className="grid gap-4">
        {mcps?.page.map((mcp) => (
          <MCPCard
            key={mcp._id}
            mcp={{
              _id: mcp._id,
              name: mcp.name,
              command: mcp.command || mcp.url || "",
              enabled: mcp.enabled,
            }}
            onStartStop={handleStartStop}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
};
