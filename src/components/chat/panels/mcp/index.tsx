import { MCPDialog } from "./mcp-dialog";
import { MCPCard } from "./mcp-card";
import { useMCPs } from "@/hooks/use-mcp";
import { BrowseMCPDialog } from "./browse-mcp-dialog";

export const MCPPanel = () => {
  const { getAllMCPs, toggleMCP, handleDelete, restartMCP } = useMCPs();

  const mcps = getAllMCPs();

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">MCPs</h2>
        <div className="flex gap-2 items-center">
          <BrowseMCPDialog />
          <MCPDialog />
        </div>
      </div>

      <div className="grid gap-2">
        {mcps?.page.map((mcp) => (
          <MCPCard
            key={mcp._id}
            mcp={mcp}
            status={mcp.status}
            onStartStop={toggleMCP}
            onDelete={handleDelete}
            onRestart={restartMCP}
          />
        ))}
      </div>
    </div>
  );
};
