import { MCPCard } from "./mcp-card";
import { useMCPsData } from "@/hooks/chats/use-mcp";
import { MCPDialog } from "./mcp-dialog";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";

export const MCPPanel = () => {
  const { mcps } = useMCPsData();
  const updateMCP = useConvexMutation(api.mcps.mutations.update);
  const removeMCP = useConvexMutation(api.mcps.mutations.remove);

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

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">MCPs</h2>
        <div className="flex gap-2 items-center">
          <MCPDialog />
        </div>
      </div>

      <div className="grid gap-2">
        {mcps?.map((mcp) => (
          <MCPCard
            key={mcp._id}
            mcp={mcp}
            status={mcp.status}
            onStartStop={handleToggleMCP}
            onDelete={handleDeleteMCP}
          />
        ))}
      </div>
    </div>
  );
};
