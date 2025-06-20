"use node";

import { tool } from "ai";
import { z } from "zod";
import { api, internal } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { models } from "./models";
import { getEmbeddingModel } from "./models";
import {
  embed,
  experimental_createMCPClient
} from "ai";
import { fly } from "../utils/flyio";

export const getRetrievalTools = (ctx: ActionCtx, model: string) => {
  const modelConfig = models.find((m) => m.model_name === model);
  if (!modelConfig) {
    throw new Error(`Model ${model} not found in configuration`);
  }
  const supportedModalities = modelConfig.modalities;

  const vectorSearchTool = tool({
    description:
      "Search through project documents using vector similarity search. Use this to find relevant information from uploaded project documents.",
    parameters: z.object({
      query: z
        .string()
        .describe("The search query to find relevant documents"),
      projectId: z
        .string()
        .describe("The project ID to search within"),
      limit: z
        .number()
        .min(1)
        .max(256)
        .describe("Number of results to return")
        .default(10),
    }),
    execute: async ({ query, projectId, limit }) => {
      const embeddingModel = await getEmbeddingModel(ctx, "embeddings");
      const { embedding } = await embed({
        model: embeddingModel,
        value: query,
      });

      const includedProjectDocuments = await ctx.runQuery(
        internal.projectDocuments.queries.getSelected,
        {
          projectId: projectId as Id<"projects">,
          selected: true,
        },
      );

      if (includedProjectDocuments.length > 0) {
        const vectorResults = await ctx.vectorSearch(
          "documentVectors",
          "byEmbedding",
          {
            vector: embedding,
            limit: limit,
            filter: (q) =>
              q.or(
                ...includedProjectDocuments.map((doc) =>
                  q.eq("documentId", doc.documentId),
                ),
              ),
          },
        );

        const allDocumentVectors = await ctx.runQuery(
          internal.documents.queries.getDocumentVectors,
          { documentVectorIds: vectorResults.map((v) => v._id) },
        );

        const resultText = JSON.stringify(
          allDocumentVectors.map((result) => ({
            ...result,
            document: result.document.name,
          })),
        );

        return [{ type: "text", text: resultText }];
      } else {
        return [{ type: "text", text: "No project documents available." }];
      }
    },
  });

  const webSearchTool = tool({
    description:
      "Search the web for current information using Tavily. Use this to find up-to-date information from the internet.",
    parameters: z.object({
      query: z
        .string()
        .describe("The search query to find relevant web information"),
      topic: z
        .string()
        .describe("The topic of the search query")
        .nullable()
        .optional(),
    }),
    execute: async ({ query, topic }) => {
      const tavilyApiKey = (await ctx.runQuery(
        api.apiKeys.queries.getFromKey,
        { key: "TAVILY_API_KEY" },
      ))?.value ?? process.env.TAVILY_API_KEY;

      if (!tavilyApiKey) {
        return [
          {
            type: "text",
            text: "Tavily API key not configured. Web search is not available.",
          },
        ];
      }

      try {
        const requestBody = {
          query,
          search_depth: "basic",
          include_images: supportedModalities.includes("image"),
          include_answer: false,
          max_results: 5,
          topic,
        };

        const response = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tavilyApiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`Tavily API error: ${response.status}`);
        }

        const searchResults = await response.json();
        const content: Array<{ type: "text" | "image"; text?: string; image?: string }> =
          [];

        if (searchResults.results && searchResults.results.length > 0) {
          content.push({
            type: "text",
            text: JSON.stringify(searchResults.results),
          });
        }

        if (
          supportedModalities.includes("image") &&
          searchResults.images &&
          searchResults.images.length > 0
        ) {
          for (const imageItem of searchResults.images) {
            content.push({
              type: "image",
              image: imageItem,
              // Add provider options if needed
            });
          }
        }

        return content.length > 0 ? content : [{ type: "text", text: "No results found." }];
      } catch (error) {
        return [
          {
            type: "text",
            text: `Web search failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        ];
      }
    },
  });

  return { vectorSearch: vectorSearchTool, webSearch: webSearchTool };
};

export const getMCPClients = async (ctx: ActionCtx, chatId?: Id<"chats">) => {
  const mcps = await ctx.runQuery(api.mcps.queries.getAll, {
    paginationOpts: {
      numItems: 100,
      cursor: null,
    },
    filters: { enabled: true },
  });

  if (mcps.page.length === 0) {
    return { tools: [], groupedTools: {} };
  }

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

  const clients: { id: Id<"mcps">; client: Awaited<ReturnType<typeof experimental_createMCPClient>> }[] = [];

  await Promise.all(mcps.page.map(async (mcp) => {
    const client = await experimental_createMCPClient({
      transport: {
        type: "sse",
        url: mcp.url!,
        headers: mcp.env!
      },
      name: mcp.name,
    })
    clients.push({ id: mcp._id, client });
  }))

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
          if (["file", "image", "github", "text"].includes(document.type)) {
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
    ).filter((file): file is { name: string; url: string } => file !== null);

    await Promise.all(
      mcps.page.map(async (mcp) => {
        if (mcp.type === "stdio" && files.length > 0) {
          await fly.uploadFileToAllMachines(mcp._id, files);
        }
      }),
    );
  }

  return clients;
}