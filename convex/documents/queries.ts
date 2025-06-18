import { internalQuery, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { paginationOptsValidator } from "convex/server";
import { api } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";

export const get = query({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const source = await ctx.db.get(args.documentId);
    if (!source || source.userId !== userId) {
      throw new Error("Source not found");
    }

    return source;
  },
});

export const getAll = internalQuery({
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
  handler: async (ctx, args): Promise<Doc<"documents">[]> => {
    const docs = await Promise.all(
      args.documentIds.map((id) =>
        ctx.runQuery(api.documents.queries.get, {
          documentId: id,
        }),
      ),
    );

    return docs;
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
      .withIndex("by_key_user", (q) =>
        q.eq("key", args.key).eq("userId", userId),
      )
      .first();
    if (!source) {
      throw new Error("Source not found");
    }

    return source;
  },
});

export const getAllVectors = internalQuery({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const vectors = await ctx.db
      .query("documentVectors")
      .filter((q) => q.eq(q.field("metadata.source"), args.documentId))
      .order("asc")
      .collect();
    return vectors;
  },
});
