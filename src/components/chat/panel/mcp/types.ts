import type { Doc, Id } from "../../../../../convex/_generated/dataModel";

export type EnvVar = {
  key: string;
  value: string;
};

export type MCPType = "sse" | "stdio";

export type MCPData = {
  name: string;
  type: MCPType;
  command: string;
  envVars: EnvVar[];
  enabled: boolean;
  resetOnNewChat: boolean;
  url: string;
};

export type MCPCardProps = {
  mcp: Doc<"mcps">;
  onStartStop: (mcpId: Id<"mcps">, enabled: boolean) => Promise<void>;
  onDelete: (mcpId: Id<"mcps">) => Promise<void>;
};
