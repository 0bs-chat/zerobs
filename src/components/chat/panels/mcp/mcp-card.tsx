import { Button } from "@/components/ui/button";
import { Play, Square, Trash2 } from "lucide-react";
import type { MCPCardProps } from "./types";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export const MCPCard = ({ mcp, onStartStop, onDelete }: MCPCardProps) => {
  return (
    <Card className="px-4 py-3 rounded-md">
      <div className="flex items-center justify-between">
        <div className="flex flex-col justify-center">
          <CardTitle className="text-lg font-semibold">{mcp.name}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {mcp.command}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="icon"
            className="cursor-pointer"
            onClick={() => onStartStop(mcp._id, mcp.enabled)}
            aria-label={mcp.enabled ? "Stop" : "Start"}
          >
            {mcp.enabled ? (
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
