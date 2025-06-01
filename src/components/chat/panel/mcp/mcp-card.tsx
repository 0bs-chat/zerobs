import { Button } from "@/components/ui/button";
import { Play, Square, Trash2 } from "lucide-react";
import type { MCPCardProps } from "./types";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export const MCPCard = ({ mcp, onStartStop, onDelete }: MCPCardProps) => {
  return (
    <Card className="px-4 py-3">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <CardTitle className="text-lg font-semibold">{mcp.name}</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {mcp.command}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onStartStop(mcp._id, mcp.enabled)}
          >
            {mcp.enabled ? (
              <Square className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="destructive"
            size="icon"
            className="cursor-pointer"
            onClick={() => onDelete(mcp._id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
