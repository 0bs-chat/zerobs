"use node";

import { TavilySearch } from "@langchain/tavily";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import { tool, type StructuredToolInterface } from "@langchain/core/tools";
import { MultiServerMCPClient, type Connection } from "@langchain/mcp-adapters";
import { z } from "zod";
import { api, internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { ToolSchemaBase } from "@langchain/core/tools";
import { Doc } from "../_generated/dataModel";

export const getSearchTools = () => {
  const tools: {
    tavily?: TavilySearch;
    duckduckgo: DuckDuckGoSearch;
    crawlWeb: StructuredToolInterface;
  } = {
    duckduckgo: new DuckDuckGoSearch({ maxResults: 5 }),
    crawlWeb: tool(
      async ({ url }: { url: string }) => {
        const response = await fetch(
          `http://${process.env.CRAWL_URL_SERVICE_HOST || "services"}:${process.env.CRAWL_URL_SERVICE_PORT || "5002"}/crawl/?url=${encodeURIComponent(url)}&max_depth=0`
        );
        const data = await response.json();
        return data.markdown as string;
      },
      {
        name: "crawlWeb",
        description: "Crawl the web and return the markdown",
        schema: z.object({
          url: z.string().describe("The url to crawl"),
        }),
      }
    ),
  };

  if (process.env.TAVILY_API_KEY) {
    tools.tavily = new TavilySearch({
      maxResults: 5,
      topic: "general",
      tavilyApiKey: process.env.TAVILY_API_KEY,
    });
  }

  return tools;
};

export const getMCPTools = async (ctx: ActionCtx) => {
  const mcps = await ctx.runQuery(api.mcps.queries.getRunning);

  await ctx.runMutation(internal.mcps.mutations.ensureRunning, {
    mcpIds: mcps.map((mcp: Doc<"mcps">) => mcp._id),
  });

  const mcpServers: Record<string, Connection> = Object.fromEntries(
    mcps.map((mcp: Doc<"mcps">) => [
      mcp.name,
      {
        transport: "sse",
        url: mcp.url!,
        headers: mcp.env,
        useNodeEventSource: true,
        reconnect: {
          enabled: true,
          maxAttempts: 2,
          delayMs: 100,
        },
      },
    ])
  );

  const client = new MultiServerMCPClient({
    throwOnLoadError: true,
    prefixToolNameWithServerName: true,
    additionalToolNamePrefix: "mcp",
    mcpServers,
  });

  const tools = await client.getTools();

  // Group tools by server name
  const groupedTools: Record<
    string,
    StructuredToolInterface<ToolSchemaBase>[]
  > = {};

  for (const tool of tools) {
    const parts = tool.name.split("_");
    if (parts.length >= 2) {
      const serverName = parts[1];
      if (!groupedTools[serverName]) {
        groupedTools[serverName] = [];
      }
      groupedTools[serverName].push(tool);
    }
  }

  return {
    tools,
    groupedTools,
  };
};
