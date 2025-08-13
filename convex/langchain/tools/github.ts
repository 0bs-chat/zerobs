"use node";

import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import type { ExtendedRunnableConfig } from "../helpers";
import { internal } from "../../_generated/api";

export const getGithubTools = async (
  config: ExtendedRunnableConfig,
) => {
  // Prefer a dedicated PAT for GitHub MCP
  const token = (
    await config.ctx.runQuery(internal.apiKeys.queries.getFromKey, {
      key: "GITHUB_ACCESS_TOKEN",
    })
  )?.value;

  if (!token) return [];

  const client = new MultiServerMCPClient({
    prefixToolNameWithServerName: true,
    additionalToolNamePrefix: "mcp",
    mcpServers: {
      github: {
        transport: "http",
        url: "https://api.githubcopilot.com/mcp/",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        reconnect: { enabled: true, maxAttempts: 30, delayMs: 200 },
      },
    },
  });

  try {
    const tools = await client.getTools();
    return tools;
  } catch (_err) {
    return [];
  }
};

