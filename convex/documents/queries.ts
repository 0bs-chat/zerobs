import { internalQuery, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAuth } from "../utils/helpers";
import { paginationOptsValidator } from "convex/server";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";

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

export const getDocumentVectors = internalQuery({
  args: {
    documentVectorIds: v.array(v.id("documentVectors")),
  },
  handler: async (ctx, args): Promise<{ text: string; document: Doc<"documents">; url: string }[]> => {
    const vectors = (await Promise.all(
      args.documentVectorIds.map((id) => ctx.db.get(id)),
    ))

    const vectorsWithDocs = await Promise.all(
      vectors
        .filter((v): v is NonNullable<typeof v> => v !== null)
        .map(async (v) => {
          const document = await ctx.db.get(v.documentId);
          if (!document) return null;
          const url = ["file", "text", "github", "image"].includes(document.type) ? await ctx.storage.getUrl(document.key) ?? document.key : document.key;
          return {
            text: v.text,
            document,
            url: url as string,
          }
        })
    );

    const validVectors = vectorsWithDocs.filter((v): v is NonNullable<typeof v> => v !== null);

    return validVectors;
  },
})

export const getAllVectors = internalQuery({
  args: {
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    const vectors = await ctx.db.query("documentVectors").filter((q) => q.eq(q.field("documentId"), args.documentId)).collect();
    return vectors.map((v) => ({
      text: v.text,
      documentId: v.documentId,
    }));
  },
});