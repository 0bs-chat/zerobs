"use node";

import { ConvexVectorStore } from "@langchain/community/vectorstores/convex";
import { api, internal } from "../_generated/api";
import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { getEmbeddingModel } from "../langchain/models";

export const add = internalAction({
  args: {
    projectDocumentId: v.id("projectDocuments"),
  },
  handler: async (ctx, args) => {
    const projectDocument = await ctx.runQuery(
      api.projectDocuments.queries.get,
      {
        projectDocumentId: args.projectDocumentId,
      }
    );

    const document = await ctx.runAction(internal.documents.actions.load, {
      documentId: projectDocument.documentId,
      metadata: {
        source: projectDocument._id,
        projectId: projectDocument.projectId,
      },
    });

    const vectorStore = new ConvexVectorStore(getEmbeddingModel("embeddings"), {
      ctx,
    });

    await vectorStore.addDocuments([document]);
  },
});
