"use node";

import { internal } from "../_generated/api";
import { ActionCtx, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";
import runpodSdk from "runpod-sdk";
import type { Doc } from "../_generated/dataModel";
import { formatDocumentsAsString } from "langchain/util/document";
import { Document } from "langchain/document";
import { ConvexVectorStore } from "@langchain/community/vectorstores/convex";
import { getEmbeddingModel } from "../langchain/models";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const runpod = runpodSdk(process.env.RUN_POD_KEY!);
const crawler = runpod.endpoint(process.env.RUN_POD_CRAWLER_ID!);
const docProcessor = runpod.endpoint(process.env.RUN_POD_DOC_PROCESSOR_ID!);

export const addDocuments = internalAction({
  args: {
    documents: v.array(v.id("documents")),
  },
  handler: async (ctx, args) => {
    try {
      const documents = await ctx.runQuery(
        internal.documents.queries.getMultipleInternal,
        {
          documentIds: args.documents,
        },
      );

      // Sort documents by type
      const documentsByType = documents.reduce(
        (acc, document) => {
          acc[document.type] = acc[document.type] || [];
          acc[document.type].push(document);
          return acc;
        },
        {} as Record<string, Doc<"documents">[]>,
      );

      // Process documents by type
      const results = (
        await Promise.all(
          Object.keys(documentsByType).map(async (type) => {
            let texts: string[] = [];
            switch (type) {
              case "file":
                texts = await processFiles(ctx, documentsByType[type]);
                break;
              case "text":
                texts = await processTexts(ctx, documentsByType[type]);
                break;
              case "url":
                texts = await processUrlsOrSites(ctx, documentsByType[type], 0);
                break;
              case "site":
                texts = await processUrlsOrSites(ctx, documentsByType[type], 2);
                break;
              case "youtube":
                texts = await processYoutubeVideos(ctx, documentsByType[type]);
                break;
              default:
                throw new Error(`Unknown document type: ${type}`);
            }

            return texts.map((text, index) => ({
              id: documentsByType[type][index]._id,
              text,
            }));
          }),
        )
      ).flat();

      // Create langchain documents
      const processedDocs = results.map(
        (result) =>
          new Document({
            pageContent: result.text,
            metadata: {
              source: result.id,
            },
          }),
      );

      // Create embeddings
      const vectorStore = new ConvexVectorStore(
        getEmbeddingModel("embeddings"),
        {
          ctx,
          table: "documentVectors",
          index: "byEmbedding",
          textField: "text",
          embeddingField: "embedding",
          metadataField: "metadata",
        },
      );

      const textSplitter = RecursiveCharacterTextSplitter.fromLanguage(
        "markdown",
        {
          chunkSize: 1000,
          chunkOverlap: 200,
        },
      );

      const chunks = await textSplitter.splitDocuments(processedDocs);
      await vectorStore.addDocuments(chunks);

      // Mark documents as successful
      await ctx.runMutation(internal.documents.mutations.updateStatus, {
        documents: args.documents.map((documentId) => ({
          documentId,
          status: "done" as const,
        })),
      });

    } catch (error) {
      console.error("Error processing documents:", error);
      
      // Mark all documents as failed
      await ctx.runMutation(internal.documents.mutations.updateStatus, {
        documents: args.documents.map((documentId) => ({
          documentId,
          status: "error" as const,
        })),
      });
      
      throw error;
    }
  },
});

async function processFiles(
  ctx: ActionCtx,
  documents: Doc<"documents">[],
): Promise<string[]> {
  const fileUrls = await Promise.all(
    documents.map(async (document) => await ctx.storage.getUrl(document.key)),
  );

  const response = await docProcessor?.runSync({
    input: {
      sources: fileUrls,
    },
  });

  return (response?.output.output as { content: string }[]).map((item) => item.content);
}

async function processTexts(
  ctx: ActionCtx,
  documents: Doc<"documents">[],
): Promise<string[]> {
  const blobs = await Promise.all(
    documents.map(async (document) => await ctx.storage.get(document.key)),
  );
  return await Promise.all(
    blobs.map(async (blob) =>
      blob ? await blob.text() : "Failed to load text",
    ),
  );
}

async function processUrlsOrSites(
  ctx: ActionCtx,
  documents: Doc<"documents">[],
  depth: number,
): Promise<string[]> {
  return (
    (
      await crawler?.runSync({
        input: {
          sources: documents.map((document) => ({
            url: document.key,
            max_depth: depth,
          })),
        },
      })
    )?.output.output as { url: string; markdown: string }[][]
  ).map((urls) =>
    urls.map((url) => `### ${url.url}\n${url.markdown}\n`).join("\n"),
  );
}

async function processYoutubeVideos(
  ctx: ActionCtx,
  documents: Doc<"documents">[],
): Promise<string[]> {
  return await Promise.all(
    documents.map(async (document) => {
      const loader = YoutubeLoader.createFromUrl(document.key, {
        addVideoInfo: true,
        language: "en",
      });
      const docs = await loader.load();
      return formatDocumentsAsString(docs);
    }),
  );
}
