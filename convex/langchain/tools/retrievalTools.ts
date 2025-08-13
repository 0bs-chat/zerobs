"use node";

import { tool } from "@langchain/core/tools";
import { dispatchCustomEvent } from "@langchain/core/callbacks/dispatch";
import { ConvexVectorStore } from "@langchain/community/vectorstores/convex";
import { Document } from "@langchain/core/documents";
import { z } from "zod";
import Exa from "exa-js";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import { getEmbeddingModel } from "../models";
import type { GraphState } from "../state";
import type { ExtendedRunnableConfig } from "../helpers";
import { getDocumentUrl } from "../../utils/helpers";

export const getRetrievalTools = async (
  _state: typeof GraphState.State,
  config: ExtendedRunnableConfig,
  returnString: boolean = false
) => {
  const vectorSearchTool = tool(
    async (
      { query, limit = 10 }: { query: string; limit?: number },
      toolConfig: any
    ) => {
      await dispatchCustomEvent(
        "tool_stream",
        { chunk: "Initializing vector store..." },
        toolConfig
      );
      const embeddingModel = await getEmbeddingModel(config.ctx, "embeddings");
      const vectorStore = new ConvexVectorStore(embeddingModel, {
        ctx: config.ctx,
        table: "documentVectors",
      });

      await dispatchCustomEvent(
        "tool_stream",
        { chunk: "Loading selected project documents..." },
        toolConfig
      );
      const includedProjectDocuments = await config.ctx.runQuery(
        internal.projectDocuments.queries.getSelected,
        {
          projectId: config.chat.projectId!,
          selected: true,
        }
      );

      if (includedProjectDocuments.length === 0) {
        const msg = "No project documents available for retrieval.";
        await dispatchCustomEvent(
          "tool_stream",
          { chunk: msg, complete: true },
          toolConfig
        );
        return msg;
      }

      await dispatchCustomEvent(
        "tool_stream",
        { chunk: "Searching vector index..." },
        toolConfig
      );
      const results = await vectorStore.similaritySearch(query, limit, {
        filter: (q) =>
          q.or(
            ...includedProjectDocuments.map((document) =>
              q.eq("metadata", {
                source: document.documentId,
              })
            )
          ),
      });

      await dispatchCustomEvent(
        "tool_stream",
        { chunk: `Found ${results.length} results. Building response...` },
        toolConfig
      );
      const documentsMap = new Map<Id<"documents">, Doc<"documents">>();
      includedProjectDocuments.forEach((projectDocument) => {
        if (projectDocument.document) {
          documentsMap.set(
            projectDocument.documentId,
            projectDocument.document
          );
        }
      });

      const documents = await Promise.all(
        results.map(async (doc) => {
          const projectDocument = documentsMap.get(doc.metadata.source);
          if (!projectDocument) {
            return null;
          }
          const url = await getDocumentUrl(config.ctx, projectDocument.key);

          return new Document({
            pageContent: doc.pageContent,
            metadata: {
              document: projectDocument,
              source: url,
              type: "document",
            },
          });
        })
      );

      await dispatchCustomEvent(
        "tool_stream",
        { chunk: "Formatting final output...", complete: true },
        toolConfig
      );
      return returnString ? JSON.stringify(documents, null, 0) : documents;
    },
    {
      name: "searchProjectDocuments",
      description:
        "Search through project documents using vector similarity search. Use this to find relevant information from uploaded project documents." +
        "You are always supposed to use this tool if you are asked about something specific to find information but no additional information is provided.",
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
    }
  );

  const webSearchTool = tool(
    async (
      { query, topic }: { query: string; topic?: string | null },
      toolConfig: any
    ) => {
      await dispatchCustomEvent(
        "tool_stream",
        { chunk: "Preparing web search..." },
        toolConfig
      );
      const EXA_API_KEY =
        (
          await config.ctx.runQuery(internal.apiKeys.queries.getFromKey, {
            key: "EXA_API_KEY",
          })
        )?.value ??
        process.env.EXA_API_KEY ??
        "";

      try {
        await dispatchCustomEvent(
          "tool_stream",
          { chunk: "Querying Exa..." },
          toolConfig
        );
        const exa = new Exa(EXA_API_KEY, undefined);
        const searchResponse = (
          await exa.searchAndContents(query, {
            numResults: 5,
            type: "auto",
            useAutoprompt: false,
            topic: topic ?? undefined,
            text: true,
          })
        ).results;

        if (searchResponse.length === 0) {
          const msg = "No results found.";
          await dispatchCustomEvent(
            "tool_stream",
            { chunk: msg, complete: true },
            toolConfig
          );
          return msg;
        }

        await dispatchCustomEvent(
          "tool_stream",
          {
            chunk: `Found ${searchResponse.length} results. Formatting...`,
            complete: true,
          },
          toolConfig
        );
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

        return returnString ? JSON.stringify(documents, null, 0) : documents;
      } catch (error) {
        const msg = `Web search failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`;
        await dispatchCustomEvent(
          "tool_stream",
          { chunk: msg, complete: true },
          toolConfig
        );
        return msg;
      }
    },
    {
      name: "searchWeb",
      description:
        "Search the web for current information using Exa (if API key is configured) or DuckDuckGo. Use this to find up-to-date information from the internet.",
      schema: z.object({
        query: z
          .string()
          .describe("The search query to find relevant web information"),
        topic: z
          .union([
            z.literal("company"),
            z.literal("research paper"),
            z.literal("news"),
            z.literal("pdf"),
            z.literal("github"),
            z.literal("personal site"),
            z.literal("linkedin profile"),
            z.literal("financial report"),
          ])
          .describe(
            "The topic of the search query (e.g., 'news', 'finance', ). By default, it will perform a google search." +
              "### SEARCH STRATEGY EXAMPLES:\n" +
              `- Topic: "AI model performance" → Search: "GPT-4 benchmark results 2024", "LLM performance comparison studies", "AI model evaluation metrics research"` +
              `- Topic: "Company financials" → Search: "Tesla Q3 2024 earnings report", "Tesla revenue growth analysis", "electric vehicle market share 2024"` +
              `- Topic: "Technical implementation" → Search: "React Server Components best practices", "Next.js performance optimization techniques", "modern web development patterns"` +
              `### USAGE GUIDELINES:\n` +
              `- Search first, search often, search comprehensively` +
              `- Make 1-3 targeted searches per research topic to get different angles and perspectives` +
              `- Search queries should be specific and focused` +
              `- Follow up initial searches with more targeted queries based on what you learn` +
              `- Cross-reference information by searching for the same topic from different angles` +
              `- Search for contradictory information to get balanced perspectives` +
              `- Include exact metrics, dates, technical terms, and proper nouns in queries` +
              `- Make searches progressively more specific as you gather context` +
              `- Search for recent developments, trends, and updates on topics` +
              `- Always verify information with multiple searches from different sources`
          )
          .nullable()
          .optional(),
      }),
    }
  );

  return {
    vectorSearch: vectorSearchTool,
    webSearch: webSearchTool,
  };
};
