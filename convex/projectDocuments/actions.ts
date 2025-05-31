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
    documentIds: v.array(v.id("documents")),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const projectDocumentIds = await ctx.runMutation(api.projectDocuments.mutations.createMultiple, {
      documentIds: args.documentIds,
      projectId: args.projectId,
    });

    const document = await ctx.runAction(internal.documents.actions.loadDocuments, {
      documentIds: args.documentIds,
      metadata: {
        projectId: args.projectId,
      },
    });

    const vectorStore = new ConvexVectorStore(getEmbeddingModel("text-embedding-004"), {
      ctx,
    });

    const textSplitter = RecursiveCharacterTextSplitter.fromLanguage("markdown", {
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const chunks = await textSplitter.splitDocuments(document.map((doc) => new Document({
      pageContent: doc.pageContent,
      metadata: doc.metadata,
    })));

    await vectorStore.addDocuments(chunks);
  },
});
