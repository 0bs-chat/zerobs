import { MCPCard } from "./mcp-card";
import { useMCPsData, useMCPMutations } from "@/hooks/chats/use-mcp";
import { MCPDialog } from "./mcp-dialog";

export const MCPPanel = () => {
  const { mcps } = useMCPsData();
  const { handleToggleMCP, handleDeleteMCP } = useMCPMutations();

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
