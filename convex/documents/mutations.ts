import { internalMutation, mutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { api, internal } from "../_generated/api";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const generateDownloadUrl = mutation({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args): Promise<string> => {
    await requireAuth(ctx);

    const document = await ctx.runQuery(api.documents.queries.get, {
      documentId: args.documentId,
    })
    const url = await ctx.storage.getUrl(document.key as Id<"_storage">);
    if (!url) {
      throw new Error("Failed to generate download url");
    }

    return url;
  },
});

export const createMultiple = mutation({
  args: {
    documents: v.array(
      v.object({
        name: v.string(),
        type: v.union(
          v.literal("file"),
          v.literal("url"),
          v.literal("site"),
          v.literal("youtube"),
          v.literal("json")
        ),
        size: v.number(),
        key: v.union(v.id("_storage"), v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const documentIds = await Promise.all(
      args.documents.map(async (document) => {
        const documentId = await ctx.db.insert("documents", {
          userId: userId,
          status: "processing",
          ...document,
        });

        return documentId;
      }),
    );

    await ctx.scheduler.runAfter(0, internal.documents.actions.addDocuments, {
      documents: documentIds,
    });

    return documentIds;
  },
});

export const updateJsonDoc = mutation({
  args: {
    documentId: v.id("documents"),
    update: v.object({
      key: v.id("_storage"),
    }),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const document = await ctx.runQuery(api.documents.queries.get, {
      documentId: args.documentId,
    })

    await ctx.storage.delete(document.key as Id<"_storage">);

    return await ctx.db.patch(args.documentId, {
      key: args.update.key,
    });
  },
});

export const updateStatus = internalMutation({
  args: {
    documents: v.array(v.object({
      documentId: v.id("documents"),
      status: v.union(
        v.literal("processing"),
        v.literal("done"),
        v.literal("error"),
      ),
    })),
  },
  handler: async (ctx, args) => {
    await Promise.all(
      args.documents.map(async (document) => {
        await ctx.db.patch(document.documentId, {
          status: document.status,
        });
      }),
    );
  },
});

export const remove = internalMutation({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const document = await ctx.db
      .query("documents")
      .withIndex("by_id", (q) => q.eq("_id", args.documentId))
      .first();
    if (!document) {
      throw new Error("Document not found");
    }

    if (document.userId !== userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.documentId);

    const documentVectors = await ctx.db
      .query("documentVectors")
      .filter((q) => q.eq(q.field("metadata.source"), args.documentId))
      .collect();

    await Promise.all(
      documentVectors.map((vector) => ctx.db.delete(vector._id)),
    );

    try {
      await ctx.storage.delete(document.key as Id<"_storage">);
    } catch (error) {}

    return true;
  },
});
