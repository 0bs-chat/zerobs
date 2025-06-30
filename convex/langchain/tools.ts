"use node";

import { DynamicStructuredTool } from "@langchain/core/tools";
import { ConvexVectorStore } from "@langchain/community/vectorstores/convex";
import { Document } from "@langchain/core/documents";
import { MultiServerMCPClient, type Connection } from "@langchain/mcp-adapters";
import { z } from "zod";
import Exa from "exa-js";
import { api, internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import type { StructuredToolInterface, ToolSchemaBase } from "@langchain/core/tools";
import type { Doc, Id } from "../_generated/dataModel";
import { fly } from "../utils/flyio";
import { getEmbeddingModel } from "./models";
import type { GraphState } from "./state";
import type { ExtendedRunnableConfig } from "./helpers";

export const getRetrievalTools = async (
  _state: typeof GraphState.State,
  config: ExtendedRunnableConfig,
  returnString: boolean = false,
) => {

  const vectorSearchTool = new DynamicStructuredTool({
    name: "searchProjectDocuments",
    description:
      "Search through project documents using vector similarity search. Use this to find relevant information from uploaded project documents.",
    schema: z.object({
      query: z
        .string()
        .describe("The search query to find relevant documents"),
      limit: z
        .number()
        .min(1)
        .max(256)
        .describe("Number of results to return")
        .default(10),
    }),
    func: async ({
      query,
      limit = 10,
    }: {
      query: string;
      limit?: number;
    }) => {
      // Initialize ConvexVectorStore with the embedding model
      const embeddingModel = await getEmbeddingModel(config.ctx, "embeddings");
      const vectorStore = new ConvexVectorStore(embeddingModel, {
        ctx: config.ctx,
        table: "documentVectors",
      });

      // Get selected project documents to filter vector search results
      const includedProjectDocuments = await config.ctx.runQuery(
        internal.projectDocuments.queries.getSelected,
        {
          projectId: config.chat.projectId!,
          selected: true,
        },
      );

      if (includedProjectDocuments.length === 0) {
        return "No project documents available for retrieval.";
      }

      // Perform similarity search, filtering by selected documents
      const results = await vectorStore.similaritySearch(query, limit, {
        filter: (q) =>
          q.or(
            // Assuming documentId is stored in the `source` field of metadata
            ...includedProjectDocuments.map((document) =>
              q.eq("metadata", {
                source: document.documentId,
              }),
            ),
          ),
      });

      const documentsMap = new Map<Id<"documents">, Doc<"documents">>();
      includedProjectDocuments.forEach((projectDocument) =>
        documentsMap.set(projectDocument.documentId, projectDocument.document!),
      );

      const documents = await Promise.all(
        results.map(async (doc) => {
          const projectDocument = documentsMap.get(doc.metadata.source);
          if (!projectDocument) {
            return null;
          }
          const url =
            (await config.ctx.storage.getUrl(
              projectDocument.key as Id<"_storage">,
            )) ?? projectDocument.key;
          return new Document({
            pageContent: doc.pageContent,
            metadata: {
              document: projectDocument,
              source: url,
              type: "document",
            },
          });
        }),
      );

      if (returnString) {
        return JSON.stringify(documents, null, 0);
      }

      return documents;
    },
  });

  const webSearchTool = new DynamicStructuredTool({
    name: "searchWeb",
    description:
      "Search the web for current information using Exa (if API key is configured) or DuckDuckGo. Use this to find up-to-date information from the internet.",
    schema: z.object({
      query: z
        .string()
        .describe("The search query to find relevant web information"),
      topic: z.union([
        z.literal("company"),
        z.literal("research paper"),
        z.literal("news"),
        z.literal("pdf"),
        z.literal("github"),
        z.literal("personal site"),
        z.literal("linkedin profile"),
        z.literal("financial report")
      ])
        .describe("The topic of the search query (e.g., 'news', 'finance').")
        .nullable()
        .optional(),
    }),
    func: async ({ query, topic }: { query: string; topic?: string | null }) => {
      const EXA_API_KEY =
        (await config.ctx.runQuery(api.apiKeys.queries.getFromKey, {
          key: "EXA_API_KEY",
        }))?.value ?? process.env.EXA_API_KEY ?? "";

      try {
        const exa = new Exa(EXA_API_KEY, undefined);
        
        const searchResponse = (await exa.searchAndContents(query, {
          numResults: 5,
          type: "auto",
          useAutoprompt: false,
          topic: topic,
          text: true,
        })).results;

        if (searchResponse.length === 0) {
          return "No results found.";
        }

        // Create LangChain Document objects from Exa search results
        const documents = searchResponse.map((result) => {
          return new Document({
            pageContent: `${result.text}`,
            metadata: {
              type: "search",
              title: result.title,
              source: result.url,
              publishedDate: result.publishedDate,
              author: result.author,
              image: result.image,
              favicon: result.favicon,
            },
          });
        });

        if (returnString) {
          return JSON.stringify(documents, null, 0);
        }

        return documents;
      } catch (error) {
        return `Web search failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
      }
    },
  });
  
  return {
    vectorSearch: vectorSearchTool,
    webSearch: webSearchTool,
  };
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

  // Reset all MCPs that have `restartOnNewChat` set to true
  await Promise.all(
    mcps.page.map((mcp) => {
      if (mcp.restartOnNewChat) {
        return ctx.runAction(internal.mcps.actions.restart, {
          mcpId: mcp._id,
        });
      }
    }),
  );

  // Wait for all MCPs to transition from 'creating' status to 'running'
  let currentMcps = mcps.page;
  let maxAttempts = 10;
  while (
    currentMcps.some((mcp) => mcp.status === "creating") &&
    maxAttempts > 0
  ) {
    await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
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

  // Filter for MCPs that are successfully running and have a URL
  const readyMcps = currentMcps.filter(
    (mcp) => mcp.status === "created" && mcp.url,
  );

  // Construct connection objects for MultiServerMCPClient
  const mcpServers: Record<string, Connection> = Object.fromEntries(
    readyMcps.map((mcp) => [
      mcp.name,
      {
        transport: "sse",
        url: mcp.url!, // url is guaranteed to be present for readyMcps
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

  // Initialize the MultiServerMCPClient
  const client = new MultiServerMCPClient({
    throwOnLoadError: true,
    prefixToolNameWithServerName: true,
    additionalToolNamePrefix: "mcp",
    mcpServers,
  });

  const tools = await client.getTools();

  const groupedTools: Map<string, StructuredToolInterface<ToolSchemaBase>[]> = new Map();

  for (const tool of tools) {
    const parts = tool.name.split("__");
    if (parts.length >= 2) {
      const serverName = parts[1];
      if (!groupedTools.has(serverName)) {
        groupedTools.set(serverName, []);
      }
      groupedTools.get(serverName)?.push(tool);
    }
  }

  if (chatId) {
    const chat = await ctx.runQuery(api.chats.queries.get, {
      chatId,
    });

    const files: { name: string; url: string }[] = (
      await Promise.all(
        chat.documents?.map(async (documentId, index) => {
          const document = await ctx.runQuery(api.documents.queries.get, {
            documentId,
          });
          // Include various document types for upload (file, image, github, text)
          const url = await ctx.storage.getUrl(document.key as Id<"_storage">) ?? document.key;
          return {
            name: `${index + 1}_${document.name}`,
            url,
          };
        }) ?? [],
      )
      // Filter out any null results from documents without URLs
    ).filter((file): file is { name: string; url: string } => file !== null);

    // Upload files to all stdio-type MCPs
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
    groupedTools: groupedTools,
  };
};