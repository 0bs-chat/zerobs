import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Play, Square, Trash2 } from "lucide-react";
import type { MCPCardProps } from "./types";

export const MCPCard = ({ mcp, onStartStop, onDelete }: MCPCardProps) => {
  return (
    <Card>
      <CardHeader className="flex gap-0 items-start justify-between">
        <CardTitle>{mcp.name}</CardTitle>
        <CardDescription>
          {mcp.command}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
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
              onClick={() => onDelete(mcp._id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
