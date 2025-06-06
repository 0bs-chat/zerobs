"use node";

import { TavilySearch } from "@langchain/tavily";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import { tool, type StructuredToolInterface } from "@langchain/core/tools";
import { MultiServerMCPClient, type Connection } from "@langchain/mcp-adapters";
import { z } from "zod";
import { api } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { ToolSchemaBase } from "@langchain/core/tools";
import type { Doc } from "../_generated/dataModel";
import runpodSdk from "runpod-sdk";

const runpod = runpodSdk(process.env.RUN_POD_KEY!);
const runpodCrawler = runpod.endpoint(process.env.RUN_POD_CRAWLER_ID!);

export const getSearchTools = () => {
  const tools: {
    tavily?: TavilySearch;
    duckduckgo: DuckDuckGoSearch;
    crawlWeb: StructuredToolInterface;
  } = {
    duckduckgo: new DuckDuckGoSearch({ maxResults: 5 }),
    crawlWeb: tool(
      async ({ url }: { url: string }) => {
        const res = await runpodCrawler?.runSync({
          input: {
            url,
            max_depth: 0,
          },
        });
        return res?.output.output
          .map(
            (d: { url: string; markdown: string }) =>
              `# ${d.url}\n\n${d.markdown}`,
          )
          .join("\n\n");
      },
      {
        name: "crawlWeb",
        description: "Crawl the web and return the markdown",
        schema: z.object({
          url: z.string().describe("The url to crawl"),
        }),
      },
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
  const mcps = await ctx.runQuery(api.mcps.queries.getAll, {
    paginationOpts: {
      numItems: 100,
      cursor: null,
    },
    filters: {
      enabled: true,
    },
  });

  if (mcps.page.length === 0) {
    return {
      tools: [],
      groupedTools: {},
    };
  }

  const mcpServers: Record<string, Connection> = Object.fromEntries(
    mcps.page.map((mcp: Doc<"mcps">) => [
      mcp.name,
      {
        transport: "sse",
        url: mcp.url!,
        headers: mcp.env,
        useNodeEventSource: true,
        reconnect: {
          enabled: true,
          maxAttempts: 4,
          delayMs: 15000,
        },
      },
    ]),
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
