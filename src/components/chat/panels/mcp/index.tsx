import { MCPCard } from "./mcp-card";
import { useMCPs } from "@/hooks/chats/use-mcp";
import { ErrorState } from "@/components/ui/error-state";
import { MCPDialog } from "./mcp-dialog";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

export const MCPPanel = () => {
  const {
    getAllMCPs,
    toggleMCP,
    handleDelete,
    restartMCP,
    isLoading,
    isError,
    error,
  } = useMCPs();

  const mcps = getAllMCPs();

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">MCPs</h2>
        <div className="flex gap-2 items-center">
          <MCPDialog />
        </div>
      </div>

      <div className="grid gap-2">
        {isLoading && (
          <div className="flex items-center justify-center py-2">
            <LoadingSpinner sizeClassName="h-4 w-4" label="Loading MCPs..." />
          </div>
        )}
        {isError ||
          (error && (
            <div className="py-2">
              <ErrorState
                density="comfy"
                title="Failed to load MCPs"
                error={error}
              />
            </div>
          ))}
        {mcps?.page?.length === 0 && mcps && !isLoading && !isError && (
          <div className=" items-center justify-center flex py-2 w-full text-muted-foreground">
            <div> Currently no MCPs are running. </div>
          </div>
        )}
        {mcps?.page?.map((mcp) => (
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
