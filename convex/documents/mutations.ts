import { mutation } from "../_generated/server";
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
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: v.union(
      v.literal("file"),
      v.literal("text"),
      v.literal("url"),
      v.literal("site"),
      v.literal("youtube")
    ),
    size: v.number(),
    key: v.union(v.id("_storage"), v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const document = await ctx.db.insert("documents", {
      userId: userId,
      status: "processing",
      ...args,
    });

    return document;
  },
});

export const createMultiple = mutation({
  args: {
    documents: v.array(v.object({
      name: v.string(),
      type: v.union(v.literal("file"), v.literal("text"), v.literal("url"), v.literal("site"), v.literal("youtube")),
      size: v.number(),
      key: v.union(v.id("_storage"), v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const documentIds = await Promise.all(args.documents.map(async (document) => {
      const documentId = await ctx.db.insert("documents", {
        userId: userId,
        status: "processing",
        ...document,
      });

      return documentId;
    }));

    await ctx.scheduler.runAfter(0, internal.documents.actions.addDocuments, {
      documents: documentIds,
    });

    return documentIds;
  },
});

export const updateMultiple = mutation({
  args: {
    documentIds: v.array(v.id("documents")),
    status: v.union(v.literal("processing"), v.literal("done"), v.literal("error")),
  },
  handler: async (ctx, args) => {
    await Promise.all(args.documentIds.map(async (documentId) => {
      await ctx.db.patch(documentId, {
        status: args.status,
      });
    }));
  },
});

export const remove = mutation({
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

    const documentVectors = await ctx.db.query("documentVectors")
      .filter((q) => q.eq(q.field("metadata.source"), args.documentId))
      .collect();

    await Promise.all(documentVectors.map((vector) => ctx.db.delete(vector._id)));

    try {
      await ctx.storage.delete(document.key as Id<"_storage">);
    } catch (error) {
    }

    return true;
  },
});
