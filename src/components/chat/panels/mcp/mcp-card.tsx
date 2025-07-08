import { Button } from "@/components/ui/button";
import { Loader2, Play, Square, Trash2, RotateCcw } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Doc, Id } from "convex/_generated/dataModel";

export const MCPCard = ({
  mcp,
  status,
  onStartStop,
  onDelete,
  onRestart,
}: {
  mcp: Doc<"mcps">;
  status: "creating" | "created" | "error";
  onStartStop: (mcpId: Id<"mcps">, enabled: boolean) => Promise<void>;
  onDelete: (mcpId: Id<"mcps">) => Promise<void>;
  onRestart?: (mcpId: Id<"mcps">) => Promise<void>;
}) => {
  const getDisplayValue = () => {
    switch (mcp.type) {
      case "stdio":
        return mcp.command;
      case "http":
        return mcp.url;
      case "docker":
        return `${mcp.dockerImage}:${mcp.dockerPort}`;
      default:
        return "";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "created":
        return mcp.enabled ? "bg-green-500" : "bg-gray-500";
      case "creating":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  const shouldShowStatusDot = () => {
    // Don't show status dots for HTTP MCPs
    return mcp.type !== "http";
  };

  return (
    <Card className="px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col justify-center flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <CardTitle className="text-lg font-semibold">{mcp.name}</CardTitle>
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {mcp.type.toUpperCase()}
            </Badge>
            {shouldShowStatusDot() && (
              <div
                className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusColor()}`}
                title={`Status: ${status}${mcp.enabled ? " (enabled)" : " (disabled)"}`}
              />
            )}
          </div>
          <CardDescription
            className="text-sm text-muted-foreground"
            style={{ wordBreak: "break-word" }}
          >
            {getDisplayValue() || "No configuration"}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          {onRestart && (
            <Button
              variant="outline"
              size="icon"
              className="cursor-pointer"
              onClick={() => onRestart(mcp._id)}
              aria-label="Restart MCP"
              disabled={status === "creating"}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="secondary"
            size="icon"
            className="cursor-pointer"
            onClick={() => onStartStop(mcp._id, mcp.enabled)}
            aria-label={mcp.enabled ? "Stop" : "Start"}
            disabled={status === "creating"}
          >
            {status === "creating" ? (
              <Loader2
                className="h-4 w-4 animate-spin"
                aria-label="Creating MCP"
              />
            ) : mcp.enabled ? (
              <Square className="h-4 w-4" aria-label="Stop MCP" />
            ) : (
              <Play className="h-4 w-4" aria-label="Start MCP" />
            )}
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="cursor-pointer"
            onClick={() => onDelete(mcp._id)}
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" aria-label="Delete MCP" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
