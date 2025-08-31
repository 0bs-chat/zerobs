import { Button } from "@/components/ui/button";
import { Loader2, Play, Square, Trash2, Eye, WrenchIcon } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { Doc, Id } from "convex/_generated/dataModel";
import { useSetAtom } from "jotai";
import { selectedVibzMcpAtom } from "@/store/chatStore";
import { MCP_TEMPLATES } from "./templates";
import { useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useState, useEffect } from "react";

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

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
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [toolsLoading, setToolsLoading] = useState(false);
  const [toolsError, setToolsError] = useState<string | null>(null);

  const getMCPToolsAction = useAction(api.mcps.tools.getMCPToolsPreview);

  const isVibzTemplate = mcp.template === "vibz";
  const canShowPreview = isVibzTemplate && mcp.enabled && status === "created";
  const canLoadTools = mcp.url && mcp.enabled && status === "created";

  const handlePreview = () => {
    setSelectedVibzMcp(mcp);
  };

  // Fetch tools when the MCP becomes available
  useEffect(() => {
    if (canLoadTools && tools.length === 0 && !toolsLoading && !toolsError) {
      setToolsLoading(true);
      setToolsError(null);
      
      getMCPToolsAction({ mcpId: mcp._id })
        .then((fetchedTools) => {
          setTools(fetchedTools);
        })
        .catch((error) => {
          console.error("Error fetching MCP tools:", error);
          setToolsError(error instanceof Error ? error.message : "Failed to fetch tools");
        })
        .finally(() => {
          setToolsLoading(false);
        });
    }
  }, [canLoadTools, mcp._id, tools.length, toolsLoading, toolsError, getMCPToolsAction]);

  const formatInputArgs = (schema: any): string => {
    try {
      if (!schema || typeof schema !== "object") {
        return "No arguments";
      }

      // Handle Zod schema format
      if (schema._def && schema._def.shape) {
        const properties = schema._def.shape();
        if (!properties || typeof properties !== "object") {
          return "No arguments";
        }
        
        const args = Object.keys(properties).map((key) => key);
        return args.length > 0 ? args.join(", ") : "No arguments";
      }

      // Handle JSON schema format
      if (schema.properties) {
        const args = Object.entries(schema.properties).map(([key, value]: [string, any]) => {
          const required = schema.required?.includes(key) ? " (required)" : "";
          const type = typeof value === "object" && value.type ? ` : ${value.type}` : "";
          return `${key}${type}${required}`;
        });

        return args.length > 0 ? args.join(", ") : "No arguments";
      }

      return JSON.stringify(schema, null, 2);
    } catch {
      return "Invalid schema";
    }
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
            
            {/* Tools section */}
            {canLoadTools && (
              <div className="mt-2">
                {toolsLoading ? (
                  <div className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="text-xs text-muted-foreground">Loading tools...</span>
                  </div>
                ) : toolsError ? (
                  <div className="flex items-center gap-1">
                    <WrenchIcon className="w-3 h-3 text-red-500" />
                    <span className="text-xs text-red-500">Failed to load tools</span>
                  </div>
                ) : tools.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {tools.map((tool, index) => (
                      <HoverCard key={index}>
                        <HoverCardTrigger asChild>
                          <Badge 
                            variant="outline" 
                            className="text-xs cursor-help hover:bg-muted"
                          >
                            {tool.name}
                          </Badge>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80" side="top">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold">{tool.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {tool.description}
                            </p>
                            {tool.inputSchema && (
                              <div className="text-sm text-muted-foreground">
                                <p className="font-semibold mb-1">Input Arguments:</p>
                                <pre className="whitespace-pre-wrap font-mono text-xs bg-muted p-2 rounded">
                                  {formatInputArgs(tool.inputSchema)}
                                </pre>
                                {tool.inputSchema?.required && Array.isArray(tool.inputSchema.required) && tool.inputSchema.required.length > 0 && (
                                  <p className="mt-2 text-xs">
                                    <strong>Required:</strong> {tool.inputSchema.required.join(", ")}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
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
