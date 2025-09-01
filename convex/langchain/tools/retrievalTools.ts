"use node";

import { DynamicStructuredTool } from "@langchain/core/tools";
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
  returnString: boolean = false,
) => {
  const vectorSearchTool = new DynamicStructuredTool({
    name: "searchProjectDocuments",
    description:
      "Search through project documents using semantic similarity with multiple queries (1-5). Finds relevant information from uploaded project documents based on meaning rather than exact matches.",
    schema: z.object({
      queries: z
        .array(z.string())
        .min(1)
        .max(5)
        .describe(
          "List of search queries to find relevant documents (1-5 queries)",
        ),
    }),
    func: async ({ queries }: { queries: string[] }) => {
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

      // Perform similarity search for each query in parallel, filtering by selected documents
      const searchPromises = queries.map(async (query) => {
        const results = await vectorStore.similaritySearch(query, 10, {
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

        // Add query metadata to results
        return results.map((doc) => ({
          ...doc,
          metadata: { ...doc.metadata, query },
        }));
      });

      const allResultsArrays = await Promise.all(searchPromises);
      const allResults = allResultsArrays.flat();

      const documentsMap = new Map<Id<"documents">, Doc<"documents">>();
      includedProjectDocuments.forEach((projectDocument) =>
        documentsMap.set(projectDocument.documentId, projectDocument.document!),
      );

      const documents = await Promise.all(
        allResults.map(async (doc) => {
          const projectDocument = documentsMap.get(
            (doc.metadata as any).source,
          );
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
              query: doc.metadata.query,
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
      "Search the web for current information using multiple queries (3-5). Access real-time web content including news, research papers, company information, and technical documentation.",
    schema: z.object({
      queries: z
        .array(z.string())
        .min(3)
        .max(5)
        .describe(
          "List of search queries to find relevant web information (minimum 3 queries)",
        ),
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
          "The topic of the search query to optimize results. By default, performs a general web search. Choose the most relevant topic for better results.",
        )
        .nullable()
        .optional(),
    }),
    func: async ({
      queries,
      topic,
    }: {
      queries: string[];
      topic?: string | null;
    }) => {
      const EXA_API_KEY =
        (
          await config.ctx.runQuery(internal.apiKeys.queries.getFromKey, {
            key: "EXA_API_KEY",
          })
        )?.value ??
        process.env.EXA_API_KEY ??
        "";

      try {
        const exa = new Exa(EXA_API_KEY, undefined);

        // Perform web search for all queries in parallel
        const searchPromises = queries.map(async (query) => {
          const searchResponse = (console.log(query),
          await exa.searchAndContents(query, {
            numResults: 10,
            type: "auto",
            useAutoprompt: false,
            topic: topic,
            text: true,
          })).results;
          console.log(searchResponse.length);

          // Create LangChain Document objects from Exa search results
          return searchResponse.map((result) => {
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
                query: query,
              },
            });
          });
        });

        const allDocumentsArrays = await Promise.all(searchPromises);
        const allDocuments = allDocumentsArrays.flat();

        if (allDocuments.length === 0) {
          return "No results found.";
        }

        if (returnString) {
          return JSON.stringify(allDocuments, null, 0);
        }

        return allDocuments;
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
