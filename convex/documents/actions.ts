"use node";

import { internal } from "../_generated/api";
import { type ActionCtx, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";
import type { Doc } from "../_generated/dataModel";
import { formatDocumentsAsString } from "langchain/util/document";
import { Document } from "langchain/document";
import { ConvexVectorStore } from "@langchain/community/vectorstores/convex";
import { getEmbeddingModel } from "../langchain/models";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export const addDocument = internalAction({
  args: {
    documentId: v.id("documents"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const document = await ctx.runQuery(internal.documents.crud.read, {
      id: args.documentId,
    });
    if (!document) {
      throw new Error("Document not found");
    }

    try {
      // Process documents by type
      let result: string;
      if (document.type === "file") {
        result = await processFiles(ctx, document);
      } else if (document.type === "url") {
        result = await processUrlsOrSites(ctx, document, 0);
      } else if (document.type === "site") {
        result = await processUrlsOrSites(ctx, document, 2);
      } else if (document.type === "youtube") {
        result = await processYoutubeVideo(ctx, document);
      } else {
        if (["text", "github"].includes(document.type)) {
          await ctx.runMutation(internal.documents.crud.update, {
            id: args.documentId,
            patch: {
              status: "done" as const,
            },
          });
          return;
        }
        throw new Error(`Unknown document type: ${document.type}`);
      }

      const processedDoc = new Document({
        pageContent: result,
        metadata: {
          source: document._id,
        },
      });

      // Create embeddings
      const vectorStore = new ConvexVectorStore(
        await getEmbeddingModel(ctx, "embeddings", args.userId),
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

      const chunks = await textSplitter.splitDocuments([processedDoc]);
      // cleanup metadata and set source to documentId
      chunks.forEach((chunk) => {
        chunk.metadata = {
          source: document._id,
        };
      });
      await vectorStore.addDocuments(chunks);

      await ctx.runMutation(internal.documents.crud.update, {
        id: args.documentId,
        patch: {
          status: "done" as const,
        },
      });
    } catch (error) {
      await ctx.runMutation(internal.documents.crud.update, {
        id: args.documentId,
        patch: {
          status: "error" as const,
        },
      });

      throw error;
    }
  },
});

async function processFiles(
  ctx: ActionCtx,
  document: Doc<"documents">,
): Promise<string> {
  return await ctx.runAction(internal.utils.services.index.processFile, {
    document,
  });
}

async function processUrlsOrSites(
  ctx: ActionCtx,
  document: Doc<"documents">,
  depth: number,
): Promise<string> {
  return await ctx.runAction(internal.utils.services.index.processUrlOrSite, {
    url: document.key,
    maxDepth: depth,
    documentId: document._id,
  });
}

async function processYoutubeVideo(
  ctx: ActionCtx,
  document: Doc<"documents">,
): Promise<string> {
  const loader = YoutubeLoader.createFromUrl(document.key, {
    addVideoInfo: true,
    language: "en",
  });
  
  // Run title fetching and content loading in parallel
  const [docs, title] = await Promise.all([
    loader.load(),
    fetchYoutubeTitle(document.key)
  ]);
  
  // Update document name with fetched title
  if (title) {
    await ctx.runMutation(internal.documents.crud.update, {
      id: document._id,
      patch: { 
        name: title
      },
    });
  }
  
  return formatDocumentsAsString(docs);
}

async function fetchYoutubeTitle(url: string): Promise<string | null> {
  try {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/)?.[1];
    if (!videoId) return null;
    
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    if (response.ok) {
      const data = await response.json();
      return data.title || null;
    }
  } catch (error) {
    console.error("Error fetching YouTube video title:", error);
  }
  return null;
}
