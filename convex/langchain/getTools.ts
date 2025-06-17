"use node";

import { TavilySearch } from "@langchain/tavily";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import { tool, type StructuredToolInterface } from "@langchain/core/tools";
import { MultiServerMCPClient, type Connection } from "@langchain/mcp-adapters";
import { z } from "zod";
import { api, internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import type { ToolSchemaBase } from "@langchain/core/tools";
import type { Id } from "../_generated/dataModel";
import { fly } from "../utils/flyio";
import { ConvexVectorStore } from "@langchain/community/vectorstores/convex";
import { getEmbeddingModel } from "./models";
import { Document } from "langchain/document";
import type { TavilySearchResponse } from "@langchain/tavily";
import type { DocumentInterface } from "@langchain/core/documents";

export const getRetrievalTools = (ctx: ActionCtx) => {
  const vectorSearchTool = tool(
    async ({ 
      query, 
      projectId
    }: { 
      query: string; 
      projectId: string;
    }) => {
      const vectorStore = new ConvexVectorStore(getEmbeddingModel("embeddings"), {
        ctx,
        table: "documentVectors",
      });

      const includedProjectDocuments = await ctx.runQuery(
        internal.projectDocuments.queries.getSelected,
        {
          projectId: projectId as Id<"projects">,
          selected: true,
        },
      );

      if (includedProjectDocuments.length === 0) {
        return "No project documents available for retrieval.";
      }

      const results = await vectorStore.similaritySearch(query, 4, {
        filter: (q) =>
          q.or(
            ...includedProjectDocuments.map((document) =>
              q.eq("metadata", {
                source: document.documentId,
              }),
            ),
          ),
      });

      return JSON.stringify(results.map(doc => ({
        content: doc.pageContent,
        metadata: doc.metadata,
      })));
    },
    {
      name: "searchProjectDocuments",
      description: "Search through project documents using vector similarity search. Use this to find relevant information from uploaded project documents.",
      schema: z.object({
        query: z.string().describe("The search query to find relevant documents"),
        projectId: z.string().describe("The project ID to search within"),
      }),
    },
  );

  const webSearchTool = tool(
    async ({ 
      query
    }: { 
      query: string;
    }) => {
      const searchTools = await getSearchTools(ctx);
      let documents: DocumentInterface[] = [];

      if (searchTools.tavily) {
        const searchResults = (await searchTools.tavily._call({
          query: query,
          topic: "general",
          includeImages: false,
          includeDomains: [],
          excludeDomains: [],
          searchDepth: "basic",
        })) as TavilySearchResponse;
        const docs = searchResults.results.map((result) => {
          return new Document({
            pageContent: `${result.score}. ${result.title}\n${result.url}\n${result.content}`,
            metadata: {
              source: "tavily",
            },
          });
        });
        documents.push(...docs);
      } else {
        const searchResults = await searchTools.duckduckgo._call(query);
        const searchResultsArray: {
          title: string;
          url: string;
          snippet: string;
        }[] = JSON.parse(searchResults);
        const urlMarkdownContents = await Promise.all(
          searchResultsArray.map((result) =>
            searchTools.crawlWeb.invoke({ url: result.url }),
          ),
        );
        const docs = searchResultsArray.map((result, index) => {
          return new Document({
            pageContent: `${result.title}\n${result.url}\n${urlMarkdownContents[index]}`,
            metadata: {
              source: "duckduckgo",
            },
          });
        });
        documents.push(...docs);
      }

      return JSON.stringify(documents.map(doc => ({
        content: doc.pageContent,
        metadata: doc.metadata,
      })));
    },
    {
      name: "searchWeb",
      description: "Search the web for current information using Tavily or DuckDuckGo. Use this to find up-to-date information from the internet.",
      schema: z.object({
        query: z.string().describe("The search query to find relevant web information"),
      }),
    },
  );

  return {
    vectorSearch: vectorSearchTool,
    webSearch: webSearchTool,
  };
};

export const getSearchTools = (ctx: ActionCtx) => {
  const tools: {
    tavily?: TavilySearch;
    duckduckgo: DuckDuckGoSearch;
    crawlWeb: StructuredToolInterface;
  } = {
    duckduckgo: new DuckDuckGoSearch({ maxResults: 5 }),
    crawlWeb: tool(
      async ({ url }: { url: string }) => {
        const res = await ctx.runAction(
          internal.utils.services.index.processUrlOrSite,
          {
            url,
            maxDepth: 0,
          },
        );
        return res;
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

export const getMCPTools = async (ctx: ActionCtx, chatId?: Id<"chats">) => {
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
      if (mcp.restartOnNewChat) {
        return ctx.runAction(internal.mcps.actions.restart, { mcpId: mcp._id });
      }
    }),
  );

  // Wait for all mcps to be created
  let currentMcps = mcps.page;
  let maxAttempts = 10;
  while (
    currentMcps.some((mcp) => mcp.status === "creating") &&
    maxAttempts > 0
  ) {
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
    currentMcps.map((mcp) => [
      mcp.name,
      {
        transport: "sse",
        url: mcp.url!,
        headers: mcp.env!,
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

  if (chatId) {
    const chatInput = await ctx.runQuery(api.chatInputs.queries.get, {
      chatId,
    });

    const files: { name: string; url: string }[] = (
      await Promise.all(
        chatInput.documents?.map(async (documentId, index) => {
          const document = await ctx.runQuery(api.documents.queries.get, {
            documentId,
          });
          if (["file"].includes(document.type)) {
            const url = await ctx.storage.getUrl(
              document.key as Id<"_storage">,
            );
            if (url) {
              return {
                name: `${index + 1}_${document.name}`,
                url,
              };
            }
          }
          return null;
        }) ?? [],
      )
    ).filter((file) => file !== null);

    await Promise.all(
      mcps.page.map(async (mcp) => {
        if (mcp.type === "stdio" && files.length > 0) {
          await fly.uploadFileToAllMachines(mcp._id, files);
        }
      }),
    );
  }

  return {
    tools: tools,
    groupedTools,
  };
};
