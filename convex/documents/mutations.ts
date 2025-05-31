import { mutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";

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
      name: args.name,
      type: args.type,
      size: args.size,
      key: args.key,
    });

    return document;
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
    try {
      await ctx.storage.delete(document.key as Id<"_storage">);
    } catch (error) {
      // pass
    }

    return true;
  },
});
