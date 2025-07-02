import { MCPDialog } from "./mcp-dialog";
import { MCPCard } from "./mcp-card";
import { createMCPServerDialogOpenAtom } from "@/store/chatStore";
import { useAtomValue, useSetAtom } from "jotai";
import { useMCPs } from "@/hooks/use-mcp";

export const MCPPanel = () => {
  const createMCPServerDialogOpen = useAtomValue(createMCPServerDialogOpenAtom);
  const setCreateMCPServerDialogOpen = useSetAtom(createMCPServerDialogOpenAtom);
  const { getAllMCPs, toggleMCP, handleDelete, restartMCP } = useMCPs();

  const mcps = getAllMCPs();

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">MCPs</h2>
        <MCPDialog
          isOpen={createMCPServerDialogOpen}
          onOpenChange={setCreateMCPServerDialogOpen}
        />
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
