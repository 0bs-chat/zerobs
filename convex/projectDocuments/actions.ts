"use node";

import { ConvexVectorStore } from "@langchain/community/vectorstores/convex";
import { api, internal } from "../_generated/api";
import { action } from "../_generated/server";
import { v } from "convex/values";
import { getEmbeddingModel } from "../langchain/models";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { requireAuth } from "../utils/helpers";

export const add = action({
  args: {
    documentId: v.id("documents"),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const document = await ctx.runAction(internal.documents.actions.load, {
      documentId: args.documentId,
      metadata: {
        projectId: args.projectId,
      },
    });

    const projectDocumentId = await ctx.runMutation(api.projectDocuments.mutations.create, {
      projectId: args.projectId,
      documentId: args.documentId,
    });

    if (document.metadata) {
      document.metadata.source = projectDocumentId;
    } else {
      document.metadata = {
        source: projectDocumentId,
        projectId: args.projectId,
      };
    }

    const vectorStore = new ConvexVectorStore(getEmbeddingModel("text-embedding-004"), {
      ctx,
    });

    const textSplitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await textSplitter.splitDocuments([new Document({...document})]);

    await vectorStore.addDocuments(chunks);
  },
});
