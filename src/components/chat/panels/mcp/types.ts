import type { Doc, Id } from "../../../../../convex/_generated/dataModel";

export type EnvVar = {
  key: string;
  value: string;
};

export type MCPType = "sse" | "stdio" | "docker";

export type MCPData = {
  name: string;
  type: MCPType;
  command: string;
  dockerImage: string;
  dockerPort: number;
  status: "creating" | "created" | "error";
  envVars: EnvVar[];
  enabled: boolean;
  restartOnNewChat: boolean;
  url: string;
};

export type MCPCardProps = {
  mcp: Doc<"mcps">;
  status: "creating" | "created" | "error";
  onStartStop: (mcpId: Id<"mcps">, enabled: boolean) => Promise<void>;
  onDelete: (mcpId: Id<"mcps">) => Promise<void>;
  onRestart?: (mcpId: Id<"mcps">) => Promise<void>;
};
