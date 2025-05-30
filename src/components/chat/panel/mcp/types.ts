import type { Doc, Id } from "../../../../../convex/_generated/dataModel";

export type EnvVar = {
  key: string;
  value: string;
};

export type MCPType = "sse" | "stdio";

export type NewMCPData = {
  name: string;
  type: MCPType;
  command: string;
  url: string;
  envVars: EnvVar[];
};

export type MCPCardProps = {
  mcp: Doc<"mcps">;
  onStartStop: (mcpId: Id<"mcps">, enabled: boolean) => Promise<void>;
  onDelete: (mcpId: Id<"mcps">) => Promise<void>;
};
