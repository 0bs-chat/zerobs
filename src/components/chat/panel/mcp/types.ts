import type { Id } from "../../../../../convex/_generated/dataModel";

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
  mcp: {
    _id: Id<"mcps">;
    name: string;
    command: string;
    enabled: boolean;
  };
  onStartStop: (mcpId: Id<"mcps">, isRunning: boolean) => Promise<void>;
  onDelete: (mcpId: Id<"mcps">) => Promise<void>;
};
