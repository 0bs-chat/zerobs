"use node";

import { TavilySearch } from "@langchain/tavily";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import { tool, type StructuredToolInterface } from "@langchain/core/tools";
import { MultiServerMCPClient, type Connection } from "@langchain/mcp-adapters";
import { z } from "zod";
import { api, internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import { ToolSchemaBase } from "@langchain/core/tools";
import type { Doc } from "../_generated/dataModel";
import runpodSdk from "runpod-sdk";

const runpod = runpodSdk(process.env.RUN_POD_KEY!);
const runpodCrawler = runpod.endpoint(process.env.RUN_POD_CRAWLER_ID!);

// Helper function to recursively remove format fields from JSON schema
// Gemini API only supports 'enum' and 'date-time' formats for string types
function removeFormatFields(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(removeFormatFields);
  } else if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip format fields for string types, but keep enum and date-time formats that Gemini supports
      if (key === 'format' && obj.type === 'string') {
        const format = value as string;
        if (format === 'enum' || format === 'date-time') {
          result[key] = value;
        }
        // Skip other format fields like 'uri', 'url', 'email', etc.
      } else {
        result[key] = removeFormatFields(value);
      }
    }
    return result;
  } else {
    return obj;
  }
}

export const getSearchTools = () => {

  const crawlWebTool = tool(
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
  );

  // Remove format fields from crawlWeb tool schema
  if (crawlWebTool.schema && typeof crawlWebTool.schema === 'object') {
    crawlWebTool.schema = removeFormatFields(crawlWebTool.schema);
  }

  const tools: {
    tavily?: TavilySearch;
    duckduckgo: DuckDuckGoSearch;
    crawlWeb: StructuredToolInterface;
  } = {
    duckduckgo: new DuckDuckGoSearch({ maxResults: 5 }),
    crawlWeb: crawlWebTool,
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

  // Reset all mcps that have resetOnNewChat set to true
  await Promise.all(
    mcps.page.map((mcp) => {
      if (mcp.resetOnNewChat) {
        return ctx.runAction(internal.mcps.actions.reset, { mcpId: mcp._id });
      }
    }),
  );

  // Wait for all mcps to be created
  let currentMcps: Doc<"mcps">[] = mcps.page;
  let maxAttempts = 10;
  while (currentMcps.some((mcp) => mcp.status === "creating") && maxAttempts > 0) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const result = await ctx.runQuery(api.mcps.queries.getAll, {
      paginationOpts: {
        numItems: 100,
        cursor: null,
      },
      filters: {
        enabled: true,
      },
    });
    currentMcps = result.page;
    maxAttempts--;
  }

  const mcpServers: Record<string, Connection> = Object.fromEntries(
    currentMcps.map((mcp: Doc<"mcps">) => [
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
  const droppedStrFormatTools = tools.map((tool) => {
    // Create a deep copy of the tool to avoid mutating the original
    const toolCopy = { ...tool };
    
    // If the tool has a schema, process it to remove format fields
    if (toolCopy.schema && typeof toolCopy.schema === 'object') {
      toolCopy.schema = removeFormatFields(toolCopy.schema);
    }
    
    return toolCopy;
  });



  // Group tools by server name
  const groupedTools: Record<
    string,
    StructuredToolInterface<ToolSchemaBase>[]
  > = {};

  for (const tool of droppedStrFormatTools) {
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
    tools: droppedStrFormatTools,
    groupedTools,
  };
};