import { MCPCard } from "./mcp-card";
import { useMCPsData, useMCPMutations } from "@/hooks/chats/use-mcp";
import { MCPDialog } from "./mcp-dialog";
import { useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useAtom } from "jotai";
import { mcpToolsAtom } from "@/store/chatStore";
import { useEffect } from "react";

export const MCPPanel = () => {
  const { mcps } = useMCPsData();
  const { handleToggleMCP, handleDeleteMCP } = useMCPMutations();
  const [mcpTools, setMcpTools] = useAtom(mcpToolsAtom);
  const getMCPToolsAction = useAction(api.mcps.tools.getMCPToolsPreview);

  // Fetch all MCP tools when MCPs change
  useEffect(() => {
    if (!mcps || mcps.length === 0) return;

    const enabledMcpsWithUrl = mcps.filter(mcp => 
      mcp.enabled && mcp.url && mcp.status === "created"
    );
    
    if (enabledMcpsWithUrl.length === 0) return;

    const mcpIds = enabledMcpsWithUrl.map(mcp => mcp._id);
    
    // Only fetch if we don't already have data for these MCPs
    const needsFetch = mcpIds.some(id => !(id in mcpTools));
    if (!needsFetch) return;

    getMCPToolsAction({ mcpIds })
      .then((batchResults) => {
        setMcpTools(prev => ({
          ...prev,
          ...batchResults
        }));
      })
      .catch((error) => {
        console.error("Error fetching MCP tools batch:", error);
        // Set error state for all requested MCPs
        const errorResults = mcpIds.reduce((acc, mcpId) => {
          acc[mcpId] = { 
            tools: [], 
            error: error instanceof Error ? error.message : "Failed to fetch tools"
          };
          return acc;
        }, {} as typeof mcpTools);
        
        setMcpTools(prev => ({
          ...prev,
          ...errorResults
        }));
      });
  }, [mcps, getMCPToolsAction, mcpTools, setMcpTools]);

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
