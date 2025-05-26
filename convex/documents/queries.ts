import { query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { paginationOptsValidator } from "convex/server";

export const get = query({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const source = await ctx.db
      .query("documents")
      .withIndex("by_id", (q) => q.eq("_id", args.documentId))
      .first();
    if (!source) {
      throw new Error("Source not found");
    }

    return source;
  },
});

export const getAll = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const documents = await ctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(args.paginationOpts);

    return documents;
  },
});

export const getMultiple = query({
  args: {
    documentIds: v.array(v.id("documents")),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const sources = await Promise.all(
      args.documentIds.map(async (documentId) => {
        const source = await ctx.db
          .query("documents")
          .withIndex("by_id", (q) => q.eq("_id", documentId))
          .first();
        if (!source) {
          throw new Error("Source not found");
        }

        if (source.userId !== userId) {
          throw new Error("Unauthorized");
        }

        return source;
      })
    );

    return sources;
  },
});

export const getByKey = query({
  args: {
    key: v.union(v.id("_storage"), v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const source = await ctx.db
      .query("documents")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (!source) {
      throw new Error("Source not found");
    }

    if (source.userId !== userId) {
      throw new Error("Unauthorized");
    }

    return source;
  },
});
