import { requireAuth } from "../utils/helpers";
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    documentId: v.id("documents"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const project = await ctx.runQuery(api.projects.queries.get, {
      projectId: args.projectId,
    });
    if (!project) {
      throw new Error("Project not found");
    }

    const document = await ctx.runQuery(api.documents.queries.get, {
      documentId: args.documentId,
    });
    if (!document) {
      throw new Error("Document not found");
    }

    const projectDocumentId = await ctx.db.insert("projectDocuments", {
      projectId: args.projectId,
      documentId: args.documentId,
      selected: true,
      updatedAt: Date.now(),
    });

    await ctx.scheduler.runAfter(0, internal.projectDocuments.funcs.add.add, {
      projectDocumentId: projectDocumentId,
    });

    return projectDocumentId;
  },
});

export const update = mutation({
  args: {
    projectDocumentId: v.id("projectDocuments"),
    update: v.object({
      selected: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const projectDocument = await ctx.runQuery(
      api.projectDocuments.queries.get,
      {
        projectDocumentId: args.projectDocumentId,
      }
    );
    if (!projectDocument) {
      throw new Error("Project document not found");
    }

    await ctx.db.patch(args.projectDocumentId, {
      ...args.update,
      updatedAt: Date.now(),
    });

    return true;
  },
});

export const remove = mutation({
  args: {
    projectDocumentId: v.id("projectDocuments"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const projectDocument = await ctx.runQuery(
      api.projectDocuments.queries.get,
      {
        projectDocumentId: args.projectDocumentId,
      }
    );
    if (!projectDocument) {
      throw new Error("Project document not found");
    }

    // Delete the associated document
    await ctx.runMutation(api.documents.mutations.remove, {
      documentId: projectDocument.document._id,
    });

    // Delete the project document
    await ctx.db.delete(args.projectDocumentId);

    // Delete the associated vectors
    const vectors = await ctx.db
      .query("projectVectors")
      .filter((q) => q.eq(q.field("metadata.source"), args.projectDocumentId))
      .collect();
    await Promise.all(vectors.map((vector) => ctx.db.delete(vector._id)));

    return true;
  },
});

export const toggleSelect = mutation({
  args: {
    projectId: v.id("projects"),
    selected: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const project = await ctx.runQuery(api.projects.queries.get, {
      projectId: args.projectId,
    });
    if (!project) {
      throw new Error("Project not found");
    }

    const projectDocuments = await ctx.db
      .query("projectDocuments")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    await Promise.all(
      projectDocuments.map((projectDocument) =>
        ctx.runMutation(api.projectDocuments.mutations.update, {
          projectDocumentId: projectDocument._id,
          update: { selected: args.selected },
        })
      )
    );

    return true;
  },
});
