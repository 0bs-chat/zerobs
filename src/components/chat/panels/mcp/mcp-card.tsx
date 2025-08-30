import { Button } from "@/components/ui/button";
import { Loader2, Play, Square, Trash2, Eye } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Doc, Id } from "convex/_generated/dataModel";
import { useSetAtom } from "jotai";
import { selectedVibzMcpAtom } from "@/store/chatStore";
import { MCP_TEMPLATES } from "./templates";

export const MCPCard = ({
  mcp,
  status,
  onStartStop,
  onDelete,
}: {
  mcp: Doc<"mcps">;
  status: "creating" | "created" | "error";
  onStartStop: (mcpId: Id<"mcps">, enabled: boolean) => Promise<void>;
  onDelete: (mcpId: Id<"mcps">) => Promise<void>;
}) => {
  const setSelectedVibzMcp = useSetAtom(selectedVibzMcpAtom);

  const isVibzTemplate = mcp.template === "vibz";
  const canShowPreview = isVibzTemplate && mcp.enabled && status === "created";

  const handlePreview = () => {
    setSelectedVibzMcp(mcp);
  };

  const getLogoUrl = () => {
    if (mcp.template) {
      const template = MCP_TEMPLATES.find(t => t.template === mcp.template);
      if (template?.image) {
        return template.image;
      }
    }
    // Fallback to default GitHub avatar
    return "https://avatars.githubusercontent.com/u/182288589?s=200&v=4";
  };

  const getDisplayValue = () => {
    switch (mcp.type) {
      case "stdio":
        return mcp.command;
      case "http":
        return mcp.url;
      case "docker":
        const dockerInfo = `${mcp.dockerImage}:${mcp.dockerPort}`;
        return mcp.dockerCommand
          ? `${dockerInfo} - ${mcp.dockerCommand}`
          : dockerInfo;
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
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <img 
            src={getLogoUrl()} 
            alt={`${mcp.name} logo`}
            className="w-10 h-10 rounded-md object-cover flex-shrink-0"
            onError={(e) => {
              // Fallback if image fails to load
              e.currentTarget.src = "https://avatars.githubusercontent.com/u/182288589?s=200&v=4";
            }}
          />
          <div className="flex flex-col justify-center flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-md font-semibold">{mcp.name}</CardTitle>
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
        </div>
        <div className="flex items-center gap-2 ml-4 flex-shrink-0">
          {canShowPreview && (
            <Button
              variant="outline"
              size="icon"
              className="cursor-pointer"
              onClick={handlePreview}
              aria-label="Preview App"
            >
              <Eye className="h-4 w-4" />
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
            disabled={status === "creating"}
          >
            <Trash2 className="h-4 w-4" aria-label="Delete MCP" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
