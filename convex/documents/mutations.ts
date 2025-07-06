import { internalMutation, mutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { getUrl, requireAuth } from "../utils/helpers";
import { api, internal } from "../_generated/api";
import * as schema from "../schema";
import { partial } from "convex-helpers/validators";
import { paginationOptsValidator } from "convex/server";

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
    });
    const url = await getUrl(ctx, document.key);
    if (!url) {
      throw new Error("Failed to generate download url");
    }

    return url;
  },
});

export const create = mutation({
  args: {
    name: schema.Documents.table.validator.fields.name,
    type: schema.Documents.table.validator.fields.type,
    size: schema.Documents.table.validator.fields.size,
    key: schema.Documents.table.validator.fields.key,
    ...partial(schema.Documents.systemFields),
  },
  handler: async (ctx, args): Promise<Id<"documents">> => {
    const { userId } = await requireAuth(ctx);

    const document = await ctx.runMutation(internal.documents.crud.create, {
      ...args,
      userId,
      status: "processing",
    });

    await ctx.scheduler.runAfter(0, internal.documents.actions.addDocument, {
      documentId: document._id,
    });

    return document._id;
  },
});

export const removeVectorsPaginated = internalMutation({
  args: {
    documentId: v.id("documents"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const vectors = await ctx.db
      .query("documentVectors")
      .filter((q) => q.eq(q.field("metadata"), { source: args.documentId }))
      .order("asc")
      .paginate(args.paginationOpts);

    await Promise.all(vectors.page.map((vector) => ctx.db.delete(vector._id)));

    return {
      isDone: vectors.isDone,
      continueCursor: String(vectors.continueCursor),
    };
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

    let isDone = false;
    let cursor = null;
    while (!isDone) {
      const {
        isDone: isDone2,
        continueCursor,
      }: { isDone: boolean; continueCursor: string } = await ctx.runMutation(
        internal.documents.mutations.removeVectorsPaginated,
        {
          documentId: args.documentId,
          paginationOpts: {
            cursor,
            numItems: 20,
          },
        },
      );
      isDone = isDone2;
      cursor = continueCursor;
    }

    try {
      await ctx.storage.delete(document.key as Id<"_storage">);
    } catch (error) {}

    return true;
  },
});
